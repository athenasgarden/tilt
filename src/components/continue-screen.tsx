import { useClaimDraft } from "@/lib/claim-store";
import { formatMoney, formatRank } from "@/lib/format";
import { TABLE_SIZE, claimPrice, entryPrice } from "@/lib/listing-url";
import type { BoardPayload } from "@/lib/types";
import { useCabinetPrefs } from "@/lib/wallet";
import { Button } from "@/components/ui/button";

export function ContinueScreen({ board }: { board: BoardPayload }) {
  const player = useCabinetPrefs((s) => s.player);
  const acceptRank = useCabinetPrefs((s) => s.acceptRank);
  const setDraft = useClaimDraft((s) => s.setDraft);

  if (!player) return null;
  const me = player;

  const table = board.listings.slice(0, TABLE_SIZE);
  const listing = board.listings.find((row) => row.url === me.url);
  const onTable = listing != null && listing.rank <= TABLE_SIZE;
  const dropped = !onTable || listing.rank > me.rank;
  if (!dropped) return null;

  const topBid = table[0]?.bid;
  const targetRank = onTable && listing ? Math.min(me.rank, listing.rank) : 1;
  const target = table[targetRank - 1];
  const price = onTable
    ? claimPrice(targetRank, target?.bid, topBid)
    : entryPrice(table);

  function continuePlay() {
    setDraft({ url: me.url, bid: price });
    document.getElementById("claim")?.scrollIntoView({ behavior: "smooth", block: "start" });
    acceptRank(listing?.rank ?? TABLE_SIZE + 1);
  }

  function letItTilt() {
    acceptRank(listing?.rank ?? TABLE_SIZE + 1);
  }

  return (
    <div className="continue-screen" role="dialog" aria-label="Continue">
      <div className="vector-frame mx-4 w-full max-w-sm p-6 text-center">
        <p className="font-display attract-blink text-3xl tracking-hud text-accent uppercase">
          Continue?
        </p>
        <p className="mt-4 text-sm text-muted">
          {onTable && listing
            ? `${me.handle} dropped to ${formatRank(listing.rank)}.`
            : `${me.handle} tilted off the table.`}
        </p>
        <p className="font-display marquee-glow mt-3 text-xl tabular-nums">{formatMoney(price)}</p>
        <div className="mt-6 grid gap-2">
          <Button type="button" variant="coin" size="lg" className="h-14" onClick={continuePlay}>
            Insert coin
          </Button>
          <Button type="button" variant="ghost" onClick={letItTilt}>
            Let it tilt
          </Button>
        </div>
      </div>
    </div>
  );
}
