import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE } from "@/lib/site";
import { AppInstallPrompt } from "@/components/AppInstallPrompt";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `Join our wedding & event team | ${SITE.name}`, template: `%s | ${SITE.name}` },
  description: `${SITE.name} hires permanent staff for weddings and events. See open positions and apply online.`,
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Rudraksha Events" },
  openGraph: { type: "website", siteName: SITE.name, title: `Join our wedding & event team | ${SITE.name}`, description: "Browse open positions and apply online." },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#09251b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        {children}
        <ServiceWorkerRegister />
        <AppInstallPrompt />
      </body>
    </html>
  );
}
