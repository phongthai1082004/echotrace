import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import { ToastProvider } from "@/components/toast";
import { I18nProvider } from "./i18n-provider";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Cabinet Memoir",
  description: "Design bespoke travel journals with editorial-grade layouts.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await cookies().then((c) => c.get("i18nextLng")?.value ?? "en");
  return (
    <html lang="en" className={`h-full antialiased ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <ToastProvider>
            <I18nProvider lang={lang}>{children}</I18nProvider>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
