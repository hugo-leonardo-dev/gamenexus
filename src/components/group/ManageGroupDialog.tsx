"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { DeleteGroupDialog } from "./DeleteGroupDialog";

interface MemberData {
  id: string;
  role: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface ManageGroupDialogProps {
  groupId: string;
  groupName: string;
  members: MemberData[];
  currentUserId: string;
  isOwner: boolean;
  otherMembersCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageGroupDialog({
  groupId,
  groupName: initialName,
  members,
  currentUserId,
  isOwner,
  otherMembersCount,
  open,
  onOpenChange,
}: ManageGroupDialogProps) {
  const router = useRouter();
  const { addToast } = useToast();

  // ─── Renomear ──────────────────────────────────────────────────
  const [renameValue, setRenameValue] = useState(initialName);
  const [isRenaming, setIsRenaming] = useState(false);

  const handleRename = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === initialName) return;

    setIsRenaming(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (res.ok) {
        addToast("Grupo renomeado com sucesso!", "success");
        router.refresh();
      } else {
        const data = await res.json();
        addToast(data.error || "Erro ao renomear grupo.", "error");
      }
    } catch {
      addToast("Erro de conexão. Tente novamente.", "error");
    } finally {
      setIsRenaming(false);
    }
  }, [renameValue, initialName, groupId, addToast, router]);

  // ─── Remover membro ────────────────────────────────────────────
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const handleRemoveMember = useCallback(async (member: MemberData) => {
    setConfirmRemoveId(null);
    setRemovingId(member.id);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${member.id}`, {
        method: "DELETE",
      });
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
  }, [groupId, addToast, router]);

  // ─── Excluir grupo (usa DeleteGroupDialog) ─────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleClose = () => {
    setRenameValue(initialName);
    setConfirmRemoveId(null);
    setRemovingId(null);
    onOpenChange(false);
  };

  const handleDeleted = useCallback(() => {
    onOpenChange(false);
    router.push("/dashboard");
    router.refresh();
  }, [onOpenChange, router]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-12 sm:items-center sm:pt-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-dialog-title"
      >
        <div
          className="w-full max-w-lg animate-float-up pixel-card p-6 sm:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 bg-retro-primary" />
              <h2
                id="manage-dialog-title"
                className="font-pixel text-sm tracking-wider text-retro-text"
              >
                GERENCIAR GRUPO
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="flex h-7 w-7 items-center justify-center text-retro-text-dim transition-colors hover:bg-retro-surface hover:text-retro-text"
              aria-label="Fechar"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-8">
            {/* ═══════════════ GERAL ═══════════════ */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <span className="font-pixel text-[8px] text-retro-text-dim uppercase tracking-wider">✦ GERAL</span>
                <div className="h-px flex-1 bg-retro-border" />
              </div>

              <div className="space-y-2">
                <label className="font-pixel text-[8px] text-retro-text-dim">
                  Nome do grupo
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    disabled={!isOwner || isRenaming}
                    maxLength={50}
                    className="flex-1 bg-retro-bg border-2 border-retro-border px-3 py-2 font-pixel text-[9px] text-retro-text outline-none transition-all focus:border-retro-primary disabled:opacity-50"
                    placeholder="Nome do grupo"
                  />
                  <button
                    onClick={handleRename}
                    disabled={!isOwner || isRenaming || !renameValue.trim() || renameValue.trim() === initialName}
                    className="pixel-btn w-full sm:w-auto bg-retro-primary px-4 py-2 text-[8px] text-white disabled:opacity-40"
                  >
                    {isRenaming ? (
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      "SALVAR"
                    )}
                  </button>
                </div>
                {!isOwner && (
                  <p className="font-pixel text-[7px] text-retro-text-dim">Apenas o dono pode renomear o grupo.</p>
                )}
              </div>
            </section>

            {/* ═══════════════ PARTICIPANTES ═══════════════ */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <span className="font-pixel text-[8px] text-retro-text-dim uppercase tracking-wider">👥 PARTICIPANTES</span>
                <div className="h-px flex-1 bg-retro-border" />
                <span className="font-pixel text-[7px] text-retro-text-dim">{members.length}</span>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin">
                {members.map((member) => {
                  const isCurrentUser = member.userId === currentUserId;
                  const isOwnerMember = member.role === "OWNER";
                  const canRemove = isOwner && !isCurrentUser && !isOwnerMember;
                  const isRemoving = removingId === member.id;
                  const isConfirming = confirmRemoveId === member.id;

                  return (
                    <div
                      key={member.id}
                      className={`flex items-center gap-3 px-3 py-2 bg-retro-surface transition-all ${
                        isRemoving ? "opacity-50" : ""
                      } ${isOwnerMember ? "border-l-2 border-l-retro-accent" : ""}`}
                    >
                      {/* Avatar */}
                      {member.user.avatarUrl ? (
                        <img
                          src={member.user.avatarUrl}
                          alt=""
                          className="h-8 w-8 pixel-border-sm"
                          style={{ imageRendering: "pixelated", borderRadius: 0 }}
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center bg-retro-border font-pixel text-[11px] text-retro-text-dim pixel-border-sm">
                          {member.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <span className="font-pixel text-[8px] text-retro-text truncate block">
                          {member.user.name}
                          {isCurrentUser && (
                            <span className="ml-1.5 text-retro-text-dim">(VOCÊ)</span>
                          )}
                        </span>
                        {isOwnerMember && (
                          <span className="font-pixel text-[6px] text-retro-accent">★ DONO</span>
                        )}
                      </div>

                      {/* Actions */}
                      {canRemove && !isConfirming && (
                        <button
                          onClick={() => setConfirmRemoveId(member.id)}
                          disabled={isRemoving}
                          className="pixel-btn bg-retro-surface px-2.5 py-1 text-[7px] text-retro-text-dim border-2 border-retro-border hover:border-retro-red hover:text-retro-red"
                        >
                          {isRemoving ? "..." : "REMOVER"}
                        </button>
                      )}

                      {isConfirming && (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            onClick={() => setConfirmRemoveId(null)}
                            className="pixel-btn bg-retro-surface px-2 py-1 text-[7px] text-retro-text-dim border-2 border-retro-border"
                          >
                            CANCELAR
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member)}
                            className="pixel-btn bg-retro-red px-2 py-1 text-[7px] text-white"
                          >
                            CONFIRMAR
                          </button>
                        </div>
                      )}

                      {isCurrentUser && (
                        <span className="pixel-badge bg-retro-surface text-retro-text-dim pixel-border-sm text-[6px]">
                          VOCÊ
                        </span>
                      )}
                    </div>
                  );
                })}

                {members.length === 0 && (
                  <p className="font-pixel text-[8px] text-retro-text-dim text-center py-4">
                    Nenhum participante encontrado.
                  </p>
                )}
              </div>
            </section>

            {/* ═══════════════ ZONA DE PERIGO ═══════════════ */}
            {isOwner && (
              <section className="border-2 border-retro-red/20 bg-retro-red/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="font-pixel text-[9px] text-retro-red uppercase tracking-wider">⚠ ZONA DE PERIGO</span>
                  <div className="h-px flex-1 bg-retro-red/20" />
                </div>

                <p className="mb-3 font-pixel text-[7px] text-retro-text-dim leading-relaxed">
                  Esta ação é irreversível. Todos os dados do grupo serão removidos permanentemente.
                </p>

                <button
                  onClick={() => setDeleteDialogOpen(true)}
                  className="pixel-btn flex w-full items-center justify-center gap-2 bg-retro-red px-4 py-2.5 text-[8px] text-white transition-all hover:bg-red-700"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  EXCLUIR GRUPO
                </button>

                <DeleteGroupDialog
                  groupId={groupId}
                  groupName={initialName}
                  otherMembersCount={otherMembersCount}
                  open={deleteDialogOpen}
                  onOpenChange={setDeleteDialogOpen}
                  onDeleted={handleDeleted}
                />
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
