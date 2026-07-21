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
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-4">
      <span className="text-xs font-medium text-zinc-500">
        Membros ({members.length}):
      </span>
      {members.map((member) => {
        const isCurrentUser = member.userId === currentUserId;
        const canRemove = isOwner && !isCurrentUser && member.role !== "OWNER";
        const isRemoving = removingId === member.id;

        return (
          <div
            key={member.id}
            className={`group/member flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all ${
              canRemove
                ? "bg-zinc-800/80 pr-1 hover:bg-red-950/30 hover:pr-1"
                : "bg-zinc-800/80"
            } ${isRemoving ? "opacity-50" : ""}`}
          >
            {member.user.avatarUrl ? (
              <img
                src={member.user.avatarUrl}
                alt=""
                className="h-5 w-5 rounded-full"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[10px] text-zinc-400">
                {member.user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-zinc-300">
              {member.user.name}
              {isCurrentUser && (
                <span className="ml-1 text-zinc-500">(você)</span>
              )}
            </span>
            {member.role === "OWNER" && (
              <span className="text-[10px] text-indigo-400" title="Dono do grupo">★</span>
            )}
            {canRemove && (
              <button
                onClick={() => handleRemove(member)}
                disabled={isRemoving}
                className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-zinc-600 opacity-0 transition-all hover:bg-red-600 hover:text-white group-hover/member:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-0"
                title={`Remover ${member.user.name}`}
                aria-label={`Remover ${member.user.name} do grupo`}
              >
                {isRemoving ? (
                  <svg
                    className="h-3 w-3 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
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
