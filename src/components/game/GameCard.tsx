"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { formatPrice, type GameCardData } from "@/lib/types";

interface GameCardProps {
  game: GameCardData;
  onDelete?: () => void;
  deleting?: boolean;
  /** Renderiza o botão e menu \"Mover para...\" */
  moveMenu?: React.ReactNode;
  /** Se este card está expandido */
  expanded?: boolean;
  /** Callback para toggle de expansão */
  onToggleExpand?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatPlayerCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}MI`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const STATUS_CFG: Record<string, { label: string; dot: string }> = {
  BACKLOG:   { label: "QUERO JOGAR", dot: "bg-zinc-500" },
  PLAYING:   { label: "JOGANDO",     dot: "bg-retro-green" },
  PAUSED:    { label: "PAUSADO",     dot: "bg-retro-amber" },
  COMPLETED: { label: "FEITO",       dot: "bg-retro-cyan" },
  DROPPED:   { label: "DROPADO",     dot: "bg-retro-red" },
};

// ─── Indicador de review ─────────────────────────────────────────────────

function ReviewBadge({ score }: { score: number | null; summary: string | null }) {
  if (score === null) return null;
  const color = score >= 90 ? "text-retro-green" : score >= 70 ? "text-retro-amber" : "text-retro-red";
  return (
    <span className={`inline-flex items-center gap-0.5 font-pixel text-[7px] leading-none ${color}`}>
      <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
      {score}%
    </span>
  );
}

// ─── Indicador de jogadores ──────────────────────────────────────────────

function PlayersBadge({ count }: { count: number | null }) {
  if (count === null || count <= 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 font-pixel text-[7px] text-retro-text-dim leading-none">
      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
      {formatPlayerCount(count)}
    </span>
  );
}

// ─── Preço compacto ──────────────────────────────────────────────────────

function PriceDisplay({ game }: { game: GameCardData }) {
  const isDiscounted = game.discountPercent > 0;
  const isFree = game.currentPrice === 0;
  if (game.currentPrice === null) return null;
  return (
    <span className={`inline-flex items-center gap-1 font-pixel text-[8px] leading-none ${isDiscounted || isFree ? "text-retro-green" : "text-retro-text"}`}>
      {isFree ? "GRÁTIS" : formatPrice(game.currentPrice)}
      {isDiscounted && game.originalPrice !== null && (
        <span className="text-[6px] text-retro-text-dim line-through">{formatPrice(game.originalPrice)}</span>
      )}
    </span>
  );
}

// ─── Componente principal ────────────────────────────────────────────────

// Flag compartilhada entre todos os cards: animação roda apenas uma vez por sessão
let dragAnimationPlayed = false;

export function GameCard({ game, onDelete, deleting, moveMenu, expanded, onToggleExpand }: GameCardProps) {
  const isDiscounted = game.discountPercent > 0;
  const isFree = game.currentPrice === 0;
  const statusCfg = STATUS_CFG[game.status] ?? STATUS_CFG.BACKLOG;
  const [showDragAnim, setShowDragAnim] = useState(false);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouch && !dragAnimationPlayed) {
      dragAnimationPlayed = true;
      // Usa requestAnimationFrame para evitar o warning de setState-in-effect
      const frame = requestAnimationFrame(() => {
        setShowDragAnim(true);
        // Remove a classe após 3 iterações * 0.5s + maior delay (0.3s) = ~1.8s
        animTimerRef.current = setTimeout(() => setShowDragAnim(false), 1800);
      });
      return () => cancelAnimationFrame(frame);
    }
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  const handleClick = useCallback(() => {
    onToggleExpand?.();
  }, [onToggleExpand]);

  return (
    <div
      className={`pixel-card transition-all duration-200 ${
        isDiscounted ? "border-l-2 border-l-retro-green" : ""
      } ${expanded ? "shadow-lg shadow-retro-primary/10" : ""}`}
    >
      {/* ─── Cabeçalho compacto (sempre visível) ─────────────────── */}
      <div
        className="flex items-start gap-3 p-2.5 cursor-pointer select-none"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      >
        {/* Drag handle (só mobile) */}
        <div className="sm:hidden flex flex-col items-center justify-center h-10 w-5 gap-[3px] text-retro-text-dim/60 cursor-grab active:cursor-grabbing" aria-hidden="true">
          <div className="flex gap-[3px]">
            <span className={`h-[2px] w-[2px] rounded-full bg-current ${showDragAnim ? "animate-drag-pulse" : ""}`} style={showDragAnim ? { animationDelay: "0s" } : undefined} />
            <span className={`h-[2px] w-[2px] rounded-full bg-current ${showDragAnim ? "animate-drag-pulse" : ""}`} style={showDragAnim ? { animationDelay: "0s" } : undefined} />
          </div>
          <div className="flex gap-[3px]">
            <span className={`h-[2px] w-[2px] rounded-full bg-current ${showDragAnim ? "animate-drag-pulse" : ""}`} style={showDragAnim ? { animationDelay: "0.15s" } : undefined} />
            <span className={`h-[2px] w-[2px] rounded-full bg-current ${showDragAnim ? "animate-drag-pulse" : ""}`} style={showDragAnim ? { animationDelay: "0.15s" } : undefined} />
          </div>
          <div className="flex gap-[3px]">
            <span className={`h-[2px] w-[2px] rounded-full bg-current ${showDragAnim ? "animate-drag-pulse" : ""}`} style={showDragAnim ? { animationDelay: "0.3s" } : undefined} />
            <span className={`h-[2px] w-[2px] rounded-full bg-current ${showDragAnim ? "animate-drag-pulse" : ""}`} style={showDragAnim ? { animationDelay: "0.3s" } : undefined} />
          </div>
        </div>

        {/* Thumbnail 40px */}
        <div className="shrink-0 h-10 w-[46px] overflow-hidden bg-retro-surface pixel-border-sm">
          {game.imageUrl ? (
            <Image
              src={game.imageUrl}
              alt={game.title}
              width={46}
              height={40}
              className="h-full w-full object-cover"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-pixel text-[10px] text-retro-text-dim">?</div>
          )}
        </div>

        {/* Info central */}
        <div className="flex-1 min-w-0">
          {/* Linha 1: Título + Status */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`h-1.5 w-1.5 shrink-0 ${statusCfg.dot}`} />
            <h3 className="font-pixel text-[8px] text-retro-text truncate leading-tight">
              {game.title}
            </h3>
          </div>

          {/* Linha 2: Preço + Desconto */}
          <div className="flex items-center gap-2 mb-0.5">
            <PriceDisplay game={game} />
            {isDiscounted && (
              <span className="bg-retro-green/20 text-retro-green font-pixel text-[6px] px-1 leading-tight">
                -{game.discountPercent}%
              </span>
            )}
          </div>

          {/* Linha 3: Indicadores */}
          <div className="flex items-center gap-2">
            <ReviewBadge score={game.reviewScore} summary={game.reviewSummary} />
            <PlayersBadge count={game.currentPlayers} />
            {game.peak24h !== null && game.peak24h > 0 && (
              <span className="font-pixel text-[6px] text-retro-text-dim leading-none">
                PICO {formatPlayerCount(game.peak24h)}
              </span>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 shrink-0">
          {moveMenu}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
              disabled={deleting}
              className="flex items-center justify-center h-6 w-6 text-retro-text-dim transition-colors hover:bg-retro-red/20 hover:text-retro-red disabled:opacity-50"
              title="Remover jogo"
              aria-label={`Remover ${game.title}`}
            >
              {deleting ? (
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ─── Conteúdo expandido ─────────────────────────────────── */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t-2 border-retro-border px-3 py-3 space-y-2.5">
          {/* Review completo */}
          {game.reviewSummary && (
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[7px] text-retro-text-dim uppercase tracking-wider">REVIEW</span>
              <span className="font-pixel text-[8px] text-retro-text">
                {game.reviewSummary}
                {game.reviewScore !== null && (
                  <span className="ml-1 text-retro-text-dim">({game.reviewScore}%)</span>
                )}
              </span>
            </div>
          )}

          {/* Jogadores */}
          {game.currentPlayers !== null && game.currentPlayers > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[7px] text-retro-text-dim uppercase tracking-wider">JOGADORES</span>
              <span className="font-pixel text-[8px] text-retro-text">
                {formatPlayerCount(game.currentPlayers)} AGORA
                {game.peak24h !== null && game.peak24h > 0 && (
                  <span className="ml-2 text-retro-text-dim">PICO: {formatPlayerCount(game.peak24h)}</span>
                )}
              </span>
            </div>
          )}

          {/* Preços */}
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[7px] text-retro-text-dim uppercase tracking-wider">PREÇO</span>
            <span className="font-pixel text-[9px] text-retro-text">
              {isFree ? "GRÁTIS" : formatPrice(game.currentPrice)}
            </span>
            {isDiscounted && game.originalPrice !== null && (
              <>
                <span className="font-pixel text-[7px] text-retro-text-dim line-through">{formatPrice(game.originalPrice)}</span>
                <span className="bg-retro-green/30 text-retro-green font-pixel text-[7px] px-1">-{game.discountPercent}%</span>
              </>
            )}
          </div>

          {/* Adicionado por */}
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[7px] text-retro-text-dim uppercase tracking-wider">ADICIONADO</span>
            <span className="font-pixel text-[7px] text-retro-text">@{game.addedBy.name}</span>
          </div>

          {/* Ações expandidas */}
          <div className="flex items-center gap-2 pt-1 border-t border-retro-border">
            {moveMenu && (
              <span className="sm:hidden font-pixel text-[6px] text-retro-text-dim">☰ MOVER</span>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
                disabled={deleting}
                className="font-pixel text-[7px] text-retro-red/70 hover:text-retro-red transition-colors"
              >
                REMOVER JOGO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
