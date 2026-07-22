"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GameCard } from "@/components/game/GameCard";
import { MoveGameMenu } from "@/components/game/MoveGameMenu";
import { useToast } from "@/components/ui/ToastProvider";
import { useRouter } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import type { GameCardData } from "@/lib/types";

interface SortableGameCardProps {
  game: GameCardData;
  groupId: string;
  onMoveStatus?: (status: string) => void;
  isMoving?: boolean;
}

// Detecta se é dispositivo touch (mobile)
function isTouchDevice(): boolean {
  return (
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0)
  );
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

  // ─── Hint visual mobile ───────────────────────────────────────
  const [showDragHint, setShowDragHint] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  function dismissHint() {
    setShowDragHint(false);
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
  }

  function showHint() {
    if (deleting || showConfirm) return;
    if (!isTouchDevice()) return;
    if (isDragging) return;

    setShowDragHint(true);

    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(dismissHint, 3000);
  }

  // Fecha o hint ao clicar/tocar fora do card
  useEffect(() => {
    if (!showDragHint) return;

    function handleOutsideClick(e: Event) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        dismissHint();
      }
    }

    // Pequeno delay para não fechar imediatamente pelo mesmo click que abriu
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [showDragHint]);

  // Fecha ao scrollar
  useEffect(() => {
    if (!showDragHint) return;
    function onScroll() { dismissHint(); }
    window.addEventListener("scroll", onScroll, { once: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showDragHint]);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        cardRef.current = node;
      }}
      style={style}
      {...attributes}
      {...listeners}
      suppressHydrationWarning
      onClick={(e) => {
        // Não interfere com clicks em botões internos
        if ((e.target as HTMLElement).closest("button")) return;
        showHint();
      }}
      className="group/card relative touch-pan-y"
      role="listitem"
      aria-label={`${game.title} - ${
  game.status === "BACKLOG" ? "Quero Jogar" :
  game.status === "PLAYING" ? "Jogando Agora" :
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

      {/* Hint visual "Segure para arrastar" */}
      {showDragHint && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm animate-float-up"
          onClick={(e) => {
            e.stopPropagation();
            dismissHint();
          }}
        >
          <div className="flex flex-col items-center gap-2 px-6 py-4 pointer-events-none">
            <svg
              className="h-8 w-8 text-retro-primary"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 15.75h7.5M8.25 8.25h7.5M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z"
              />
            </svg>
            <p className="font-pixel text-[9px] text-retro-text text-center leading-relaxed">
              SEGURE O CARD
              <br />
              PARA ARRASTAR
            </p>
            <p className="font-pixel text-[7px] text-retro-text-dim mt-1">
              Ou use o botão ☰ para mover
            </p>
          </div>
        </div>
      )}

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
