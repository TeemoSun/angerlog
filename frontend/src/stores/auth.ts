import { create } from "zustand";

interface AuthState {
  csrfToken: string | null;
  timezone: string | null;
  restored: boolean;
  setCsrfToken: (token: string, timezone?: string | null) => void;
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
  restored: false,
  setCsrfToken: (token, timezone) =>
    set({ csrfToken: token, timezone: timezone ?? null, restored: true }),
  clear: () => set({ csrfToken: null, timezone: null, restored: false }),
  onSessionExpired: () => {
    set({ csrfToken: null, timezone: null, restored: false });
    notifyExpired();
  },
}));
