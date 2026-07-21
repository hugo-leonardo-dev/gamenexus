"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useRouter, useSearchParams } from "next/navigation";
import { useGameRefresh } from "@/lib/use-game-refresh";
import { SortableGameCard } from "./SortableGameCard";
import { GameCard } from "./GameCard";
import { KANBAN_COLUMNS, type GameCardData } from "@/lib/types";

interface KanbanBoardProps {
  games: GameCardData[];
  groupId: string;
  currentSort: string;
}

// ─── Opções de ordenação ──────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "position",     label: "Posição padrão" },
  { value: "review_desc",  label: "Nota (maior → menor)" },
  { value: "review_asc",   label: "Nota (menor → maior)" },
  { value: "name_asc",     label: "Nome (A-Z)" },
  { value: "name_desc",    label: "Nome (Z-A)" },
  { value: "price_asc",    label: "Preço (menor → maior)" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

// ─── Drop zone para coluna vazia ─────────────────────────────────────

function EmptyColumnDropZone({ status }: { status: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: "column", status },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-1 items-center justify-center border-2 py-8 transition-all duration-200 ${
        isOver
          ? "border-retro-primary bg-retro-primary/5 pixel-border-accent"
          : "border-dashed border-retro-border"
      }`}
    >
      <p className="font-pixel text-[7px] text-retro-text-dim">
        {isOver ? "▼ SOLTE AQUI ▼" : "▸ ARRASTE JOGOS PARA CÁ ◂"}
      </p>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────

export function KanbanBoard({ games, groupId, currentSort }: KanbanBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { moveGame, isRefreshing } = useGameRefresh();
  const [draggedGame, setDraggedGame] = useState<GameCardData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Atualiza a URL com o novo sort, forçando o servidor a re-renderizar com a ordenação correta
  const handleSortChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", value);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Filtro por busca textual (client-side — dados já carregados)
  const filteredGames = useMemo(() => {
    if (!searchQuery.trim()) return games;
    const q = searchQuery.trim().toLowerCase();
    return games.filter((g) => g.title.toLowerCase().includes(q));
  }, [games, searchQuery]);

  // Separa os jogos por coluna
  const gamesByColumn = useMemo(
    () =>
      KANBAN_COLUMNS.map((col) => {
        const columnGames = filteredGames.filter((g) => g.status === col.key);
        return {
          ...col,
          games: columnGames,
          gameIds: columnGames.map((g) => g.id),
        };
      }),
    [filteredGames]
  );

  // Sensores para desktop e mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const game = event.active.data.current?.game as GameCardData | undefined;
    if (game) setDraggedGame(game);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setDraggedGame(null);

      if (!over || !active) return;

      const activeGame = active.data.current?.game as GameCardData | undefined;
      if (!activeGame) return;

      const overData = over.data.current;

      let targetStatus: string;
      let targetPosition: number;

      if (overData?.type === "column") {
        targetStatus = overData.status;
        targetPosition = 0;
      } else {
        const overGame = overData?.game as GameCardData | undefined;
        if (!overGame) return;
        targetStatus = overGame.status;
        targetPosition = overGame.position;
      }

      if (
        activeGame.status === targetStatus &&
        activeGame.position === targetPosition
      ) {
        return;
      }

      await moveGame(activeGame.id, {
        status: targetStatus,
        position: targetPosition,
        groupId,
      });
    },
    [groupId, moveGame]
  );

  const totalGames = games.length;
  const filteredTotal = filteredGames.length;
  const hasFilter = searchQuery.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Search + Sort + Status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
            <svg className="h-4 w-4 text-retro-text-dim" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="BUSCAR JOGOS..."
            className="retro-input w-full py-2 pl-10 pr-8 text-sm"
            aria-label="Buscar jogos por nome"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2 text-retro-text-dim hover:text-retro-text"
              aria-label="Limpar busca"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="font-pixel text-[7px] text-retro-text-dim shrink-0 uppercase">
            ORDENAR:
          </label>
          <select
            id="sort-select"
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="retro-input px-2.5 py-1.5 text-xs font-pixel text-[8px]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {isRefreshing && (
            <svg className="h-3.5 w-3.5 animate-spin text-retro-primary shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}

          <p className="font-pixel text-[7px] text-retro-text-dim whitespace-nowrap">
            {hasFilter
              ? `${filteredTotal}/${totalGames}`
              : `${totalGames} JOGOS`}
          </p>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-4">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {gamesByColumn.map((column) => (
            <div
              key={column.key}
              className={`flex flex-col crt-screen border-t-2 ${column.borderColor} lg:flex-1 lg:min-h-0`}
            >
              {/* Header da Coluna */}
              <div
                className={`flex items-center gap-2 px-4 py-3 ${column.headerBg} border-b-2 border-retro-border`}
              >
                <span className={`h-2.5 w-2.5 ${column.dotColor}`} />
                <h3 className="font-pixel text-[9px] text-retro-text uppercase tracking-wider">
                  {column.title}
                </h3>
                <span className="ml-auto pixel-badge bg-retro-surface text-retro-text-dim pixel-border-sm">
                  {column.games.length}
                </span>
              </div>

              {/* Lista */}
              <div className="flex flex-1 flex-col gap-3 p-2">
                <div className="flex-1 space-y-2 overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-400px)] scrollbar-thin">
                  {hasFilter && column.games.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-xs text-zinc-600">
                        Nenhum jogo encontrado com &ldquo;{searchQuery}&rdquo;
                      </p>
                    </div>
                  )}
                  {!hasFilter && column.games.length === 0 && (
                    <EmptyColumnDropZone status={column.key} />
                  )}
                  {column.games.length > 0 && (
                    <SortableContext
                      items={column.gameIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {column.games.map((game) => (
                        <SortableGameCard
                          key={game.id}
                          game={game}
                          groupId={groupId}
                        />
                      ))}
                    </SortableContext>
                  )}
                </div>
              </div>
            </div>
          ))}

          <DragOverlay>
            {draggedGame ? (
              <div className="rotate-3 scale-105 opacity-90 shadow-2xl">
                <GameCard game={draggedGame} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Retro footer decoration */}
      <div className="border-t-2 border-retro-border pt-3 text-center">
        <span className="font-pixel text-[6px] text-retro-text-dim">
          ▸ {totalGames} JOGO{totalGames !== 1 ? "S" : ""} NO GAMENEXUS ◂
        </span>
      </div>
    </div>
  );
}
