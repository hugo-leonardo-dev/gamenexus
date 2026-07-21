"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GameCard } from "@/components/game/GameCard";
import { useToast } from "@/components/ui/ToastProvider";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GameCardData } from "@/lib/types";

interface SortableGameCardProps {
  game: GameCardData;
  groupId: string;
}

export function SortableGameCard({ game, groupId }: SortableGameCardProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
        addToast(`"${game.title}" removido do backlog`, "success");
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
      className="group/card relative touch-none"
      role="listitem"
      aria-label={`${game.title} - ${
  game.status === "BACKLOG" ? "Quero Jogar" :
  game.status === "PLAYING" ? "Jogando Agora" :
  game.status === "COMPLETED" ? "Finalizado" :
  "Dropado"
}`}
    >
      {/* Corner hover X (atalho rápido — power user) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setShowConfirm(true);
        }}
        disabled={deleting}
        className="absolute -right-2 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-500 opacity-0 shadow-lg transition-all duration-200 hover:border-red-600 hover:bg-red-600 hover:text-white group-hover/card:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        title={`Remover ${game.title}`}
        aria-label={`Remover ${game.title}`}
      >
        {deleting ? (
          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        )}
      </button>

      {/* Card com lixeira no footer */}
      <GameCard
        game={game}
        onDelete={() => setShowConfirm(true)}
        deleting={deleting}
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
            className="mx-4 w-full max-w-[260px] rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-2xl"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <p className="mb-3 text-center text-sm font-medium text-zinc-200">
              Remover <span className="font-semibold text-white">{game.title}</span>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowConfirm(false);
                }}
                className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
              >
                Cancelar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleDelete();
                }}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-500"
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
