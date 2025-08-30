"use client";

import { useThemeStore } from "@/src/store/themeStore";
import { useAuthStore } from "@/src/store/authStore";
import * as Switch from "@radix-ui/react-switch";

/**
 * Navbar: shows app title, dark-mode switch and logged-in user.
 * Small responsive tweaks to keep layout intact on mobile.
 */

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Navbar() {
  const { theme, toggle } = useThemeStore();
  const user = useAuthStore((s) => s.user);

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200/60 dark:border-gray-800/60 backdrop-blur bg-white/70 dark:bg-black/40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-2xl bg-indigo-600 text-white grid place-items-center font-bold">JU</div>
          <span className="font-semibold">Jumbo User Dashboard</span>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="text-sm hidden sm:inline">Dark</span>
            <Switch.Root
              checked={theme === "dark"}
              onCheckedChange={toggle}
              className="w-11 h-6 rounded-full bg-gray-300 dark:bg-gray-700 relative data-[state=checked]:bg-indigo-600 outline-none"
            >
              <Switch.Thumb className="block w-5 h-5 rounded-full bg-white translate-x-1 data-[state=checked]:translate-x-5 transition-transform will-change-transform" />
            </Switch.Root>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-indigo-500 text-white grid place-items-center text-sm">
                {initials(user.name)}
              </div>
              <span className="text-sm hidden sm:inline">{user.name}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
