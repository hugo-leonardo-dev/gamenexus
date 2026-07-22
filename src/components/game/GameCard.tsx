"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { formatPrice, type GameCardData } from "@/lib/types";

interface GameCardProps {
  game: GameCardData;
  onDelete?: () => void;
  deleting?: boolean;
  moveMenu?: React.ReactNode;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatPlayerCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}MI`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const STATUS_CFG: Record<string, { label: string; dot: string }> = {
  BACKLOG:   { label: "Quero Jogar", dot: "bg-zinc-500" },
  PLAYING:   { label: "Jogando",     dot: "bg-retro-green" },
  PAUSED:    { label: "Pausado",     dot: "bg-retro-amber" },
  COMPLETED: { label: "Finalizado",  dot: "bg-retro-cyan" },
  DROPPED:   { label: "Dropado",     dot: "bg-retro-red" },
};

// ─── Badges ──────────────────────────────────────────────────────────────

function ReviewBadge({ score }: { score: number | null }) {
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

function PriceBadge({ game }: { game: GameCardData }) {
  const isDiscounted = game.discountPercent > 0;
  const isFree = game.currentPrice === 0;
  if (game.currentPrice === null) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={`font-pixel text-[9px] leading-none ${isDiscounted || isFree ? "text-retro-green" : "text-retro-text"}`}>
        {isFree ? "GRÁTIS" : formatPrice(game.currentPrice)}
      </span>
      {isDiscounted && game.originalPrice !== null && (
        <>
          <span className="font-pixel text-[7px] text-retro-text-dim line-through">
            {formatPrice(game.originalPrice)}
          </span>
          <span className="inline-flex items-center rounded-md bg-retro-green/15 px-1.5 py-0.5 font-pixel text-[7px] text-retro-green leading-none">
            -{game.discountPercent}%
          </span>
        </>
      )}
    </div>
  );
}

export function GameCard({ game, onDelete, deleting, moveMenu, expanded, onToggleExpand }: GameCardProps) {
  const isDiscounted = game.discountPercent > 0;
  const isFree = game.currentPrice === 0;
  const statusCfg = STATUS_CFG[game.status] ?? STATUS_CFG.BACKLOG;
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleClick = useCallback(() => {
    onToggleExpand?.();
  }, [onToggleExpand]);

  return (
    <div
      className={`group/card rounded-xl border border-retro-border/30 bg-retro-card-bg/80 backdrop-blur-sm transition-all duration-200 ${
        isDiscounted ? "ring-1 ring-retro-green/25" : ""
      } ${
        expanded
          ? "shadow-lg shadow-retro-primary/15 ring-1 ring-retro-primary/25"
          : "hover:border-retro-border/50 hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {/* ─── CAPA DO JOGO ───────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-t-xl bg-retro-surface" onClick={handleClick}>
        {/* Status badge na capa */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-md bg-black/60 backdrop-blur-sm px-2 py-1">
          <span className={`h-2 w-2 rounded-full ${statusCfg.dot}`} />
          <span className="font-pixel text-[6px] text-white/90 uppercase tracking-wider">{statusCfg.label}</span>
        </div>

        {/* Discount badge grande */}
        {isDiscounted && (
          <div className="absolute bottom-2 left-2 z-10 rounded-md bg-retro-green/90 backdrop-blur-sm px-2 py-1">
            <span className="font-pixel text-[8px] text-black font-bold">-{game.discountPercent}%</span>
          </div>
        )}

        {/* Imagem */}
        <div className="aspect-[4/3] sm:aspect-[460/215] overflow-hidden">
          {game.imageUrl ? (
            <Image
              src={game.imageUrl}
              alt={game.title}
              width={460}
              height={215}
              className={`h-full w-full object-cover transition-all duration-500 group-hover/card:scale-105 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-pixel text-sm text-retro-text-dim">
              ?
            </div>
          )}

          {/* Skeleton enquanto carrega */}
          {!imageLoaded && game.imageUrl && (
            <div className="absolute inset-0 animate-pulse bg-retro-surface" />
          )}
        </div>
      </div>

      {/* ─── INFORMAÇÕES DO CARD ────────────────────────────────── */}
      <div
        className="p-3 sm:p-3.5 cursor-pointer select-none"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      >
        {/* Título */}
        <h3 className="font-pixel text-[9px] sm:text-[10px] text-retro-text leading-snug mb-1.5 sm:mb-2 line-clamp-2">
          {game.title}
        </h3>

        {/* Preço + badges */}
        <div className="flex items-center gap-2 flex-wrap mb-1.5 sm:mb-2">
          <PriceBadge game={game} />
          <div className="flex items-center gap-1.5">
            <ReviewBadge score={game.reviewScore} />
            <PlayersBadge count={game.currentPlayers} />
          </div>
        </div>

        {/* Adicionado por + lixeira (web) */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="font-pixel text-[6px] text-retro-text-dim/60 uppercase tracking-wider">
            Por
          </span>
          <span className="font-pixel text-[7px] text-retro-text-dim">
            {game.addedBy.name}
          </span>
          {/* Lixeira no web: inline, vermelha */}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
              disabled={deleting}
              className="hidden sm:flex items-center justify-center ml-auto h-6 w-6 rounded text-retro-red/60 transition-all hover:text-retro-red disabled:opacity-40"
              title="Remover jogo"
              aria-label={`Remover ${game.title}`}
            >
              {deleting ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Ações - mobile apenas */}
        <div className="flex items-center pt-2 border-t border-retro-border/10 sm:hidden">
          <div className="relative">
            {moveMenu}
          </div>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
              disabled={deleting}
              className="flex items-center justify-center ml-auto h-7 w-7 rounded-md text-retro-red/60 transition-all hover:text-retro-red hover:bg-retro-red/15 disabled:opacity-40"
              title="Remover jogo"
              aria-label={`Remover ${game.title}`}
            >
              {deleting ? (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ─── CONTEÚDO EXPANDIDO ────────────────────────────────── */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-retro-border/20 px-3.5 py-3 space-y-2.5">
          {/* Review completo */}
          {game.reviewSummary && (
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[7px] text-retro-text-dim uppercase tracking-wider shrink-0">Review</span>
              <span className="font-pixel text-[8px] text-retro-text">
                {game.reviewSummary}
                {game.reviewScore !== null && <span className="ml-1 text-retro-text-dim">({game.reviewScore}%)</span>}
              </span>
            </div>
          )}

          {/* Jogadores */}
          {game.currentPlayers !== null && game.currentPlayers > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[7px] text-retro-text-dim uppercase tracking-wider shrink-0">Jogadores</span>
              <span className="font-pixel text-[8px] text-retro-text">
                {formatPlayerCount(game.currentPlayers)} agora
                {game.peak24h !== null && game.peak24h > 0 && (
                  <span className="ml-2 text-retro-text-dim">Pico: {formatPlayerCount(game.peak24h)}</span>
                )}
              </span>
            </div>
          )}

          {/* Preços detalhados */}
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[7px] text-retro-text-dim uppercase tracking-wider shrink-0">Preço</span>
            <span className="font-pixel text-[9px] text-retro-text">
              {isFree ? "GRÁTIS" : formatPrice(game.currentPrice)}
            </span>
            {isDiscounted && game.originalPrice !== null && (
              <>
                <span className="font-pixel text-[7px] text-retro-text-dim line-through">{formatPrice(game.originalPrice)}</span>
                <span className="bg-retro-green/20 text-retro-green font-pixel text-[7px] px-1 leading-tight rounded">-{game.discountPercent}%</span>
              </>
            )}
          </div>


        </div>
      </div>
    </div>
  );
}
