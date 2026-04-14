import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/AuthProvider";
import { ContentStateProvider } from "@/components/ContentStateProvider";
import { ScraperProvider } from "@/components/ScraperProvider";
import { LayoutContent } from "@/components/LayoutContent";

export const metadata: Metadata = {
  title: "Astute - PE Deal Intelligence",
  description: "Advanced Private Equity Deal Sourcing & Intelligence Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <ScraperProvider>
            <ContentStateProvider>
              <LayoutContent>
                {children}
              </LayoutContent>
            </ContentStateProvider>
          </ScraperProvider>
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
