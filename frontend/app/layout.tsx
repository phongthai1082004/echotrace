import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { ToastProvider } from "@/components/toast";
import { I18nProvider } from "./i18n-provider";

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
            <I18nProvider>
              {children}
            </I18nProvider>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}