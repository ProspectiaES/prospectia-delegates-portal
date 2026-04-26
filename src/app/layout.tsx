import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prospectia Delegates Portal",
  description: "Portal de delegados Prospectia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
