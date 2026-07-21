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
      className={`flex flex-1 items-center justify-center rounded-lg border-2 py-8 transition-all duration-200 ${
        isOver
          ? "border-indigo-500 bg-indigo-900/10 shadow-inner"
          : "border-dashed border-zinc-800"
      }`}
    >
      <p className="text-xs text-zinc-600">
        {isOver ? "Solte aqui" : "Arraste jogos para cá"}
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
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar jogos..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-10 pr-8 text-sm text-zinc-200 placeholder-zinc-600 transition-colors focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            aria-label="Buscar jogos por nome"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2 text-zinc-500 hover:text-zinc-300"
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
          <label htmlFor="sort-select" className="shrink-0 text-xs text-zinc-500">
            Ordenar:
          </label>
          <select
            id="sort-select"
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {isRefreshing && (
            <svg className="h-3.5 w-3.5 animate-spin text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}

          <p className="text-xs text-zinc-500 whitespace-nowrap">
            {hasFilter
              ? `${filteredTotal} de ${totalGames}`
              : `${totalGames} jogos`}
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
              className={`flex flex-col rounded-xl border border-zinc-800 border-t-2 ${column.borderColor} bg-zinc-950 lg:flex-1 lg:min-h-0`}
            >
              {/* Header da Coluna */}
              <div
                className={`flex items-center gap-2 rounded-t-xl px-4 py-3 ${column.headerBg}`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${column.dotColor}`} />
                <h3 className="text-sm font-semibold text-zinc-200">
                  {column.title}
                </h3>
                <span className="ml-auto rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
                  {column.games.length}
                </span>
              </div>

              {/* Lista */}
              <div className="flex flex-1 flex-col gap-3 p-3">
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-400px)] scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
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
    </div>
  );
}
