import { getSql, type Sql } from "@/lib/db";
import {
  MAX_BID,
  MIN_BID,
  TABLE_SIZE,
  TOP_PREMIUM,
  parseListingInput,
} from "@/lib/listing-url";
import { getStripe } from "@/lib/stripe.server";
import type { BidResult, Listing } from "@/lib/types";

export type ListingRow = {
  id: number;
  url: string;
  handle: string;
  tagline: string;
  bid: number;
  clicks: number;
  created_at: unknown;
  updated_at: unknown;
};

export function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

export function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function toListing(row: ListingRow, rank: number): Listing {
  return {
    id: num(row.id),
    url: row.url,
    handle: row.handle,
    tagline: row.tagline ?? "",
    bid: num(row.bid),
    clicks: num(row.clicks),
    rank,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export async function rankedListings(sql: Sql): Promise<Listing[]> {
  const rows = await sql<ListingRow>`
    select id, url, handle, tagline, bid, clicks, created_at, updated_at
    from listings
    order by bid desc, created_at asc
  `;
  return rows.map((row, index) => toListing(row, index + 1));
}

async function rankOf(sql: Sql, id: number): Promise<number> {
  const rows = await sql<{ rank: number }>`
    select rank from (
      select id, row_number() over (order by bid desc, created_at asc) as rank
      from listings
    ) ranked
    where id = ${id}
  `;
  return num(rows[0]?.rank) || 1;
}

export type Quote = {
  url: string;
  handle: string;
  tagline: string;
  bid: number;
  cost: number;
};

export async function quoteBid(input: {
  url: string;
  tagline: string;
  bid: number;
}): Promise<{ ok: true; quote: Quote } | { ok: false; error: string }> {
  const parsed = parseListingInput(input.url);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const tagline = input.tagline.trim().slice(0, 180);
  const bid = input.bid;
  if (!Number.isInteger(bid) || bid < MIN_BID || bid > MAX_BID) {
    return { ok: false, error: "Bids are whole US dollars, $5 to $999,999." };
  }

  const sql = await getSql();
  const existing = await sql<ListingRow>`
    select id, url, handle, tagline, bid, clicks, created_at, updated_at
    from listings
    where url = ${parsed.url}
    limit 1
  `;
  const current = existing[0];
  const top = await sql<{ id: number; bid: number }>`
    select id, bid from listings
    order by bid desc, created_at asc
    limit 1
  `;
  const topBid = num(top[0]?.bid);
  const topId = top[0] ? num(top[0].id) : null;

  if (current && bid < num(current.bid) + 1) {
    return {
      ok: false,
      error: `Already on the board at $${num(current.bid).toLocaleString("en-US")}. Raise at least $1.`,
    };
  }

  if (!current) {
    const ranked = await sql<{ bid: number }>`
      select bid from listings
      order by bid desc, created_at asc
    `;
    if (ranked.length >= TABLE_SIZE) {
      const floor = num(ranked[TABLE_SIZE - 1]?.bid);
      if (bid <= floor) {
        return {
          ok: false,
          error: `The table only holds 10. Beat #10 at $${floor.toLocaleString("en-US")} — bid $${(floor + 1).toLocaleString("en-US")} or more.`,
        };
      }
    }
  }

  const isCurrentTop = current != null && topId === num(current.id);
  if (!isCurrentTop && topBid > 0 && bid > topBid && bid < topBid + TOP_PREMIUM) {
    return {
      ok: false,
      error: `Taking #1 costs $${(topBid + TOP_PREMIUM).toLocaleString("en-US")}. Bid that, or $${topBid.toLocaleString("en-US")} or less to sit below.`,
    };
  }

  const cost = current ? bid - num(current.bid) : bid;
  if (cost < 1) return { ok: false, error: "Nothing to collect on that bid." };

  return {
    ok: true,
    quote: {
      url: parsed.url,
      handle: parsed.handle,
      tagline,
      bid,
      cost,
    },
  };
}

export async function applyPaidBid(quote: Quote): Promise<BidResult> {
  const sql = await getSql();
  const existing = await sql<ListingRow>`
    select id, url, handle, tagline, bid, clicks, created_at, updated_at
    from listings
    where url = ${quote.url}
    limit 1
  `;
  const current = existing[0];
  const tagline = quote.tagline;

  try {
    if (current) {
      if (quote.bid <= num(current.bid)) {
        const listings = await rankedListings(sql);
        const listing = listings.find((row) => row.id === num(current.id));
        if (!listing) return { ok: false, error: "The cabinet lost that listing. Try again." };
        return { ok: true, listing, previousRank: listing.rank, cost: quote.cost };
      }
      const previousRank = await rankOf(sql, num(current.id));
      const nextTagline = tagline || current.tagline;
      await sql`
        update listings
        set bid = ${quote.bid},
            handle = ${quote.handle},
            tagline = ${nextTagline},
            updated_at = now()
        where id = ${current.id}
      `;
      const rank = await rankOf(sql, num(current.id));
      await sql`
        insert into bid_events (listing_id, handle, url, bid, rank)
        values (${current.id}, ${quote.handle}, ${quote.url}, ${quote.bid}, ${rank})
      `;
      const listings = await rankedListings(sql);
      const listing = listings.find((row) => row.id === num(current.id));
      if (!listing) return { ok: false, error: "The cabinet lost that listing. Try again." };
      return {
        ok: true,
        listing,
        previousRank,
        cost: quote.cost,
      };
    }

    const inserted = await sql<{ id: number }>`
      insert into listings (url, handle, tagline, bid, clicks)
      values (${quote.url}, ${quote.handle}, ${tagline}, ${quote.bid}, 0)
      returning id
    `;
    const id = num(inserted[0]?.id);
    if (!id) return { ok: false, error: "The coin jammed. Try again." };
    const rank = await rankOf(sql, id);
    await sql`
      insert into bid_events (listing_id, handle, url, bid, rank)
      values (${id}, ${quote.handle}, ${quote.url}, ${quote.bid}, ${rank})
    `;
    const listings = await rankedListings(sql);
    const listing = listings.find((row) => row.id === id);
    if (!listing) return { ok: false, error: "The cabinet lost that listing. Try again." };
    return { ok: true, listing, previousRank: null, cost: quote.cost };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/unique|duplicate/i.test(message)) {
      return { ok: false, error: "That URL just landed. Refresh and raise the bid." };
    }
    throw error;
  }
}

export async function fulfillPaidSession(sessionId: string): Promise<BidResult> {
  if (!sessionId || sessionId.length < 8) {
    return { ok: false, error: "Missing checkout session." };
  }

  const sql = await getSql();
  const prior = await sql<{
    status: string;
    listing_id: number | null;
    bid: number;
    amount_cents: number;
    url: string;
  }>`
    select status, listing_id, bid, amount_cents, url
    from payments
    where stripe_session_id = ${sessionId}
    limit 1
  `;

  if (prior[0]?.status === "fulfilled" && prior[0].listing_id) {
    const listings = await rankedListings(sql);
    const listing = listings.find((row) => row.id === num(prior[0].listing_id));
    if (listing) {
      return { ok: true, listing, previousRank: null, cost: Math.round(num(prior[0].amount_cents) / 100) };
    }
  }

  const stripe = await getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return { ok: false, error: "Payment has not cleared yet." };
  }

  const amountCents = session.amount_total ?? 0;
  if (!Number.isInteger(amountCents) || amountCents < 100) {
    return { ok: false, error: "Payment is too small to land a rank." };
  }

  const meta = session.metadata ?? {};
  const parsed = parseListingInput(meta.url ?? "");
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const bid = Number(meta.bid);
  const metaCost = Number(meta.cost);
  if (!Number.isInteger(bid) || bid < MIN_BID || bid > MAX_BID) {
    return { ok: false, error: "Paid bid is not valid." };
  }

  const paidCost = Math.round(amountCents / 100);
  const quote = {
    url: parsed.url,
    handle: parsed.handle,
    tagline: (meta.tagline ?? "").slice(0, 180),
    bid,
    cost: Number.isInteger(metaCost) && metaCost >= 1 ? Math.min(metaCost, paidCost) : paidCost,
  };

  const result = await applyPaidBid(quote);
  if (!result.ok) return result;

  await sql`
    insert into payments (
      stripe_session_id, url, handle, tagline, bid, amount_cents, status, listing_id
    )
    values (
      ${sessionId},
      ${quote.url},
      ${quote.handle},
      ${quote.tagline},
      ${quote.bid},
      ${amountCents},
      'fulfilled',
      ${result.listing.id}
    )
    on conflict (stripe_session_id) do update set
      status = 'fulfilled',
      listing_id = excluded.listing_id,
      amount_cents = excluded.amount_cents
  `;

  return { ...result, cost: paidCost };
}
