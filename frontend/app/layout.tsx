import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { ToastProvider } from "@/components/toast";

import "./globals.css";

export const metadata: Metadata = {
  title: "Cabinet Memoir",
  description: "Design bespoke travel journals with editorial-grade layouts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}