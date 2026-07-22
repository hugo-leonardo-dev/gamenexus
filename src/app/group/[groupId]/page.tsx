import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { KanbanBoard } from "@/components/game/KanbanBoard";
import { AddGameForm } from "@/components/group/AddGameForm";
import { CopyInviteButton } from "./CopyInviteButton";
import { MemberList } from "@/components/group/MemberList";
import { ManageGroupButton } from "@/components/group/ManageGroupButton";
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

  // Contagem de participantes excluindo o próprio usuário
  const otherMembersCount = group.members.filter(
    (m) => m.userId !== session.user?.id
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-8 sm:px-8 lg:px-10 xl:px-12">
      {/* Header do Grupo */}
      <div className="mb-6 pixel-card p-5 sm:p-6 animate-float-up">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-retro-primary" />
              <h1 className="font-pixel text-sm sm:text-base tracking-wider text-retro-text truncate">
                {group.name}
              </h1>
              {isOwner && (
                <span className="pixel-badge bg-retro-primary/20 text-retro-primary pixel-border-sm">
                  ★ DONO
                </span>
              )}
            </div>
            <p className="mt-2 font-pixel text-[8px] text-retro-text-dim ml-4">
              {group._count.members} MEMBRO{group._count.members !== 1 ? "S" : ""}
              {' ▸ '}
              {group._count.games} JOGO{group._count.games !== 1 ? "S" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <CopyInviteButton inviteCode={group.inviteCode} />
            <ManageGroupButton
              groupId={groupId}
              groupName={group.name}
              members={group.members}
              currentUserId={session.user.id ?? ""}
              isOwner={isOwner}
              otherMembersCount={otherMembersCount}
            />
          </div>
        </div>

        <MemberList
          members={group.members}
          currentUserId={session.user.id ?? ""}
        />
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
