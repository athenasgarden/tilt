import { useState } from "react";
import { Button } from "@/components/ui/button";
import { clicksPerHour, formatCount, formatMoney, formatRank, formatTimeAgo } from "@/lib/format";
import type { BidEvent, Listing } from "@/lib/types";
import { cn } from "@/lib/utils";

type ActivityRailProps = {
  listings: Listing[];
  events: BidEvent[];
  now: number;
};

export function ActivityRail({ listings, events, now }: ActivityRailProps) {
  const [hotOpen, setHotOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);

  const trending = [...listings]
    .map((row) => ({ row, rate: clicksPerHour(row.clicks, row.createdAt, now) }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, hotOpen ? 12 : 5);

  const latest = events.slice(0, liveOpen ? 16 : 5);

  return (
    <div className="grid gap-4">
      <section className="vector-frame p-4">
        <h2 className="font-display text-xs tracking-hud text-accent uppercase">Hot</h2>
        <ul className="mt-3 grid gap-1">
          {trending.length === 0 ? (
            <li className="py-2 text-sm text-dim">No heat yet.</li>
          ) : null}
          {trending.map(({ row, rate }) => (
            <li key={row.id}>
              <a
                href={`/r/${row.id}`}
                className="flex items-baseline gap-2 py-1.5 text-sm hover:text-accent"
              >
                <span className="min-w-0 truncate text-fg">{row.handle}</span>
                <span className="score-dots" aria-hidden="true" />
                <span className="shrink-0 tabular-nums text-muted">
                  {formatCount(Math.round(rate))}/h
                </span>
              </a>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-10 px-0"
          onClick={() => setHotOpen((v) => !v)}
        >
          {hotOpen ? "Show less" : "Show more"}
        </Button>
      </section>

      <section className="vector-frame p-4">
        <h2 className="font-display text-xs tracking-hud text-accent uppercase">Last play</h2>
        <ul className="mt-3 grid gap-1">
          {latest.length === 0 ? (
            <li className="py-2 text-sm text-dim">Waiting on the first paid insert.</li>
          ) : null}
          {latest.map((event) => (
            <li key={event.id}>
              <a
                href={`/r/${event.listingId}`}
                className={cn("block py-1.5 text-sm hover:text-accent")}
              >
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 truncate text-fg">{event.handle}</span>
                  <span className="score-dots" aria-hidden="true" />
                  <span className="shrink-0 tabular-nums text-muted">
                    {formatTimeAgo(event.createdAt, now)}
                  </span>
                </span>
                <span className="text-xs tabular-nums text-dim">
                  {formatRank(event.rank)} · {formatMoney(event.bid)}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-10 px-0"
          onClick={() => setLiveOpen((v) => !v)}
        >
          {liveOpen ? "Show less" : "Show more"}
        </Button>
      </section>
    </div>
  );
}
