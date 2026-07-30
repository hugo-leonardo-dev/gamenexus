"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [groupName, setGroupName] = useState<string | null>(null);

  const isGroupPage = pathname.startsWith("/group/");
  const isDashboard = pathname === "/dashboard";
  const isProfile = pathname.startsWith("/profile");

  // Busca o nome do grupo quando estiver em uma página de grupo
  useEffect(() => {
    if (!isGroupPage) {
      setGroupName(null);
      return;
    }

    const groupId = pathname.split("/")[2];
    if (!groupId) return;

    fetch(`/api/groups/${groupId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setGroupName(data?.group?.name ?? null))
      .catch(() => setGroupName(null));
  }, [isGroupPage, pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-retro-border/20 bg-retro-bg/80 backdrop-blur-xl">
      {/* Bottom neon accent */}
      <div className="pointer-events-none absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-retro-primary/20 to-transparent" />

      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Navigation breadcrumb */}
        <div className="flex items-center gap-2 font-pixel text-sm tracking-wider">
          {isDashboard && (
            <span className="text-retro-text">Dashboard</span>
          )}

          {isGroupPage && (
            <>
              <Link
                href="/dashboard"
                className="text-retro-text-dim/70 transition-colors hover:text-retro-primary"
              >
                Grupos
              </Link>
              <span className="text-retro-text-dim/30">▸</span>
              <span className="text-retro-text truncate max-w-[200px]">
                {groupName ?? "..."}
              </span>
            </>
          )}

          {isProfile && (
            <span className="text-retro-text">Perfil</span>
          )}

          {!isDashboard && !isGroupPage && !isProfile && (
            <span className="text-retro-text">GameNexus</span>
          )}
        </div>

        {/* Right: User area */}
        <div className="flex items-center gap-4">
          {/* User avatar + name */}
          {session?.user && (
            <Link
              href="/profile"
              className="group/avatar cyber-chamfer-sm flex items-center gap-2.5 px-2 py-1.5 transition-all hover:bg-retro-surface-hover"
            >
              <div className="relative h-7 w-7 shrink-0 overflow-hidden pixel-border-sm transition-all group-hover/avatar:border-retro-primary/40">
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
              <span className="hidden font-pixel text-[9px] text-retro-text transition-all group-hover/avatar:text-retro-primary group-hover/avatar:cyber-text-glow md:block">
                {session.user.name}
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
