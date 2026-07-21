import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { KanbanBoard } from "@/components/game/KanbanBoard";
import { AddGameForm } from "@/components/group/AddGameForm";
import { CopyInviteButton } from "./CopyInviteButton";
import { MemberList } from "@/components/group/MemberList";
import type { Metadata } from "next";

interface GroupPageProps {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const { groupId } = await params;
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { name: true },
  });
  return {
    title: group?.name ?? "Grupo",
  };
}

function getGameOrderBy(sort: string): Record<string, unknown> {
  switch (sort) {
    case "review_desc":
      return { reviewScore: { sort: "desc", nulls: "last" as const } };
    case "review_asc":
      return { reviewScore: { sort: "asc", nulls: "last" as const } };
    case "name_asc":
      return { title: "asc" };
    case "name_desc":
      return { title: "desc" };
    case "price_asc":
      return { currentPrice: { sort: "asc", nulls: "last" as const } };
    default:
      return { position: "asc" };
  }
}

export default async function GroupPage({ params, searchParams }: GroupPageProps) {
  const { groupId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const sortParam = (await searchParams).sort ?? "position";

  // Busca o grupo + verifica membership em uma query só com includes otimizados
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      games: {
        orderBy: getGameOrderBy(sortParam),
        include: {
          addedBy: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      },
      _count: {
        select: { games: true, members: true },
      },
    },
  });

  if (!group) {
    notFound();
  }

  // Verifica se o usuário é membro
  const currentMember = group.members.find(
    (m) => m.userId === session.user?.id
  );

  if (!currentMember) {
    redirect("/dashboard");
  }

  const isOwner = currentMember.role === "OWNER";

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header do Grupo */}
      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="truncate text-xl font-bold text-white sm:text-2xl">
                {group.name}
              </h1>
              {isOwner && (
                <span className="shrink-0 rounded-md bg-indigo-600/20 px-2 py-0.5 text-xs font-medium text-indigo-400">
                  Dono
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              {group._count.members} membro
              {group._count.members !== 1 ? "s" : ""}
              {" · "}
              {group._count.games} jogo
              {group._count.games !== 1 ? "s" : ""}
            </p>
          </div>

          <CopyInviteButton inviteCode={group.inviteCode} />
        </div>

        <MemberList
          members={group.members}
          groupId={groupId}
          currentUserId={session.user.id ?? ""}
          isOwner={isOwner}
        />

        {/* Link para página de membros */}
        <div className="mt-3 flex justify-end">
          <a
            href={`/group/${groupId}/members`}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
            Gerenciar membros
          </a>
        </div>
      </div>

      {/* Input para adicionar jogo */}
      <div className="relative mb-8">
        <AddGameForm groupId={groupId} />
      </div>

      {/* Kanban Board */}
      <KanbanBoard games={group.games} groupId={groupId} currentSort={sortParam} />
    </div>
  );
}
