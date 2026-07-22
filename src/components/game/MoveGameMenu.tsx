"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { KANBAN_COLUMNS, STATUS_LABELS, type GameCardData } from "@/lib/types";

interface MoveGameMenuProps {
  game: GameCardData;
  groupId: string;
  onMove: (status: string) => void;
  isMoving: boolean;
}

/**
 * Bottom Sheet mobile para mover jogos entre colunas.
 *
 * Aparece apenas em dispositivos móveis (sm:hidden no trigger).
 * No desktop o usuário usa Drag & Drop.
 *
 * Não mostra a coluna onde o jogo já está.
 */
export function MoveGameMenu({
  game,
  groupId,
  onMove,
  isMoving,
}: MoveGameMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const availableColumns = KANBAN_COLUMNS.filter((col) => col.key !== game.status);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    function handleClick(e: Event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    // Fecha ao scrollar
    function handleScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    window.addEventListener("scroll", handleScroll, { once: true });
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [open]);

  // Fecha com Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleSelect = useCallback(
    (status: string) => {
      setOpen(false);
      onMove(status);
    },
    [onMove]
  );

  if (availableColumns.length === 0) return null;

  return (
    <>
      {/* Trigger - visível apenas no mobile */}
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((prev) => !prev);
        }}
        disabled={isMoving}
        className="sm:hidden shrink-0 flex items-center justify-center h-6 w-6 text-retro-text-dim transition-colors hover:bg-retro-primary/20 hover:text-retro-primary disabled:opacity-50"
        title="Mover para..."
        aria-label={`Mover ${game.title} para outra coluna`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {isMoving ? (
          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.25h18m-18 3.75h18m-18 3.75h18" />
          </svg>
        )}
      </button>

      {/* Bottom Sheet (mobile) */}
      {open && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Mover ${game.title} para:`}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-retro-surface border-t-2 border-retro-border p-4 pb-8 animate-float-up"
          >
            {/* Handle visual */}
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-retro-border" />

            {/* Título */}
            <p className="mb-3 text-center font-pixel text-[8px] text-retro-text-dim uppercase tracking-wider">
              Mover <span className="text-retro-text">{game.title}</span> para:
            </p>

            {/* Opções */}
            <div className="space-y-1">
              {availableColumns.map((col) => {
                const Icon = STATUS_ICONS[col.key as keyof typeof STATUS_ICONS];
                return (
                  <button
                    key={col.key}
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleSelect(col.key);
                    }}
                    disabled={isMoving}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 transition-colors ${
                      isMoving
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-retro-surface-hover cursor-pointer"
                    }`}
                  >
                    <span className="text-base shrink-0">{Icon}</span>
                    <span className="font-pixel text-[8px] text-retro-text uppercase tracking-wider">
                      {STATUS_LABELS[col.key as keyof typeof STATUS_LABELS]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Fechar */}
            <button
              onClick={() => setOpen(false)}
              className="mt-3 w-full py-2 text-center font-pixel text-[7px] text-retro-text-dim uppercase tracking-wider"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </>
  );
}

// ─── Ícones para cada status ─────────────────────────────────────────────

const STATUS_ICONS = {
  BACKLOG: "🎮",
  PLAYING: "▶",
  COMPLETED: "✅",
  DROPPED: "❌",
};
