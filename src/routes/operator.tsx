import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CabinetShell } from "@/components/cabinet-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectStripe, getBoard, getStripeStatus } from "@/lib/board.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/operator")({
  loader: async () => {
    const [board, stripe] = await Promise.all([getBoard(), getStripeStatus()]);
    return { board, stripe };
  },
  component: OperatorPage,
});

function OperatorPage() {
  const initial = Route.useLoaderData();
  const [stripe, setStripe] = useState(initial.stripe);
  const [secretKey, setSecretKey] = useState("");
  const [busy, setBusy] = useState(false);

  async function onConnect() {
    setBusy(true);
    try {
      const result = await connectStripe({ data: { secretKey } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSecretKey("");
      setStripe({
        paymentsReady: true,
        stripeMode: result.stripeMode,
        source: "operator",
      });
      toast.success(
        result.stripeMode === "live"
          ? "Live Stripe connected. Inserts will charge real dollars."
          : "Test Stripe connected. Use card 4242 — charges are not real.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not connect Stripe.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <CabinetShell stats={initial.board.stats}>
      <article className="vector-frame mx-auto w-full max-w-xl p-5 sm:p-8">
        <h2 className="font-display text-2xl tracking-hud text-accent uppercase">Operator</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          This cabinet collects real US dollars through Stripe Checkout. Your secret key
          stays on the server. It is never rendered on the board, never sent back to a
          browser, and never listed next to the high scores. Visitors only see LIVE, TEST,
          or DARK.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Paste <span className="text-fg">sk_live_</span> or{" "}
          <span className="text-fg">sk_test_</span> once, from a private tab, before you
          share the cabinet. After that the form disappears. A later visitor cannot read
          or replace the key from this page.
        </p>

        <div className="mt-6 px-1 py-2">
          <p className="font-display text-xs tracking-hud text-muted uppercase">Status</p>
          <p className="font-display marquee-glow mt-1">
            {stripe.paymentsReady
              ? stripe.stripeMode === "live"
                ? "LIVE — charging real dollars"
                : "TEST — sandbox charges only"
              : "DARK — no Stripe key"}
          </p>
        </div>

        {stripe.paymentsReady ? (
          <p className="mt-6 text-sm text-muted">
            Stripe is connected. New inserts go through Checkout. To switch keys, deploy with a
            new environment secret — this cabinet will not overwrite a live key from the form.
          </p>
        ) : (
          <form
            className="mt-6 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void onConnect();
            }}
          >
            <Label htmlFor="stripe-key">Stripe secret key</Label>
            <Input
              id="stripe-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="sk_live_… or sk_test_…"
              value={secretKey}
              onChange={(event) => setSecretKey(event.target.value)}
            />
            <p className="text-xs text-dim">
              Stripe Dashboard → Developers → API keys → Secret key. That{" "}
              <span className="text-fg">sk_</span> value is private. Do not paste a{" "}
              <span className="text-fg">pk_</span> publishable key — those are meant to be
              public, and they cannot charge anyone. Payout to your bank happens in Stripe,
              not on this page.
            </p>
            <Button type="submit" variant="coin" size="lg" disabled={busy || secretKey.length < 20}>
              {busy ? "Checking…" : "Connect Stripe"}
            </Button>
          </form>
        )}
      </article>
    </CabinetShell>
  );
}
