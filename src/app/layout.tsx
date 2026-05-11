import type { Metadata, Viewport } from "next";
import { Open_Sans, Ruda } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

const ruda = Ruda({
  subsets: ["latin"],
  variable: "--font-ruda",
  display: "swap",
});

export const metadata: Metadata = {
  title: "S4S Recepcionista IA",
  description:
    "Plataforma SaaS para MEIs brasileiros com IA conversacional 24/7 no WhatsApp e Instagram.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4076BB",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${openSans.variable} ${ruda.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
