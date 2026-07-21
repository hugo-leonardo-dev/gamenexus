"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";

interface Member {
  id: string;
  role: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    avatarUrl: string | null;
    discordId: string | null;
  };
}

interface ClientMemberManagerProps {
  members: Member[];
  groupId: string;
  currentUserId: string;
  isOwner: boolean;
  ownerCount: number;
}

export function ClientMemberManager({
  members,
  groupId,
  currentUserId,
  isOwner,
  ownerCount,
}: ClientMemberManagerProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleRemove(member: Member) {
    setConfirmId(null);
    setRemovingId(member.id);

    try {
      const res = await fetch(
        `/api/groups/${groupId}/members/${member.id}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        addToast(`${member.user.name} removido(a) do grupo.`, "success");
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
    <div className="space-y-3 animate-float-up" style={{animationDelay: '0.2s'}}>
      {members.map((member) => {
        const isCurrentUser = member.userId === currentUserId;
        const isOwnerMember = member.role === "OWNER";
        const canRemove =
          isOwner && !isCurrentUser && !isOwnerMember;
        const isRemoving = removingId === member.id;
        const isConfirming = confirmId === member.id;

        return (
          <div
            key={member.id}
            className={`pixel-card p-4 transition-all ${
              isRemoving
                ? "opacity-50 border-l-2 border-l-retro-red"
                : isOwnerMember
                  ? "border-l-2 border-l-retro-accent"
                  : ""
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {member.user.avatarUrl ? (
                <img
                  src={member.user.avatarUrl}
                  alt=""
                  className="h-10 w-10 pixel-border-sm"
                  style={{imageRendering: 'pixelated', borderRadius: 0}}
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center bg-retro-border font-pixel text-sm text-retro-text-dim pixel-border-sm">
                  {member.user.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[9px] text-retro-text truncate">
                    {member.user.name}
                    {isCurrentUser && (
                      <span className="ml-1.5 font-pixel text-[7px] text-retro-text-dim">(VOCÊ)</span>
                    )}
                  </span>
                  {isOwnerMember && (
                    <span className="pixel-badge bg-retro-accent/20 text-retro-accent pixel-border-sm">
                      ★ DONO
                    </span>
                  )}
                </div>
                <p className="mt-0.5 font-pixel text-[7px] text-retro-text-dim truncate">
                  {member.user.email ?? member.user.discordId ? (
                    <>
                      {member.user.email && <span>{member.user.email}</span>}
                      {member.user.discordId && (
                        <span className="ml-2">DISCORD: {member.user.discordId}</span>
                      )}
                    </>
                  ) : (
                    "SEM INFORMAÇÕES DE CONTATO"
                  )}
                </p>
              </div>

              {/* Actions */}
              {canRemove && !isConfirming && (
                <button
                  onClick={() => setConfirmId(member.id)}
                  disabled={isRemoving}
                  className="pixel-btn bg-retro-surface px-3 py-1.5 text-[7px] text-retro-text-dim border-2 border-retro-border hover:border-retro-red hover:text-retro-red"
                >
                  {isRemoving ? "REMOVENDO..." : "REMOVER"}
                </button>
              )}

              {isConfirming && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => setConfirmId(null)}
                    className="pixel-btn bg-retro-surface px-3 py-1.5 text-[7px] text-retro-text-dim border-2 border-retro-border"
                  >
                    CANCELAR
                  </button>
                  <button
                    onClick={() => handleRemove(member)}
                    className="pixel-btn bg-retro-red px-3 py-1.5 text-[7px] text-white"
                  >
                    CONFIRMAR
                  </button>
                </div>
              )}

              {isCurrentUser && (
                <span className="pixel-badge bg-retro-surface text-retro-text-dim pixel-border-sm">
                  VOCÊ
                </span>
              )}

              {isOwnerMember && !isCurrentUser && (
                <span className="pixel-badge bg-retro-surface text-retro-text-dim pixel-border-sm">
                  MEMBRO
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {members.length === 0 && (
        <div className="pixel-card p-10 text-center">
          <p className="font-pixel text-[9px] text-retro-text-dim">NENHUM MEMBRO ENCONTRADO.</p>
        </div>
      )}
    </div>
  );
}
