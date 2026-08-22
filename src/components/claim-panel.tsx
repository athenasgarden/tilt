import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startCheckout } from "@/lib/board.functions";
import { useClaimDraft } from "@/lib/claim-store";
import { formatMoney, formatRank } from "@/lib/format";
import {
  MAX_BID,
  MIN_BID,
  TABLE_SIZE,
  claimPrice,
  parseListingInput,
  predictedRank,
} from "@/lib/listing-url";
import { playError } from "@/lib/sound";
import type { BoardPayload } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCabinetPrefs } from "@/lib/wallet";

type ClaimPanelProps = {
  board: BoardPayload;
};

export function ClaimPanel({ board }: ClaimPanelProps) {
  const top = board.listings[0];
  const defaultBid = claimPrice(1, top?.bid, top?.bid);
  const draftUrl = useClaimDraft((s) => s.url);
  const draftTagline = useClaimDraft((s) => s.tagline);
  const pendingBid = useClaimDraft((s) => s.bid);
  const setDraft = useClaimDraft((s) => s.setDraft);
  const [url, setUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [bid, setBid] = useState(defaultBid);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const muted = useCabinetPrefs((s) => s.muted);
  const ready = board.stats.paymentsReady;

  useEffect(() => {
    if (draftUrl) setUrl(draftUrl);
  }, [draftUrl]);

  useEffect(() => {
    if (draftTagline) setTagline(draftTagline);
  }, [draftTagline]);

  useEffect(() => {
    if (pendingBid == null) return;
    setBid(pendingBid);
    setDraft({ bid: null });
  }, [pendingBid, setDraft]);

  const parsed = useMemo(() => parseListingInput(url), [url]);
  const existing = parsed.ok
    ? board.listings.find((row) => row.url === parsed.url)
    : undefined;

  const rank = useMemo(() => {
    if (!Number.isFinite(bid)) return board.listings.length + 1;
    return predictedRank(board.listings, bid, {
      existingId: existing?.id,
      existingCreatedAt: existing?.createdAt,
    });
  }, [board.listings, bid, existing]);

  const cost = existing ? Math.max(0, bid - existing.bid) : bid;

  function nudge(delta: number) {
    setBid((current) => Math.min(MAX_BID, Math.max(MIN_BID, current + delta)));
  }

  async function onInsert() {
    if (!parsed.ok) {
      fail(parsed.error);
      return;
    }
    if (!ready) {
      fail("Payments are not connected. Open Operator and paste a Stripe secret key.");
      return;
    }
    setBusy(true);
    try {
      const result = await startCheckout({
        data: { url: parsed.url, tagline, bid },
      });
      if (!result.ok) {
        fail(result.error);
        return;
      }
      window.location.assign(result.url);
    } catch (error) {
      fail(error instanceof Error ? error.message : "The coin jammed.");
    } finally {
      setBusy(false);
    }
  }

  function fail(message: string) {
    setShake(true);
    window.setTimeout(() => setShake(false), 280);
    if (!muted) playError();
    toast.error(message);
  }

  return (
    <section
      id="claim"
      className={cn(
        "vector-frame relative overflow-hidden p-4 sm:p-5",
        shake && "animate-[shake_180ms_ease-in-out]",
      )}
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-xs tracking-hud text-muted uppercase">Coin door</p>
          <p className="font-display marquee-glow mt-1 text-xl tabular-nums">
            {formatMoney(defaultBid)}
          </p>
        </div>
        <p className="text-right text-xs text-muted">
          {formatMoney(MIN_BID)} min. 10 names on the CRT. Less than #1 still
          lands a rank.
        </p>
      </div>

      <div className="coin-slot mt-4" aria-hidden="true" />

      {!ready ? (
        <p className="mt-4 text-sm text-muted">
          Cabinet dark.{" "}
          <Link to="/operator" className="text-accent underline decoration-border underline-offset-4">
            Open Operator
          </Link>
        </p>
      ) : board.stats.stripeMode === "test" ? (
        <p className="mt-4 text-xs text-muted">Test mode. Charges will not settle real money.</p>
      ) : null}

      <div className="mt-4 grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="listing-url">Site or @handle</Label>
          <Input
            id="listing-url"
            value={url}
            autoComplete="off"
            spellCheck={false}
            placeholder="yoursite.com or @handle"
            onChange={(event) => setUrl(event.target.value)}
          />
          {existing ? (
            <p className="text-xs text-accent">
              On the list at {formatRank(existing.rank)} · {formatMoney(existing.bid)}. Raise to climb.
            </p>
          ) : parsed.ok ? (
            <p className="text-xs text-muted">Will list as {parsed.handle}</p>
          ) : url.trim() ? (
            <p className="text-xs text-danger">{parsed.error}</p>
          ) : (
            <p className="text-xs text-dim">Already listed? Same URL, higher bid.</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="listing-tagline">Attract mode line</Label>
          <Input
            id="listing-tagline"
            value={tagline}
            maxLength={180}
            placeholder="One sentence. What is this?"
            onChange={(event) => setTagline(event.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="listing-bid">Dollars to insert</Label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" onClick={() => nudge(-1)} aria-label="Decrease bid">
              <Minus />
            </Button>
            <Input
              id="listing-bid"
              className="font-display text-center tabular-nums tracking-wide"
              inputMode="numeric"
              value={bid}
              onChange={(event) => {
                const next = Number(event.target.value.replace(/[^\d]/g, ""));
                if (!Number.isFinite(next)) return;
                setBid(Math.min(MAX_BID, Math.max(0, next)));
              }}
              onBlur={() => setBid((current) => Math.min(MAX_BID, Math.max(MIN_BID, current)))}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => nudge(1)} aria-label="Increase bid">
              <Plus />
            </Button>
          </div>
          <p className="text-xs tabular-nums text-muted">
            {rank > TABLE_SIZE ? (
              <>
                Misses the table
                <span className="text-dim"> · </span>
                beat #10 or the coin comes back
              </>
            ) : (
              <>
                Lands <span className="text-accent">{formatRank(rank)}</span>
                <span className="text-dim"> · </span>
                pay <span className="text-fg">{formatMoney(cost)}</span>
              </>
            )}
          </p>
        </div>

        {ready ? (
          <Button
            type="button"
            variant="coin"
            size="lg"
            className="h-14 w-full"
            disabled={busy}
            onClick={() => void onInsert()}
          >
            {busy ? "Opening checkout…" : "Insert coin"}
          </Button>
        ) : (
          <Button asChild variant="coin" size="lg" className="h-14 w-full">
            <Link to="/operator">Connect Stripe</Link>
          </Button>
        )}
        <p className="text-xs text-dim">
          {ready
            ? "Stripe Checkout. Rank after the charge clears. No refunds if you get outbid."
            : "Live Stripe key in Operator. Every completed checkout is the take."}
        </p>
      </div>
    </section>
  );
}
