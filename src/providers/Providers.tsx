"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import { useThemeStore } from "@/src/store/themeStore";

/**
 * Providers
 * - Central place for app-wide providers (React Query, theme class toggling).
 * - We use Zustand for theme and persist it; here we apply the `dark` class to document root.
 */
export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  const { theme } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
