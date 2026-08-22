import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { CabinetShell } from "@/components/cabinet-shell";
import { Button } from "@/components/ui/button";
import { fulfillCheckout, getBoard } from "@/lib/board.functions";
import { formatMoney, formatRank } from "@/lib/format";
import { TABLE_SIZE } from "@/lib/listing-url";
import { useCabinetPrefs } from "@/lib/wallet";

export const Route = createFileRoute("/pay/success")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  loaderDeps: ({ search }) => ({ sessionId: search.session_id ?? "" }),
  loader: async ({ deps }) => {
    const [board, result] = await Promise.all([
      getBoard(),
      deps.sessionId
        ? fulfillCheckout({ data: { sessionId: deps.sessionId } })
        : Promise.resolve({ ok: false as const, error: "Missing checkout session." }),
    ]);
    return { board, result };
  },
  component: PaySuccessPage,
});

function PaySuccessPage() {
  const { board, result } = Route.useLoaderData();
  const rememberPlayer = useCabinetPrefs((s) => s.rememberPlayer);

  useEffect(() => {
    if (!result.ok) return;
    rememberPlayer({
      url: result.listing.url,
      handle: result.listing.handle,
      rank: result.listing.rank,
    });
  }, [rememberPlayer, result]);

  const madeTable = result.ok && result.listing.rank <= TABLE_SIZE;

  return (
    <CabinetShell stats={board.stats}>
      <article className="vector-frame mx-auto w-full max-w-xl p-5 text-center sm:p-8">
        {result.ok ? (
          <>
            <p className="font-display text-xs tracking-hud text-muted uppercase">Player 1 ready</p>
            <h2 className="font-display marquee-glow attract-blink mt-3 text-3xl tracking-hud uppercase">
              {result.listing.rank === 1 ? "High score" : madeTable ? "On the table" : "Tilted off"}
            </h2>
            <p className="mt-4 text-sm text-muted">
              {madeTable
                ? `${result.listing.handle} holds ${formatRank(result.listing.rank)} at ${formatMoney(result.listing.bid)}.`
                : `${result.listing.handle} paid ${formatMoney(result.listing.bid)} and missed the 10. Continue to beat #10.`}
            </p>
            <p className="mt-2 text-xs tabular-nums text-dim">Charged {formatMoney(result.cost)}</p>
            <Button asChild variant="coin" className="mt-6">
              <Link to="/">Back to the cabinet</Link>
            </Button>
          </>
        ) : (
          <>
            <h2 className="font-display text-2xl tracking-hud text-accent uppercase">Not yet</h2>
            <p className="mt-4 text-sm text-muted">{result.error}</p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/">Back to the cabinet</Link>
            </Button>
          </>
        )}
      </article>
    </CabinetShell>
  );
}
