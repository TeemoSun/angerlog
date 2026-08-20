import { create } from "zustand";

interface AuthState {
  csrfToken: string | null;
  setCsrfToken: (token: string) => void;
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
  setCsrfToken: (token) => set({ csrfToken: token }),
  clear: () => set({ csrfToken: null }),
  onSessionExpired: () => {
    set({ csrfToken: null });
    notifyExpired();
  },
}));
