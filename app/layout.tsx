import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { I18nRoot } from "@/components/i18n-root";
import { QueryProvider } from "@/components/query-provider";
import { SupabaseConnectionLogger } from "@/components/supabase-connection-logger";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  defaultLocale,
  isValidLocale,
  LOCALE_COOKIE,
} from "@/lib/i18n/config";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-family-sans",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-family-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pisto",
    template: "%s — Pisto",
  },
  description: "Personal finance manager",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

async function getInitialLocale() {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return value && isValidLocale(value) ? value : defaultLocale;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLocale = await getInitialLocale();

  return (
    <html
      lang={initialLocale}
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-dvh flex flex-col font-sans"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <I18nRoot initialLocale={initialLocale}>
              <TooltipProvider>
                <SupabaseConnectionLogger />
                {children}
              </TooltipProvider>
            </I18nRoot>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
