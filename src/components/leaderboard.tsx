import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClaimDraft } from "@/lib/claim-store";
import { formatCount, formatMoney, formatRank, formatTimeAgo } from "@/lib/format";
import { TABLE_SIZE, claimPrice, entryPrice } from "@/lib/listing-url";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils";

type LeaderboardProps = {
  listings: Listing[];
  onRefresh: () => void;
  refreshing?: boolean;
  now: number;
};

export function Leaderboard({ listings, onRefresh, refreshing, now }: LeaderboardProps) {
  const setDraft = useClaimDraft((s) => s.setDraft);
  const table = listings.slice(0, TABLE_SIZE);
  const topBid = table[0]?.bid;
  const vacant = TABLE_SIZE - table.length;

  function challenge(listing: Listing) {
    const price = claimPrice(listing.rank, listing.bid, topBid);
    setDraft({ bid: price });
    document.getElementById("claim")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function claimVacant() {
    setDraft({ bid: entryPrice(table) });
    document.getElementById("claim")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="vector-frame p-3 sm:p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display marquee-glow text-sm tracking-hud uppercase">High scores</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>
      <ol className="grid gap-0.5">
        {table.map((listing) => {
          const price = claimPrice(listing.rank, listing.bid, topBid);
          const isTop = listing.rank === 1;
          return (
            <li key={listing.id} className={cn("px-1 py-2", isTop && "rank-pulse rounded-sm px-2")}>
              <div className="flex items-baseline gap-2 font-display text-sm">
                <span
                  className={cn(
                    "w-8 shrink-0 tabular-nums",
                    isTop ? "text-accent" : "text-muted",
                  )}
                >
                  {formatRank(listing.rank)}
                </span>
                <a
                  href={`/r/${listing.id}`}
                  className="min-w-0 max-w-[42%] truncate text-fg hover:text-accent"
                >
                  {listing.handle}
                </a>
                <span className="score-dots" aria-hidden="true" />
                <span className="shrink-0 tabular-nums text-accent">{formatMoney(listing.bid)}</span>
              </div>
              {listing.tagline ? (
                <p className="mt-1 ml-8 line-clamp-2 text-xs text-muted">{listing.tagline}</p>
              ) : null}
              <div className="mt-1 ml-8 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs tabular-nums text-dim">
                  {formatTimeAgo(listing.updatedAt, now)}
                  <span className="mx-1.5">·</span>
                  {formatCount(listing.clicks)} clicks
                </p>
                <button
                  type="button"
                  className="h-10 text-xs tracking-hud text-muted uppercase hover:text-accent"
                  onClick={() => challenge(listing)}
                >
                  Challenge {formatMoney(price)}
                </button>
              </div>
            </li>
          );
        })}
        {Array.from({ length: vacant }, (_, index) => {
          const rank = table.length + index + 1;
          return (
            <li key={`vacant-${rank}`}>
              <button
                type="button"
                className="flex h-11 w-full items-baseline gap-2 px-1 text-left font-display text-sm text-dim hover:text-muted"
                onClick={claimVacant}
              >
                <span className="w-8 shrink-0 tabular-nums">{formatRank(rank)}</span>
                <span className="w-16">---</span>
                <span className="score-dots" aria-hidden="true" />
                <span className="shrink-0 tabular-nums">-----</span>
              </button>
            </li>
          );
        })}
      </ol>
      {table.length === 0 ? (
        <p className="font-display attract-blink mt-4 text-center text-sm tracking-hud text-accent uppercase">
          Insert coin to play
        </p>
      ) : null}
      {table.length >= TABLE_SIZE ? (
        <p className="mt-3 text-center text-xs text-dim">Table full. Beat #10 to get on.</p>
      ) : null}
    </section>
  );
}
