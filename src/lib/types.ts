export type Listing = {
  id: number;
  url: string;
  handle: string;
  tagline: string;
  bid: number;
  clicks: number;
  rank: number;
  createdAt: string;
  updatedAt: string;
};

export type BidEvent = {
  id: number;
  listingId: number;
  handle: string;
  url: string;
  bid: number;
  rank: number;
  createdAt: string;
};

export type StripeMode = "live" | "test" | "off";

export type BoardStats = {
  visitors: number;
  online: number;
  revenue: number;
  highestBid: number;
  listingCount: number;
  paymentsReady: boolean;
  stripeMode: StripeMode;
};

export type BoardPayload = {
  listings: Listing[];
  events: BidEvent[];
  stats: BoardStats;
  generatedAt: string;
};

export type BidResult =
  | {
      ok: true;
      listing: Listing;
      previousRank: number | null;
      cost: number;
    }
  | { ok: false; error: string };
