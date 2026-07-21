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
      <div className="mb-6 animate-float-up">
        <Link
          href={`/group/${groupId}`}
          className="mb-3 inline-flex items-center gap-1 font-pixel text-[8px] text-retro-text-dim transition-colors hover:text-retro-primary"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          ▸ VOLTAR PARA {group.name.toUpperCase()}
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <div className="h-6 w-1 bg-retro-primary" />
          <h1 className="font-pixel text-base tracking-wider text-retro-text">
            MEMBROS DO GRUPO
          </h1>
        </div>
        <p className="mt-1 font-pixel text-[8px] text-retro-text-dim ml-4">
          {group._count.members} MEMBRO{group._count.members !== 1 ? "S" : ""}
          {' ▸ '}
          {group._count.games} JOGO{group._count.games !== 1 ? "S" : ""}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3 animate-float-up" style={{animationDelay: '0.1s'}}>
        <div className="pixel-card p-4 text-center">
          <p className="font-pixel text-xl text-retro-text">{group._count.members}</p>
          <p className="font-pixel text-[7px] text-retro-text-dim mt-1 uppercase">Total</p>
        </div>
        <div className="pixel-card p-4 text-center">
          <p className="font-pixel text-xl text-retro-primary">{group.members.filter(m => m.role === "OWNER").length}</p>
          <p className="font-pixel text-[7px] text-retro-text-dim mt-1 uppercase">Dono{ownerCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="pixel-card p-4 text-center">
          <p className="font-pixel text-xl text-retro-text">{group.members.filter(m => m.role === "MEMBER").length}</p>
          <p className="font-pixel text-[7px] text-retro-text-dim mt-1 uppercase">Membros</p>
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
