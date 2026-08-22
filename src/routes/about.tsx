import { createFileRoute } from "@tanstack/react-router";
import { CabinetShell } from "@/components/cabinet-shell";
import { getBoard } from "@/lib/board.functions";
import { formatCount, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/about")({
  loader: () => getBoard(),
  component: AboutPage,
});

function AboutPage() {
  const board = Route.useLoaderData();
  const top = board.listings[0];

  return (
    <CabinetShell stats={board.stats}>
      <article className="vector-frame mx-auto w-full max-w-2xl p-5 sm:p-8">
        <h2 className="font-display text-2xl tracking-hud text-accent uppercase">About</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          TILT is a 10-score arcade cabinet, not an infinite list. No ads, no API keys, no
          revenue share. You pay dollars through Stripe, a site or @handle hits the CRT, and
          it stays there until someone pays more — or until you get tilted off the table.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Every completed checkout is the take, minus Stripe's processing fee. Rank is the
          bid — nothing else.
        </p>

        <h3 className="font-display mt-8 text-xs tracking-hud text-fg uppercase">On this machine</h3>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Visitors" value={formatCount(board.stats.visitors)} />
          <Stat label="Revenue" value={formatMoney(board.stats.revenue)} />
          <Stat
            label="Highest bid"
            value={top ? formatMoney(top.bid) : "-----"}
            hint={top?.handle}
          />
        </dl>

        <p className="mt-8 text-sm leading-relaxed text-muted">
          Connect a live Stripe key in Operator. Charges settle into that Stripe account; you
          pay out to your bank from Stripe. Test keys do not pay you.
        </p>
      </article>
    </CabinetShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="vector-frame px-3 py-3">
      <dt className="font-display text-xs tracking-hud text-muted uppercase">{label}</dt>
      <dd className="font-display marquee-glow mt-1 text-lg tabular-nums">{value}</dd>
      {hint ? <p className="mt-1 truncate text-xs text-dim">{hint}</p> : null}
    </div>
  );
}
