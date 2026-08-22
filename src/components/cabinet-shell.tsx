import { Link, useRouterState } from "@tanstack/react-router";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect } from "react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { pingCabinet } from "@/lib/board.functions";
import { formatCount, formatMoney } from "@/lib/format";
import type { BoardStats } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCabinetPrefs } from "@/lib/wallet";

const NAV = [
  { to: "/", label: "Board" },
  { to: "/rules", label: "Rules" },
  { to: "/about", label: "About" },
] as const;

function sessionKey(): string {
  const key = "insertcoin.session";
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}

type CabinetShellProps = {
  children: React.ReactNode;
  stats?: Pick<
    BoardStats,
    "visitors" | "online" | "revenue" | "stripeMode" | "highestBid" | "paymentsReady"
  >;
};

function padCredit(n: number): string {
  return String(Math.max(0, n)).padStart(2, "0");
}

export function CabinetShell({ children, stats }: CabinetShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const muted = useCabinetPrefs((s) => s.muted);
  const toggleMuted = useCabinetPrefs((s) => s.toggleMuted);
  const credit = stats?.paymentsReady ? 1 : 0;
  const high = stats?.highestBid ?? 0;

  useEffect(() => {
    let cancelled = false;
    const beat = () => {
      pingCabinet({ data: { sessionKey: sessionKey() } }).catch(() => {
        if (!cancelled) toast.error("Cabinet offline. Trying again.");
      });
    };
    beat();
    const id = window.setInterval(beat, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="cabinet-floor text-fg">
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-3 py-3 sm:px-5 sm:py-5">
        <div className="cabinet flex flex-1 flex-col p-2.5 sm:p-3">
          <div className="cabinet-screws" aria-hidden="true" />
          <header className="marquee relative px-4 py-4 text-center sm:px-6 sm:py-5">
            <p className="font-display text-xs tracking-hud text-muted uppercase">
              Operator cabinet
            </p>
            <Link to="/" className="mt-1 block">
              <h1 className="font-display marquee-glow text-3xl tracking-marquee uppercase sm:text-5xl">
                Tilt
              </h1>
            </Link>
            <p className="mt-2 text-xs text-muted sm:text-sm">
              Pay until the board tilts. Rank is the bid.
            </p>
          </header>

          <div className="relative mt-3 grid grid-cols-3 gap-2 px-1 sm:px-2">
            <HudCell label="1UP" value={formatMoney(stats?.revenue ?? 0)} />
            <HudCell
              label="High score"
              value={high > 0 ? formatMoney(high) : "-----"}
              align="center"
            />
            <HudCell
              label={stats?.stripeMode === "test" ? "Credit test" : "Credit"}
              value={padCredit(credit)}
              align="right"
            />
          </div>

          <div className="crt relative mt-3 flex flex-1 flex-col p-2 sm:p-2.5">
            <div className="crt-glass flex flex-1 flex-col">
              <div className="crt-inner flex flex-1 flex-col px-3 py-4 sm:px-5 sm:py-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs tabular-nums text-muted">
                    <span className="text-accent">{formatCount(stats?.online ?? 1)}</span>
                    {" "}online
                    <span className="mx-2 text-dim">/</span>
                    <span className="text-fg">{formatCount(stats?.visitors ?? 0)}</span>
                    {" "}visitors
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={muted ? "Unmute cabinet" : "Mute cabinet"}
                      onClick={toggleMuted}
                    >
                      {muted ? <VolumeX /> : <Volume2 />}
                    </Button>
                  </div>
                </div>
                <main className="flex flex-1 flex-col">{children}</main>
              </div>
            </div>
          </div>

          <div className="relative mt-3 flex flex-col gap-3 px-1 pb-1 sm:flex-row sm:items-center sm:justify-between sm:px-2">
            <nav className="flex flex-wrap items-center gap-1.5" aria-label="Cabinet">
              {NAV.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "control-key",
                      active
                        ? "bg-accent text-accent-fg shadow-[0_0_18px_color-mix(in_oklab,var(--color-accent)_35%,transparent)]"
                        : "text-muted shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-accent)_28%,transparent)] hover:text-accent",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <p className="text-xs text-dim">No ads. No API. Stripe takes their cut.</p>
          </div>
        </div>
      </div>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          className:
            "font-sans bg-surface text-fg border border-border shadow-none rounded-sm",
        }}
      />
    </div>
  );
}

function HudCell({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <div
      className={cn(
        "hud-cell",
        align === "center" && "text-center",
        align === "right" && "text-right",
      )}
    >
      <p className="font-display text-xs tracking-hud text-muted uppercase">{label}</p>
      <p className="font-display marquee-glow mt-1 text-sm tabular-nums tracking-wide sm:text-lg">
        {value}
      </p>
    </div>
  );
}
