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
}



export function SortableGameCard({ game, groupId, onMoveStatus, isMoving }: SortableGameCardProps) {
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
        moveMenu={
          <MoveGameMenu
            game={game}
            groupId={groupId}
            onMove={handleMoveRequest}
            isMoving={isMoving ?? false}
          />
        }
      />

      {/* Modal de confirmação - cyberpunk style */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-retro-bg/80 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setShowConfirm(false);
          }}
        >
          <div
            className="mx-4 w-full max-w-[300px] border border-retro-border/30 bg-retro-card-bg backdrop-blur-sm p-5 shadow-xl"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            {/* Neon warning icon */}
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-retro-red/30 bg-retro-red/10">
              <svg className="h-6 w-6 text-retro-red" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>

            <p className="mb-5 text-center font-pixel text-[10px] text-retro-text leading-relaxed">
              Remover <span className="text-retro-primary cyber-text-glow">{game.title}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowConfirm(false);
                }}
                className="flex-1 pixel-btn border-retro-border/40 px-4 py-2.5 text-[8px] text-retro-text-dim hover:text-retro-text active:scale-[0.97]"
              >
                Cancelar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleDelete();
                }}
                className="flex-1 pixel-btn border-retro-red/40 text-retro-red hover:bg-retro-red hover:text-white hover:border-retro-red px-4 py-2.5 text-[8px] active:scale-[0.97]"
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
