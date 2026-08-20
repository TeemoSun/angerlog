import { create } from "zustand";

interface AuthState {
  csrfToken: string | null;
  restored: boolean;
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
  restored: false,
  setCsrfToken: (token) => set({ csrfToken: token, restored: true }),
  clear: () => set({ csrfToken: null, restored: false }),
  onSessionExpired: () => {
    set({ csrfToken: null, restored: false });
    notifyExpired();
  },
}));
