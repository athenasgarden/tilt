import { create } from "zustand";

type ClaimDraft = {
  url: string;
  tagline: string;
  bid: number | null;
};

type ClaimState = ClaimDraft & {
  setDraft: (draft: Partial<ClaimDraft>) => void;
  consumeBid: () => number | null;
};

export const useClaimDraft = create<ClaimState>((set, get) => ({
  url: "",
  tagline: "",
  bid: null,
  setDraft: (draft) => set(draft),
  consumeBid: () => {
    const bid = get().bid;
    set({ bid: null });
    return bid;
  },
}));
