const CHAT_HOSTS = new Set([
  "t.me",
  "telegram.me",
  "telegram.org",
  "web.telegram.org",
  "wa.me",
  "whatsapp.com",
  "www.whatsapp.com",
  "api.whatsapp.com",
  "chat.whatsapp.com",
  "discord.gg",
  "discord.com",
  "www.discord.com",
  "discordapp.com",
  "signal.me",
  "signal.org",
  "www.signal.org",
  "m.me",
  "messenger.com",
  "www.messenger.com",
  "chat.google.com",
  "groups.google.com",
]);

const SHORTENERS = new Set([
  "bit.ly",
  "www.bit.ly",
  "t.co",
  "tinyurl.com",
  "www.tinyurl.com",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "rebrand.ly",
  "shorturl.at",
  "cutt.ly",
  "rb.gy",
  "tiny.cc",
  "lnkd.in",
]);

const NSFW_HINTS = [
  "pornhub",
  "xvideos",
  "onlyfans",
  "xhamster",
  "xnxx",
  "chaturbate",
  "pornhubpremium",
  "redtube",
  "youporn",
  "brazzers",
  "adultfriendfinder",
];

export type ParsedListing =
  | { ok: true; url: string; handle: string }
  | { ok: false; error: string };

function stripWww(host: string): string {
  return host.replace(/^www\./, "");
}

export function parseListingInput(raw: string): ParsedListing {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Enter a site or @handle." };
  if (trimmed.length > 500) return { ok: false, error: "That URL is too long." };

  let candidate = trimmed;

  if (candidate.startsWith("@")) {
    const user = candidate.slice(1).replace(/^https?:\/\/(www\.)?x\.com\//i, "");
    const handle = user.split(/[/?#]/)[0]?.replace(/[^A-Za-z0-9_]/g, "");
    if (!handle || handle.length < 1) return { ok: false, error: "That @handle is not valid." };
    candidate = `https://x.com/${handle}`;
  } else if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, error: "That does not look like a URL or @handle." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http and https listings are allowed." };
  }

  const host = url.hostname.toLowerCase();
  const bare = stripWww(host);

  if (CHAT_HOSTS.has(host) || CHAT_HOSTS.has(bare)) {
    return { ok: false, error: "Chat and invite links are not allowed." };
  }
  if (SHORTENERS.has(host) || SHORTENERS.has(bare)) {
    return { ok: false, error: "Link shorteners are not allowed." };
  }
  const hay = `${bare}${url.pathname}`.toLowerCase();
  if (NSFW_HINTS.some((h) => hay.includes(h))) {
    return { ok: false, error: "Adult links do not belong on this cabinet." };
  }

  url.hash = "";
  url.search = "";
  url.hostname = host;
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  const normalized = url.toString();
  const handle = displayHandle(url);
  return { ok: true, url: normalized, handle };
}

function displayHandle(url: URL): string {
  const bare = stripWww(url.hostname);
  const parts = url.pathname.split("/").filter(Boolean);

  if ((bare === "x.com" || bare === "twitter.com") && parts.length === 1) {
    return `@${parts[0]}`;
  }
  if (parts.length === 0) return bare;
  return `${bare}${url.pathname}`;
}

export const MIN_BID = 5;
export const MAX_BID = 999_999;
export const TOP_PREMIUM = 5;
export const TABLE_SIZE = 10;

export function claimPrice(rank: number, bidAtRank: number | undefined, topBid: number | undefined): number {
  if (rank <= 1) return Math.max((topBid ?? 0) + TOP_PREMIUM, MIN_BID);
  if (bidAtRank == null) return MIN_BID;
  return Math.min(bidAtRank + 1, MAX_BID);
}

export function entryPrice(listings: { bid: number }[]): number {
  const table = listings.slice(0, TABLE_SIZE);
  if (table.length < TABLE_SIZE) return MIN_BID;
  return Math.min(table[TABLE_SIZE - 1].bid + 1, MAX_BID);
}

export function predictedRank(
  listings: { id?: number; bid: number; createdAt: string }[],
  bid: number,
  opts?: { existingId?: number; existingCreatedAt?: string },
): number {
  const createdAt = opts?.existingCreatedAt ?? "9999-12-31T00:00:00.000Z";
  let better = 0;
  for (const row of listings) {
    if (opts?.existingId != null && row.id === opts.existingId) continue;
    if (row.bid > bid || (row.bid === bid && row.createdAt <= createdAt)) better += 1;
  }
  return better + 1;
}
