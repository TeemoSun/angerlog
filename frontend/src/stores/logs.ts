import { create } from "zustand";

export interface LogFilter {
  intensityMin: number | null;
  intensityMax: number | null;
  category: string | null;
  resolved: "all" | "resolved" | "unresolved";
}

interface LogsState {
  filters: LogFilter;
  setFilter: (patch: Partial<LogFilter>) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: LogFilter = {
  intensityMin: null,
  intensityMax: null,
  category: null,
  resolved: "all",
};

export const useLogsStore = create<LogsState>()((set) => ({
  filters: DEFAULT_FILTERS,
  setFilter: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
