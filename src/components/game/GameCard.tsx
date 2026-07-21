import Image from "next/image";
import { formatPrice, type GameCardData } from "@/lib/types";

interface GameCardProps {
  game: GameCardData;
  onDelete?: () => void;
  deleting?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatPlayerCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}mi`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  BACKLOG:   { label: "Quero Jogar",    bg: "bg-zinc-900/80",    text: "text-zinc-300" },
  PLAYING:   { label: "Jogando Agora",  bg: "bg-emerald-900/80", text: "text-emerald-300" },
  COMPLETED: { label: "Finalizado",     bg: "bg-blue-900/80",    text: "text-blue-300" },
  DROPPED:   { label: "Dropado",        bg: "bg-red-900/80",     text: "text-red-300" },
};

// ─── Componente ─────────────────────────────────────────────────────────

export function GameCard({ game, onDelete, deleting }: GameCardProps) {
  const isDiscounted = game.discountPercent > 0;
  const isFree = game.currentPrice === 0;
  const statusCfg = STATUS_CFG[game.status] ?? STATUS_CFG.BACKLOG;

  // Cor do review
  const reviewColor =
    game.reviewScore === null
      ? "text-zinc-500"
      : game.reviewScore >= 90
        ? "text-emerald-400"
        : game.reviewScore >= 70
          ? "text-green-400"
          : game.reviewScore >= 50
            ? "text-yellow-400"
            : "text-red-400";

  const reviewIcon =
    game.reviewScore === null ? null : game.reviewScore >= 90 ? (
      <svg className="h-3.5 w-3.5 shrink-0 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
    ) : game.reviewScore >= 50 ? (
      <svg className="h-3.5 w-3.5 shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ) : (
      <svg className="h-3.5 w-3.5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );

  return (
    <div
      className={`group overflow-hidden rounded-xl border transition-all duration-200 hover:shadow-xl hover:shadow-black/30 ${
        isDiscounted
          ? "border-emerald-700/50 bg-emerald-950/15"
          : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      {/* ─── Capa como fundo ──────────────────────────────────── */}

      <div className="relative aspect-[460/215] overflow-hidden bg-zinc-800">
        {/* Imagem de fundo */}
        {game.imageUrl ? (
          <Image
            src={game.imageUrl}
            alt={game.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg className="h-10 w-10 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        )}

        {/* Overlay escuro gradiente de baixo pra cima */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Canto superior esquerdo: Status */}
        <span className={`absolute left-2.5 top-2.5 z-10 rounded-md px-2 py-0.5 text-[11px] font-medium shadow-sm backdrop-blur-sm ${statusCfg.bg} ${statusCfg.text}`}>
          {statusCfg.label}
        </span>

        {/* Canto superior direito: Badge de desconto */}
        {isDiscounted && (
          <span className="absolute right-2.5 top-2.5 z-10 rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-lg">
            -{game.discountPercent}%
          </span>
        )}

        {/* Título centralizado na parte inferior da capa */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-3 text-center">
          <h3 className="text-sm font-bold leading-tight text-white drop-shadow-lg [text-shadow:_0_1px_4px_rgb(0_0_0_/_60%)]">
            {game.title}
          </h3>
        </div>
      </div>

      {/* ─── Linha de métricas ────────────────────────────────── */}

      <div className="flex items-center gap-3 border-b border-zinc-800/60 px-3.5 py-2">
        {/* Review */}
        {game.reviewScore !== null && (
          <div className="flex items-center gap-1 min-w-0">
            {reviewIcon}
            <span className={`shrink-0 text-[11px] font-medium leading-none ${reviewColor}`}>
              {game.reviewScore}%
            </span>
          </div>
        )}

        {/* Jogadores */}
        {game.currentPlayers !== null && game.currentPlayers > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            <svg className="h-3 w-3 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            <span className="text-[11px] text-zinc-400 leading-none">
              {formatPlayerCount(game.currentPlayers)} agora
            </span>
          </div>
        )}

        {/* Pico 24h */}
        {game.peak24h !== null && game.peak24h > 0 && (
          <span className="text-[10px] text-zinc-600 leading-none">
            · pico {formatPlayerCount(game.peak24h)}
          </span>
        )}
      </div>

      {/* ─── Footer: Preço + Adicionado por + Lixeira ─────────── */}

      <div className="flex items-center gap-2 px-3.5 py-2.5">
        {/* Preço */}
        <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
          {game.currentPrice !== null && (
            <span className={`text-base font-bold leading-none ${
              isDiscounted ? "text-emerald-400" : isFree ? "text-emerald-400" : "text-white"
            }`}>
              {isFree ? "Grátis" : formatPrice(game.currentPrice)}
            </span>
          )}
          {isDiscounted && game.originalPrice !== null && (
            <span className="text-[11px] text-zinc-500 line-through leading-none">
              {formatPrice(game.originalPrice)}
            </span>
          )}
        </div>

        {/* Adicionado por */}
        <span className="hidden sm:block truncate text-[11px] text-zinc-600 leading-none max-w-[120px]">
          Adicionado por @{game.addedBy.name}
        </span>

        {/* Botão lixeira */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDelete();
            }}
            disabled={deleting}
            className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg text-zinc-600 transition-colors hover:bg-red-950/30 hover:text-red-400 disabled:opacity-50"
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
  );
}
