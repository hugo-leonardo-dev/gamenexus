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
    <div className="space-y-3">
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
            className={`rounded-xl border p-4 transition-all ${
              isRemoving
                ? "border-red-800/50 bg-red-950/10 opacity-50"
                : isOwnerMember
                  ? "border-indigo-800/50 bg-indigo-950/10"
                  : "border-zinc-800 bg-zinc-900/50"
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {member.user.avatarUrl ? (
                <img
                  src={member.user.avatarUrl}
                  alt=""
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-zinc-400">
                  {member.user.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200 truncate">
                    {member.user.name}
                    {isCurrentUser && (
                      <span className="ml-1.5 text-xs text-zinc-500">(você)</span>
                    )}
                  </span>
                  {isOwnerMember && (
                    <span className="shrink-0 rounded-md bg-indigo-600/20 px-2 py-0.5 text-[11px] font-medium text-indigo-400">
                      Dono
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500 truncate">
                  {member.user.email ?? member.user.discordId ? (
                    <>
                      {member.user.email && <span>{member.user.email}</span>}
                      {member.user.discordId && (
                        <span className="ml-2">
                          Discord: {member.user.discordId}
                        </span>
                      )}
                    </>
                  ) : (
                    "Sem informações de contato"
                  )}
                </p>
              </div>

              {/* Actions */}
              {canRemove && !isConfirming && (
                <button
                  onClick={() => setConfirmId(member.id)}
                  disabled={isRemoving}
                  className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-all hover:border-red-700 hover:bg-red-950/20 hover:text-red-400"
                >
                  {isRemoving ? "Removendo..." : "Remover"}
                </button>
              )}

              {isConfirming && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => setConfirmId(null)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleRemove(member)}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500"
                  >
                    Confirmar
                  </button>
                </div>
              )}

              {isCurrentUser && (
                <span className="shrink-0 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-500">
                  Você
                </span>
              )}

              {isOwnerMember && !isCurrentUser && (
                <span className="shrink-0 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-500">
                  Membro
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {members.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-800 p-12 text-center">
          <p className="text-sm text-zinc-500">Nenhum membro encontrado.</p>
        </div>
      )}
    </div>
  );
}
