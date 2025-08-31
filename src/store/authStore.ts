"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LoggedInUser {
  id: number;
  name: string;
  email: string;
}

interface AuthState {
  user: LoggedInUser | null;
  setUser: (u: LoggedInUser) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: { id: 1, name: "Leanne Graham", email: "Sincere@april.biz" },
      setUser: (u) => set({ user: u }),
    }),
    { name: "auth-store" }
  )
);
