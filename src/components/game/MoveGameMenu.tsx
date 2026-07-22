"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { KANBAN_COLUMNS, STATUS_LABELS, type GameCardData } from "@/lib/types";

interface MoveGameMenuProps {
  game: GameCardData;
  groupId: string;
  onMove: (status: string) => void;
  isMoving: boolean;
}

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

  // Fecha ao clicar fora ou scrollar (mobile)
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
    function handleScroll() {
      if (window.innerWidth < 640) {
        setOpen(false);
      }
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
      {/* Trigger - sempre visível */}
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((prev) => !prev);
        }}
        disabled={isMoving}
        className="flex items-center justify-center h-7 w-7 rounded-md bg-retro-surface/50 text-retro-text-dim/70 transition-all hover:bg-retro-surface hover:text-retro-text disabled:opacity-40"
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
          </svg>
        )}
      </button>

      {/* Desktop: Dropdown */}
      {open && (
        <div className="hidden sm:block">
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Mover ${game.title} para:`}
            className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-retro-border/30 bg-retro-bg/95 backdrop-blur-xl p-1.5 shadow-xl animate-float-up"
          >
            <p className="px-2.5 py-1.5 font-pixel text-[7px] text-retro-text-dim uppercase tracking-wider border-b border-retro-border/20 mb-1">
              Mover para
            </p>
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
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all ${
                    isMoving
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-retro-surface-hover cursor-pointer"
                  }`}
                >
                  <span className="text-sm shrink-0">{Icon}</span>
                  <span className="font-pixel text-[8px] text-retro-text tracking-wider">
                    {STATUS_LABELS[col.key as keyof typeof STATUS_LABELS]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile: Bottom Sheet */}
      {open && (
        <div className="sm:hidden">
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
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border border-retro-border/30 bg-retro-bg/95 backdrop-blur-xl p-4 pb-8 animate-float-up"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-retro-border/40" />

            <p className="mb-4 text-center font-pixel text-[9px] text-retro-text tracking-wider">
              Mover <span className="text-retro-primary">{game.title}</span> para:
            </p>

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
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 transition-all ${
                      isMoving
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-retro-surface-hover cursor-pointer"
                    }`}
                  >
                    <span className="text-base shrink-0">{Icon}</span>
                    <span className="font-pixel text-[9px] text-retro-text uppercase tracking-wider">
                      {STATUS_LABELS[col.key as keyof typeof STATUS_LABELS]}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-3 w-full py-2.5 text-center font-pixel text-[8px] text-retro-text-dim transition-colors hover:text-retro-text uppercase tracking-wider"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const STATUS_ICONS = {
  BACKLOG: "🎮",
  PLAYING: "▶",
  PAUSED: "⏸️",
  COMPLETED: "✅",
  DROPPED: "❌",
};
