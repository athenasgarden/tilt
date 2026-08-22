import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CabinetPlayer = {
  url: string;
  handle: string;
  rank: number;
};

type CabinetPrefs = {
  muted: boolean;
  toggleMuted: () => void;
  player: CabinetPlayer | null;
  rememberPlayer: (player: CabinetPlayer) => void;
  acceptRank: (rank: number) => void;
  clearPlayer: () => void;
};

export const useCabinetPrefs = create<CabinetPrefs>()(
  persist(
    (set, get) => ({
      muted: true,
      player: null,
      toggleMuted: () => set({ muted: !get().muted }),
      rememberPlayer: (player) => set({ player }),
      acceptRank: (rank) => {
        const player = get().player;
        if (!player) return;
        set({ player: { ...player, rank } });
      },
      clearPlayer: () => set({ player: null }),
    }),
    { name: "tilt-cabinet" },
  ),
);
