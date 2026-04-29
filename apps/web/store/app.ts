import { create } from "zustand";

type AppState = {
  highlightKeyword: string | null;
  setHighlightKeyword: (k: string | null) => void;
  showDiff: boolean;
  setShowDiff: (v: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  highlightKeyword: null,
  setHighlightKeyword: (k) => set({ highlightKeyword: k }),
  showDiff: true,
  setShowDiff: (v) => set({ showDiff: v }),
}));
