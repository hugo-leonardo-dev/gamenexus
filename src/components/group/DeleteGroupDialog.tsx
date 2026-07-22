"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/ToastProvider";

interface DeleteGroupDialogProps {
  groupId: string;
  groupName: string;
  /** Quantidade de participantes EXCLUINDO o próprio usuário. */
  otherMembersCount: number;
  /** Called after successful deletion so the parent can redirect. */
  onDeleted?: () => void;
  /** Externally controlled open/close. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteGroupDialog({
  groupId,
  groupName,
  otherMembersCount,
  onDeleted,
  open,
  onOpenChange,
}: DeleteGroupDialogProps) {
  const { addToast } = useToast();
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasOtherMembers = otherMembersCount > 0;
  const isNameConfirmed = confirmName === groupName;

  // Foca o input quando o diálogo abre (apenas se não houver outros membros)
  useEffect(() => {
    if (open && !hasOtherMembers) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open, hasOtherMembers]);

  const handleClose = useCallback(() => {
    setConfirmName("");
    setIsDeleting(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleDelete = useCallback(async () => {
    if (!isNameConfirmed) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmedName: confirmName }),
      });

      if (res.ok) {
        addToast("Grupo excluído permanentemente.", "success");
        handleClose();
        onDeleted?.();
      } else {
        const data = await res.json();
        addToast(data.error || "Erro ao excluir grupo.", "error");
        setIsDeleting(false);
      }
    } catch {
      addToast("Erro de conexão. Tente novamente.", "error");
      setIsDeleting(false);
    }
  }, [groupId, confirmName, isNameConfirmed, addToast, handleClose, onDeleted]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={() => !isDeleting && handleClose()}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        <div
          className="w-full max-w-md animate-float-up pixel-card border-2 border-retro-red/30 p-6 sm:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ícone de alerta */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-retro-red/20 pixel-border-sm">
            <svg
              className="h-7 w-7 text-retro-red"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>

          {/* Título */}
          <h2
            id="delete-dialog-title"
            className="mb-2 text-center font-pixel text-sm tracking-wider text-retro-red"
          >
            EXCLUIR GRUPO
          </h2>

          {/* Descrição */}
          <p className="mb-4 text-center font-pixel text-[8px] text-retro-text-dim leading-relaxed">
            Esta ação é irreversível.
            <br />
            Todos os dados deste grupo serão removidos permanentemente.
          </p>

          {/* Aviso de participantes */}
          {hasOtherMembers && (
            <div className="mb-4 rounded-lg border-2 border-retro-red/30 bg-retro-red/10 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <svg
                  className="h-4 w-4 shrink-0 text-retro-red"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                  />
                </svg>
                <span className="font-pixel text-[9px] text-retro-red font-semibold">
                  PARTICIPANTES ENCONTRADOS
                </span>
              </div>
              <p className="font-pixel text-[8px] text-retro-text-dim">
                Este grupo possui {otherMembersCount} participante
                {otherMembersCount !== 1 ? "s" : ""} e não pode ser excluído.
              </p>
              <p className="mt-1 font-pixel text-[7px] text-retro-text-dim">
                Remova todos os participantes antes de excluí-lo.
              </p>
            </div>
          )}

          {/* Input de confirmação (só se não tiver outros membros) */}
          {!hasOtherMembers && (
            <div className="mb-4">
              <label
                htmlFor="confirm-group-name"
                className="mb-2 block font-pixel text-[8px] text-retro-text-dim"
              >
                Digite o nome do grupo para confirmar:
              </label>
              <input
                ref={inputRef}
                id="confirm-group-name"
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={groupName}
                disabled={isDeleting}
                autoComplete="off"
                spellCheck={false}
                className={`w-full bg-retro-bg border-2 px-3 py-2.5 font-pixel text-[9px] text-retro-text placeholder-retro-text-dim/30 outline-none transition-all ${
                  confirmName && !isNameConfirmed
                    ? "border-retro-red/50 focus:border-retro-red"
                    : isNameConfirmed
                      ? "border-retro-green/50 focus:border-retro-green"
                      : "border-retro-border focus:border-retro-primary"
                } disabled:opacity-50`}
              />
              {confirmName && !isNameConfirmed && (
                <p className="mt-1 font-pixel text-[7px] text-retro-red">
                  O nome informado não corresponde ao nome do grupo.
                </p>
              )}
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isDeleting}
              className="pixel-btn bg-retro-surface px-4 py-2.5 text-[8px] text-retro-text-dim border-2 border-retro-border transition-all hover:border-retro-text-dim disabled:opacity-50"
            >
              CANCELAR
            </button>

            <button
              onClick={handleDelete}
              disabled={hasOtherMembers || !isNameConfirmed || isDeleting}
              className="pixel-btn bg-retro-red px-4 py-2.5 text-[8px] text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-retro-red"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
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
                  EXCLUINDO...
                </span>
              ) : (
                "EXCLUIR GRUPO"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
