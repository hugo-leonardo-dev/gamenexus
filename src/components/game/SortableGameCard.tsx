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

      {/* Modal de confirmação */}
      {showConfirm && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setShowConfirm(false);
          }}
        >
          <div
            className="mx-4 w-full max-w-[260px] pixel-card p-4"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <p className="mb-3 text-center font-pixel text-[9px] text-retro-text">
              REMOVER <span className="text-retro-primary">{game.title}</span>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowConfirm(false);
                }}
                className="pixel-btn flex-1 bg-retro-surface px-3 py-2 text-[8px] text-retro-text border-2 border-retro-border"
              >
                CANCELAR
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleDelete();
                }}
                className="pixel-btn flex-1 bg-retro-red px-3 py-2 text-[8px] text-white"
              >
                REMOVER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
