import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfilePageClient } from "./ProfilePageClient";
import { SteamLinkNotice } from "@/components/profile/SteamLinkNotice";
import { getUserLibraryMeta } from "@/lib/steam-library";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meu Perfil",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
      steamId: true,
      steamName: true,
      steamAvatarUrl: true,
      steamLinkedAt: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  // Meta da biblioteca Steam (contagem + última sync) para o card de contas
  const library = await getUserLibraryMeta(session.user.id!);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 animate-float-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-6 w-1 bg-retro-primary" />
          <h1 className="font-pixel text-lg tracking-wider text-retro-text">
            MEU PERFIL
          </h1>
        </div>
        <p className="font-pixel text-[8px] text-retro-text-dim ml-4">
          ★ GERENCIE SUAS INFORMAÇÕES PESSOAIS
        </p>
      </div>

      {/* Aviso do fluxo de vinculação Steam (?error=steam_link_* / ?success=*) */}
      <Suspense fallback={null}>
        <SteamLinkNotice />
      </Suspense>

      <ProfilePageClient
        name={user.name}
        email={user.email}
        avatarUrl={user.avatarUrl}
        createdAt={user.createdAt.toISOString()}
        steamId={user.steamId}
        steamName={user.steamName}
        steamAvatarUrl={user.steamAvatarUrl}
        steamLinkedAt={user.steamLinkedAt?.toISOString() ?? null}
        libraryOwnedCount={library.ownedCount}
        libraryLastSyncAt={library.lastLibrarySyncAt?.toISOString() ?? null}
      />
    </div>
  );
}
