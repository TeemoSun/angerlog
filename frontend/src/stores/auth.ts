import { create } from "zustand";

interface AuthState {
  csrfToken: string | null;
  timezone: string | null;
  bottleStyle: string;
  restored: boolean;
  setCsrfToken: (token: string, timezone?: string | null, bottleStyle?: string | null) => void;
  setBottleStyle: (bottleStyle: string) => void;
  clear: () => void;
  onSessionExpired: () => void;
}

export const AUTH_EXPIRED_EVENT = "auth:expired";

function notifyExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  csrfToken: null,
  timezone: null,
  bottleStyle: "C",
  restored: false,
  setCsrfToken: (token, timezone, bottleStyle) =>
    set((state) => ({
      csrfToken: token,
      timezone: timezone ?? null,
      bottleStyle: bottleStyle ?? state.bottleStyle,
      restored: true,
    })),
  setBottleStyle: (bottleStyle) => set({ bottleStyle }),
  clear: () => set({ csrfToken: null, timezone: null, bottleStyle: "C", restored: false }),
  onSessionExpired: () => {
    set({ csrfToken: null, timezone: null, bottleStyle: "C", restored: false });
    notifyExpired();
  },
}));
