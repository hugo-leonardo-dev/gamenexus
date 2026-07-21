import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ClientMemberManager } from "./ClientMemberManager";
import type { Metadata } from "next";

interface MembersPageProps {
  params: Promise<{ groupId: string }>;
}

export async function generateMetadata({ params }: MembersPageProps): Promise<Metadata> {
  const { groupId } = await params;
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { name: true },
  });
  return {
    title: `Membros - ${group?.name ?? "Grupo"}`,
  };
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { groupId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true, discordId: true },
          },
        },
        orderBy: [
          { role: "asc" },
          { createdAt: "asc" },
        ],
      },
      _count: {
        select: { members: true, games: true },
      },
    },
  });

  if (!group) {
    notFound();
  }

  const currentMember = group.members.find(
    (m) => m.userId === session.user?.id
  );

  if (!currentMember) {
    redirect("/dashboard");
  }

  const isOwner = currentMember.role === "OWNER";

  // Contagem de owners
  const ownerCount = group.members.filter((m) => m.role === "OWNER").length;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/group/${groupId}`}
          className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Voltar para {group.name}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Membros do Grupo
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {group._count.members} membro{group._count.members !== 1 ? "s" : ""}
          {" · "}
          {group._count.games} jogo{group._count.games !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <p className="text-2xl font-bold text-white">{group._count.members}</p>
          <p className="text-xs text-zinc-500">Total</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-400">{group.members.filter(m => m.role === "OWNER").length}</p>
          <p className="text-xs text-zinc-500">Dono{ownerCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <p className="text-2xl font-bold text-zinc-400">{group.members.filter(m => m.role === "MEMBER").length}</p>
          <p className="text-xs text-zinc-500">Membros</p>
        </div>
      </div>

      {/* Client member manager */}
      <ClientMemberManager
        members={group.members}
        groupId={groupId}
        currentUserId={session.user.id ?? ""}
        isOwner={isOwner}
        ownerCount={ownerCount}
      />
    </div>
  );
}
