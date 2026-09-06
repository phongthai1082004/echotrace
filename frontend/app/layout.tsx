import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
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
  const langs = ["en", "vi", "es"];
  // middleware rewrites /{lang}/... and stamps the lang on the request; cookie covers direct hits
  const raw = (await headers()).get("x-i18n-lang") ?? (await cookies()).get("i18nextLng")?.value;
  const lang = langs.includes(raw ?? "") ? raw! : "en";
  return (
    <html lang={lang} className={`h-full antialiased ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
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
