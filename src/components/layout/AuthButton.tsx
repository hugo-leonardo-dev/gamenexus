"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="h-8 w-20 animate-pulse rounded-lg bg-zinc-800" />
    );
  }

  if (session?.user) {
    return (
      <div className="relative flex items-center gap-3">
        <Link
          href="/profile"
          className="hidden font-pixel text-[9px] text-retro-text-dim transition-colors hover:text-retro-primary sm:block uppercase tracking-wider"
        >
          Perfil
        </Link>
        <Link
          href="/dashboard"
          className="hidden font-pixel text-[9px] text-retro-text-dim transition-colors hover:text-retro-primary sm:block uppercase tracking-wider"
        >
          Dashboard
        </Link>
        <Link
          href="/profile"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          title="Meu Perfil"
        >
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "Avatar"}
              width={28}
              height={28}
              className="ring-2 ring-retro-border pixel-border-sm"
              style={{borderRadius: 0}}
            />
          )}
          <span className="hidden text-sm font-medium text-retro-text md:block">
            {session.user.name}
          </span>
        </Link>
        <button
          onClick={() => signOut()}
          className="pixel-btn bg-retro-red px-3 py-1.5 text-[9px] text-white"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("discord", { redirectTo: "/" })}
      className="pixel-btn flex items-center gap-2 bg-retro-primary px-4 py-2 text-[9px] text-white animate-glow-pulse"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
      <span className="hidden sm:inline">Entrar</span>
    </button>
  );
}
