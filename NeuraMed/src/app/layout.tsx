import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { getLocale, getT } from "@/i18n/server";
import { loadMessages } from "@/i18n/translate";
import { I18nProvider } from "@/i18n/client";

const TITLE = "NeuraMed — Yagona tibbiy platforma";
const DESCRIPTION = "NeuraMed sizga dori, laboratoriya tahlili va rentgen hisobotini oddiy tilda tushuntiradi. Dori eslatmasi va shifokor qabuliga tayyorlov.";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { ...baseMetadata, title: { default: t(TITLE), template: "%s · NeuraMed" }, description: t(DESCRIPTION) };
}

const baseMetadata: Metadata = {
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NeuraMed",
  },
  applicationName: "NeuraMed",
  keywords: ["dori", "tibbiyot", "laboratoriya", "eslatma", "sog'liq", "NeuraMed"],
  authors: [{ name: "NeuraMed" }],
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0F8F84" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getLocale();
  const messages = await loadMessages(locale);
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider locale={locale} messages={messages}>
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
