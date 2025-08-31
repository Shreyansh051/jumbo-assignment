"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Activity = {
  id: string;
  type: "add" | "edit" | "delete";
  message: string;
  at: string; 
};

interface ActivityState {
  logs: Activity[];
  add: (entry: Omit<Activity, "id" | "at"> & { message: string }) => void;
  clear: () => void;
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      logs: [],
      add: ({ type, message }) =>
        set({
          logs: [
            { id: Math.random().toString(36).slice(2), type, message, at: new Date().toISOString() },
            ...get().logs,
          ],
        }),
      clear: () => set({ logs: [] }),
    }),
    { name: "activity-store" }
  )
);
