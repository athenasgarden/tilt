import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import {
  fulfillPaidSession,
  iso,
  num,
  quoteBid,
  rankedListings,
} from "@/lib/board.server";
import {
  createBidCheckout,
  readStripeSecret,
  stripeModeFromKey,
  stripeStatus,
  verifyStripeKey,
} from "@/lib/stripe.server";
import type { BidEvent, BidResult, BoardPayload } from "@/lib/types";
import { MIN_BID, MAX_BID } from "@/lib/listing-url";

export const getBoard = createServerFn({ method: "GET" }).handler(async (): Promise<BoardPayload> => {
  const sql = await getSql();
  const listings = await rankedListings(sql);

  const eventRows = await sql<{
    id: number;
    listing_id: number;
    handle: string;
    url: string;
    bid: number;
    rank: number;
    created_at: unknown;
  }>`
    select id, listing_id, handle, url, bid, rank, created_at
    from bid_events
    order by created_at desc
    limit 24
  `;

  const events: BidEvent[] = eventRows.map((row) => ({
    id: num(row.id),
    listingId: num(row.listing_id),
    handle: row.handle,
    url: row.url,
    bid: num(row.bid),
    rank: num(row.rank),
    createdAt: iso(row.created_at),
  }));

  const agg = await sql<{ listing_count: number; highest: number }>`
    select
      count(*)::int as listing_count,
      coalesce(max(bid), 0)::int as highest
    from listings
  `;
  const take = await sql<{ cents: number }>`
    select coalesce(sum(amount_cents), 0)::int as cents
    from payments
    where status = 'fulfilled'
  `;
  const visitors = await sql<{ v: number }>`select v from site_meta where k = 'visitors'`;
  const online = await sql<{ n: number }>`
    select count(*)::int as n from heartbeats
    where last_seen > now() - interval '3 minutes'
  `;
  const pay = await stripeStatus();

  return {
    listings,
    events,
    generatedAt: new Date().toISOString(),
    stats: {
      visitors: num(visitors[0]?.v),
      online: Math.max(1, num(online[0]?.n)),
      revenue: Math.round(num(take[0]?.cents) / 100),
      highestBid: num(agg[0]?.highest),
      listingCount: num(agg[0]?.listing_count),
      paymentsReady: pay.paymentsReady,
      stripeMode: pay.stripeMode,
    },
  };
});

const PlaceBidInput = z.object({
  url: z.string().min(1).max(500),
  tagline: z.string().max(180),
  bid: z.number().int().min(MIN_BID).max(MAX_BID),
});

export const startCheckout = createServerFn({ method: "POST" })
  .validator((input: unknown) => PlaceBidInput.parse(input))
  .handler(async ({ data }): Promise<{ ok: true; url: string } | { ok: false; error: string }> => {
    const pay = await stripeStatus();
    if (!pay.paymentsReady) {
      return { ok: false, error: "Payments are not connected. Open Operator and paste a Stripe secret key." };
    }
    const quoted = await quoteBid(data);
    if (!quoted.ok) return quoted;
    try {
      const session = await createBidCheckout(quoted.quote);
      return { ok: true, url: session.url };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Stripe rejected the checkout.";
      return { ok: false, error: message };
    }
  });

export const fulfillCheckout = createServerFn({ method: "GET" })
  .validator((input: unknown) =>
    z.object({ sessionId: z.string().min(8).max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<BidResult> => {
    try {
      return await fulfillPaidSession(data.sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not confirm payment.";
      return { ok: false, error: message };
    }
  });

export const getStripeStatus = createServerFn({ method: "GET" }).handler(async () => {
  return stripeStatus();
});

const ConnectInput = z.object({
  secretKey: z.string().min(20).max(255),
});

export const connectStripe = createServerFn({ method: "POST" })
  .validator((input: unknown) => ConnectInput.parse(input))
  .handler(async ({ data }) => {
    if (process.env.STRIPE_SECRET_KEY?.trim()) {
      return { ok: false as const, error: "Stripe is already connected from the environment." };
    }
    const key = data.secretKey.trim();
    if (!/^sk_(live|test)_/.test(key)) {
      return { ok: false as const, error: "That is not a Stripe secret key. It should start with sk_live_ or sk_test_." };
    }
    const existing = await readStripeSecret();
    if (existing) {
      return { ok: false as const, error: "A Stripe key is already connected. The cabinet will not overwrite it." };
    }
    const valid = await verifyStripeKey(key);
    if (!valid) {
      return { ok: false as const, error: "Stripe rejected that key. Check it in the Stripe dashboard." };
    }
    const sql = await getSql();
    await sql`
      insert into operator_settings (k, v)
      values ('stripe_secret_key', ${key})
      on conflict (k) do nothing
    `;
    const stored = await readStripeSecret();
    if (stored !== key) {
      return { ok: false as const, error: "A Stripe key is already connected. The cabinet will not overwrite it." };
    }
    return {
      ok: true as const,
      stripeMode: stripeModeFromKey(key),
    };
  });

const ClickInput = z.object({
  id: z.number().int().positive(),
});

export const recordClick = createServerFn({ method: "POST" })
  .validator((input: unknown) => ClickInput.parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{ url: string }>`
      update listings set clicks = clicks + 1
      where id = ${data.id}
      returning url
    `;
    if (!rows[0]) return { ok: false as const, error: "That listing is gone." };
    return { ok: true as const, url: rows[0].url };
  });

const HeartbeatInput = z.object({
  sessionKey: z.string().min(8).max(80).regex(/^[A-Za-z0-9-]+$/),
});

export const pingCabinet = createServerFn({ method: "POST" })
  .validator((input: unknown) => HeartbeatInput.parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const found = await sql<{ session_key: string }>`
      select session_key from heartbeats where session_key = ${data.sessionKey}
    `;
    if (found[0]) {
      await sql`update heartbeats set last_seen = now() where session_key = ${data.sessionKey}`;
    } else {
      await sql`
        insert into heartbeats (session_key, last_seen)
        values (${data.sessionKey}, now())
        on conflict (session_key) do update set last_seen = now()
      `;
      await sql`update site_meta set v = v + 1 where k = 'visitors'`;
    }
    await sql`delete from heartbeats where last_seen < now() - interval '1 hour'`;
    const visitors = await sql<{ v: number }>`select v from site_meta where k = 'visitors'`;
    const online = await sql<{ n: number }>`
      select count(*)::int as n from heartbeats
      where last_seen > now() - interval '3 minutes'
    `;
    return { visitors: num(visitors[0]?.v), online: Math.max(1, num(online[0]?.n)) };
  });
