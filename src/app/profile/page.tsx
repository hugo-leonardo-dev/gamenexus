import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfilePageClient } from "./ProfilePageClient";
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
    },
  });

  if (!user) {
    redirect("/login");
  }

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

      <ProfilePageClient
        name={user.name}
        email={user.email}
        avatarUrl={user.avatarUrl}
        createdAt={user.createdAt.toISOString()}
      />
    </div>
  );
}
