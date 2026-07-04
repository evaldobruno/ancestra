import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Ancestra — a casa digital da sua família",
  description: "Perfis, árvore genealógica, agenda, memórias e conversas — num só espaço privado.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Ancestra", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#111d39",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
