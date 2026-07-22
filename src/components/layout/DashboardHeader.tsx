"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Extrai o nome da página atual para o breadcrumb
  const pageTitle = (() => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.startsWith("/profile")) return "Perfil";
    if (pathname.startsWith("/group/")) return "Grupo";
    return "GameNexus";
  })();

  return (
    <header className="sticky top-0 z-30 border-b border-retro-border/20 bg-retro-bg/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Page title + breadcrumb */}
        <div className="flex items-center gap-3">
          <span className="font-pixel text-sm tracking-wider text-retro-text">
            {pageTitle}
          </span>
          <span className="hidden sm:inline font-pixel text-[7px] text-retro-text-dim">
            / GameNexus
          </span>
        </div>

        {/* Right: User area */}
        <div className="flex items-center gap-4">
          {/* Notification bell (visual only) */}
          <button
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-retro-text-dim transition-all hover:bg-retro-surface-hover"
            title="Notificações (em breve)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            {/* Notification dot */}
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-retro-primary" />
          </button>

          {/* User avatar + name */}
          {session?.user && (
            <Link
              href="/profile"
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-all hover:bg-retro-surface-hover"
            >
              <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md ring-1 ring-retro-border/50">
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name ?? "Avatar"}
                    width={28}
                    height={28}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-retro-surface text-[10px] text-retro-text-dim">
                    {session.user.name?.charAt(0) ?? "?"}
                  </div>
                )}
              </div>
              <span className="hidden font-pixel text-[9px] text-retro-text md:block">
                {session.user.name}
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
