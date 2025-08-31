import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/providers/Providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Jumbo User Dashboard",
  description: "User Management Dashboard ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bg-light text-gray-900 dark:bg-bg-dark dark:text-gray-100">
        <Providers>
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
