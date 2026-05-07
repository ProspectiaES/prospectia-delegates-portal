import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Prospectia Delegates Portal",
  description: "Portal de delegados Prospectia",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Prospectia" },
  icons: {
    apple: "/icon-192.png",
    other: [{ rel: "apple-touch-icon", url: "/icon-192.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#8E0E1A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
