import { createFileRoute } from "@tanstack/react-router";
import { CabinetShell } from "@/components/cabinet-shell";
import { getBoard } from "@/lib/board.functions";

export const Route = createFileRoute("/rules")({
  loader: () => getBoard(),
  component: RulesPage,
});

function RulesPage() {
  const board = Route.useLoaderData();

  return (
    <CabinetShell stats={board.stats}>
      <article className="vector-frame mx-auto w-full max-w-2xl p-5 sm:p-8">
        <h2 className="font-display text-2xl tracking-hud text-accent uppercase">Rules</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          TILT is a 10-score cabinet, not a directory. There are no ads, no API keys, and no
          revenue share. You pay US dollars to put your name on the CRT. Rank is the bid.
        </p>

        <h3 className="font-display mt-8 text-xs tracking-hud text-fg uppercase">How ranking works</h3>
        <ul className="mt-3 grid gap-3 text-sm leading-relaxed text-muted">
          <li>
            The CRT holds 10 names, like a real high-score table. Empty rows stay blank until
            someone pays. When the table is full, a new listing has to beat #10. Pay less than
            that and the coin comes back — you never land off-screen.
          </li>
          <li>
            New listings are whole US dollars, $5 minimum, $999,999 maximum, $1 at a time. Bids
            already on the board keep their amount until they raise or get outranked.
          </li>
          <li>
            Taking #1 costs at least $5 more than the current top bid. Paying less still puts you
            on the table at whatever rank that bid can take — if a row is open, or if you beat
            #10. Equal bids stay in the order they were placed — the older bid keeps the higher rank.
          </li>
          <li>
            Get knocked down or tilted off and this cabinet flashes CONTINUE? Pay the difference
            to climb back. Let it tilt and your name sits where it landed.
          </li>
          <li>
            Enter the same website or @handle again to raise that listing. The new bid must be at
            least $1 above the current bid; you only pay the difference.
          </li>
          <li>
            App Store, Play Store, GitHub, and similar platform links are keyed by their path, so
            different apps do not share a bid. Tracking query strings are ignored.
          </li>
        </ul>

        <h3 className="font-display mt-8 text-xs tracking-hud text-fg uppercase">What you can list</h3>
        <ul className="mt-3 grid gap-3 text-sm leading-relaxed text-muted">
          <li>A product website, or an X @handle.</li>
          <li>
            Chat and invite links are not allowed — Telegram, WhatsApp, Discord, Messenger,
            Signal, and similar. The board is for products and profiles, not group chats.
          </li>
          <li>
            Links to sexual content are not allowed. If it is porn, NSFW, or an adult platform, it
            does not belong on the board.
          </li>
          <li>
            Query parameters are stripped from listing links. Affiliate, referral, and tracking
            URLs will not work.
          </li>
          <li>Link shortener URLs are not allowed.</li>
        </ul>

        <h3 className="font-display mt-8 text-xs tracking-hud text-fg uppercase">After you pay</h3>
        <ul className="mt-3 grid gap-3 text-sm leading-relaxed text-muted">
          <li>Your listing is public. Clicks go to the URL or profile you submitted, without query parameters.</li>
          <li>
            A completed Stripe payment is what claims the rank. Money settles to the connected
            Stripe account, minus Stripe's processing fee. If you get outbid later, the
            charge stays.
          </li>
        </ul>
      </article>
    </CabinetShell>
  );
}
