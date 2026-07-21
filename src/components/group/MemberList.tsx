"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import type { MemberData } from "@/lib/types";

interface MemberListProps {
  members: MemberData[];
  groupId: string;
  currentUserId: string;
  isOwner: boolean;
}

export function MemberList({
  members,
  groupId,
  currentUserId,
  isOwner,
}: MemberListProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(member: MemberData) {
    if (!confirm(`Remover "${member.user.name}" do grupo?`)) return;

    setRemovingId(member.id);

    try {
      const res = await fetch(
        `/api/groups/${groupId}/members/${member.id}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        addToast(`${member.user.name} removido do grupo.`, "success");
        router.refresh();
      } else {
        const data = await res.json();
        addToast(data.error || "Erro ao remover membro", "error");
        setRemovingId(null);
      }
    } catch {
      addToast("Erro de conexão. Tente novamente.", "error");
      setRemovingId(null);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t-2 border-retro-border pt-4">
      <span className="font-pixel text-[7px] text-retro-text-dim uppercase tracking-wider">
        ▸ MEMBROS ({members.length}):
      </span>
      {members.map((member) => {
        const isCurrentUser = member.userId === currentUserId;
        const canRemove = isOwner && !isCurrentUser && member.role !== "OWNER";
        const isRemoving = removingId === member.id;

        return (
          <div
            key={member.id}
            className={`group/member flex items-center gap-1.5 pixel-border-sm px-2.5 py-1 transition-all ${
              canRemove
                ? "bg-retro-surface pr-1 hover:bg-retro-red/10 hover:pr-1"
                : "bg-retro-surface"
            } ${isRemoving ? "opacity-50" : ""}`}
          >
            {member.user.avatarUrl ? (
              <img
                src={member.user.avatarUrl}
                alt=""
                className="h-5 w-5"
                style={{imageRendering: 'pixelated', borderRadius: 0}}
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center bg-retro-border text-[8px] text-retro-text-dim font-pixel">
                {member.user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-pixel text-[7px] text-retro-text">
              {member.user.name}
              {isCurrentUser && (
                <span className="ml-1 text-retro-text-dim">(VOCÊ)</span>
              )}
            </span>
            {member.role === "OWNER" && (
              <span className="font-pixel text-[7px] text-retro-accent" title="Dono do grupo">★</span>
            )}
            {canRemove && (
              <button
                onClick={() => handleRemove(member)}
                disabled={isRemoving}
                className="ml-0.5 flex h-5 w-5 items-center justify-center text-retro-text-dim opacity-0 transition-all hover:bg-retro-red hover:text-white group-hover/member:opacity-100 focus:opacity-100 disabled:opacity-0"
                title={`Remover ${member.user.name}`}
                aria-label={`Remover ${member.user.name} do grupo`}
              >
                {isRemoving ? (
                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
