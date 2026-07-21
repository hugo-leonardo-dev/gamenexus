import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/ui/SessionProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { Navbar } from "@/components/layout/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Backlog",
    default: "Backlog - Gerencie seus jogos com amigos",
  },
  description:
    "Aplicação colaborativa para grupos de amigos gerenciarem backlogs de jogos.",
  keywords: ["jogos", "backlog", "steam", "grupo", "amigos", "cooperativo"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-950 font-sans text-zinc-100">
        <SessionProvider>
          <ToastProvider>
            <Navbar />
            <main className="flex min-h-[calc(100vh-4rem)] flex-col">
              {children}
            </main>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
