"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GameCard } from "@/components/game/GameCard";
import { MoveGameMenu } from "@/components/game/MoveGameMenu";
import { useToast } from "@/components/ui/ToastProvider";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import type { GameCardData } from "@/lib/types";

interface SortableGameCardProps {
  game: GameCardData;
  groupId: string;
  onMoveStatus?: (status: string) => void;
  isMoving?: boolean;
  /** ID do card atualmente expandido (null = nenhum) */
  expandedId: string | null;
  /** Callback para alternar expansão */
  onToggleExpand: (gameId: string) => void;
}



export function SortableGameCard({ game, groupId, onMoveStatus, isMoving, expandedId, onToggleExpand }: SortableGameCardProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleMoveRequest = useCallback(
    (status: string) => {
      onMoveStatus?.(status);
    },
    [onMoveStatus]
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: game.id,
    data: { type: "game", game },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  async function handleDelete() {
    setShowConfirm(false);
    setDeleting(true);

    try {
      const res = await fetch(`/api/games/${game.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        addToast(`"${game.title}" removido do GameNexus`, "success");
        router.refresh();
      } else {
        const data = await res.json();
        addToast(data.error || "Erro ao remover jogo", "error");
        setDeleting(false);
      }
    } catch {
      addToast("Erro de conexão. Tente novamente.", "error");
      setDeleting(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      suppressHydrationWarning
      className="group/card relative touch-pan-y"
      role="listitem"
      aria-label={`${game.title} - ${
  game.status === "BACKLOG" ? "Quero Jogar" :
  game.status === "PLAYING" ? "Jogando Agora" :
  game.status === "PAUSED" ? "Pausado" :
  game.status === "COMPLETED" ? "Finalizado" :
  "Dropado"
}`}
    >
      {/* Card com lixeira + mover no footer */}
      <GameCard
        game={game}
        onDelete={() => setShowConfirm(true)}
        deleting={deleting}
        expanded={expandedId === game.id}
        onToggleExpand={() => onToggleExpand(game.id)}
        moveMenu={
          <MoveGameMenu
            game={game}
            groupId={groupId}
            onMove={handleMoveRequest}
            isMoving={isMoving ?? false}
          />
        }
      />

      {/* Modal de confirmação - posicionado na viewport */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setShowConfirm(false);
          }}
        >
          <div
            className="mx-4 w-full max-w-[300px] rounded-xl border border-retro-border/30 bg-retro-card-bg/90 backdrop-blur-sm p-5 shadow-xl"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <p className="mb-5 text-center font-pixel text-[10px] text-retro-text leading-relaxed">
              Remover <span className="text-retro-primary">{game.title}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowConfirm(false);
                }}
                className="flex-1 rounded-lg border border-retro-border/30 px-4 py-2.5 font-pixel text-[8px] text-retro-text-dim transition-all hover:bg-retro-surface-hover active:scale-[0.97]"
              >
                Cancelar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleDelete();
                }}
                className="flex-1 rounded-lg bg-retro-red px-4 py-2.5 font-pixel text-[8px] text-white transition-all hover:bg-retro-red/90 active:scale-[0.97]"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
