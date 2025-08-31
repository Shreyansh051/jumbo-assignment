"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import { useThemeStore } from "@/store/themeStore";


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
