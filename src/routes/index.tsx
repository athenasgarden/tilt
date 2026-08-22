import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ActivityRail } from "@/components/activity-rail";
import { CabinetShell } from "@/components/cabinet-shell";
import { ClaimPanel } from "@/components/claim-panel";
import { ContinueScreen } from "@/components/continue-screen";
import { Leaderboard } from "@/components/leaderboard";
import { getBoard } from "@/lib/board.functions";
import type { BoardPayload } from "@/lib/types";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { canceled?: boolean } => {
    if (search.canceled === "1" || search.canceled === true) return { canceled: true };
    return {};
  },
  loader: () => getBoard(),
  component: Home,
});

function Home() {
  const initial = Route.useLoaderData();
  const { canceled } = Route.useSearch();
  const [board, setBoard] = useState<BoardPayload>(initial);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setBoard(initial);
  }, [initial]);

  useEffect(() => {
    if (canceled) toast.message("Checkout canceled. No charge.");
  }, [canceled]);

  async function refresh() {
    setRefreshing(true);
    try {
      setBoard(await getBoard());
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const id = window.setInterval(() => {
      void getBoard().then(setBoard);
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <CabinetShell stats={board.stats}>
      <ContinueScreen board={board} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start">
        <div className="order-2 lg:order-1 lg:row-span-2">
          <Leaderboard
            listings={board.listings}
            onRefresh={() => void refresh()}
            refreshing={refreshing}
            now={Date.parse(board.generatedAt)}
          />
        </div>
        <div className="order-1 lg:order-2">
          <ClaimPanel board={board} />
        </div>
        <div className="order-3">
          <ActivityRail listings={board.listings} events={board.events} now={Date.parse(board.generatedAt)} />
        </div>
      </div>
    </CabinetShell>
  );
}
