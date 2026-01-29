import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Astute - PE Deal Intelligence",
  description: "Advanced Private Equity Deal Sourcing & Intelligence Platform",
};

import { AuthProvider } from "@/components/AuthProvider";
import { LayoutContent } from "@/components/LayoutContent";
import TeamChat from "@/components/TeamChat";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log("ALIVE: RootLayout rendering at " + new Date().toISOString());
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <LayoutContent>
            {children}
            <TeamChat />
          </LayoutContent>
        </AuthProvider>
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            },
          }}
        />
      </body>
    </html>
  );
}
