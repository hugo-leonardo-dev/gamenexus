import type { Metadata } from "next";
import { Press_Start_2P, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/ui/SessionProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { AppShell } from "@/components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | GameNexus",
    default: "GameNexus - Gerencie seus jogos com amigos",
  },
  description:
    "Aplicação colaborativa para grupos de amigos gerenciarem seus jogos.",
  keywords: ["jogos", "gamenextus", "steam", "grupo", "amigos", "cooperativo", "backlog", "jogos cooperativos"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${pressStart2P.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-retro-bg font-sans text-retro-text">
        <SessionProvider>
          <ToastProvider>
            {/* Scanline overlay */}
            <div className="fixed inset-0 pointer-events-none z-[9999] scanline-overlay" />
            {/* CRT glow */}
            <div className="fixed inset-0 pointer-events-none z-[9998] crt-glow opacity-20" />
            {/* Vignette */}
            <div className="fixed inset-0 pointer-events-none z-[9997] vignette-overlay" />
            <AppShell>
              {children}
            </AppShell>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
