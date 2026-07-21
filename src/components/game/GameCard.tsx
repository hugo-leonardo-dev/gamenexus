import Image from "next/image";
import { formatPrice, type GameCardData } from "@/lib/types";

interface GameCardProps {
  game: GameCardData;
  onDelete?: () => void;
  deleting?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatPlayerCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}MI`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const STATUS_CFG: Record<string, { label: string; border: string; headerBg: string }> = {
  BACKLOG:   { label: "QUERO JOGAR",  border: "border-t-retro-primary",  headerBg: "bg-retro-primary/10" },
  PLAYING:   { label: "JOGANDO",      border: "border-t-retro-green",   headerBg: "bg-retro-green/10" },
  COMPLETED: { label: "FINALIZADO",   border: "border-t-retro-cyan",    headerBg: "bg-retro-cyan/10" },
  DROPPED:   { label: "DROPADO",      border: "border-t-retro-red",     headerBg: "bg-retro-red/10" },
};

// ─── Componente ─────────────────────────────────────────────────────────

export function GameCard({ game, onDelete, deleting }: GameCardProps) {
  const isDiscounted = game.discountPercent > 0;
  const isFree = game.currentPrice === 0;
  const statusCfg = STATUS_CFG[game.status] ?? STATUS_CFG.BACKLOG;

  // Cor do review
  const reviewColor =
    game.reviewScore === null
      ? "text-retro-text-dim"
      : game.reviewScore >= 90
        ? "text-retro-green"
        : game.reviewScore >= 70
          ? "text-retro-amber"
          : game.reviewScore >= 50
            ? "text-retro-amber"
            : "text-retro-red";

  const reviewIcon =
    game.reviewScore === null ? null : game.reviewScore >= 90 ? (
      <svg className="h-3 w-3 shrink-0 text-retro-green" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg className="h-3 w-3 shrink-0 text-retro-amber" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );

  return (
    <div
      className={`group overflow-hidden transition-all duration-200 ${
        isDiscounted
          ? "pixel-card border-l-2 border-l-retro-green"
          : "pixel-card"
      }`}
    >
      {/* ─── Capa como fundo ──────────────────────────────────── */}

      <div className={`relative aspect-[460/215] overflow-hidden border-b-2 ${isDiscounted ? 'border-retro-green/30' : 'border-retro-border'}`}>
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
          <div className="flex h-full items-center justify-center bg-retro-surface">
            <span className="font-pixel text-[20px] text-retro-text-dim">?</span>
          </div>
        )}

        {/* Overlay escuro gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-retro-bg/90 via-retro-bg/30 to-transparent" />

        {/* Canto superior esquerdo: Status badge */}
        <div className={`absolute left-2 top-2 z-10 ${statusCfg.headerBg} pixel-border-sm px-2 py-1`}>
          <span className="font-pixel text-[8px] text-retro-text uppercase tracking-wider">
            {statusCfg.label}
          </span>
        </div>

        {/* Canto superior direito: Badge de desconto */}
        {isDiscounted && (
          <div className="absolute right-2 top-2 z-10 bg-retro-green pixel-border-sm px-2 py-1">
            <span className="font-pixel text-[8px] text-black font-bold">
              -{game.discountPercent}%
            </span>
          </div>
        )}

        {/* Título centralizado na parte inferior da capa */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-3">
          <h3 className="font-pixel text-[9px] leading-relaxed text-retro-text text-center">
            {game.title}
          </h3>
        </div>
      </div>

      {/* ─── Linha de métricas ────────────────────────────────── */}

      <div className="flex items-center gap-3 border-b-2 border-retro-border px-3 py-1.5">
        {/* Review */}
        {game.reviewScore !== null && (
          <div className="flex items-center gap-1 min-w-0">
            {reviewIcon}
            <span className={`font-pixel text-[7px] leading-none ${reviewColor}`}>
              {game.reviewScore}%
            </span>
          </div>
        )}

        {/* Jogadores */}
        {game.currentPlayers !== null && game.currentPlayers > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            <svg className="h-3 w-3 shrink-0 text-retro-text-dim" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            <span className="font-pixel text-[7px] text-retro-text-dim leading-none">
              {formatPlayerCount(game.currentPlayers)} AGORA
            </span>
          </div>
        )}

        {/* Pico 24h */}
        {game.peak24h !== null && game.peak24h > 0 && (
          <span className="font-pixel text-[6px] text-retro-text-dim leading-none">
            | PICO {formatPlayerCount(game.peak24h)}
          </span>
        )}
      </div>

      {/* ─── Footer: Preço + Adicionado por + Lixeira ─────────── */}

      <div className="flex items-center gap-2 px-3 py-2">
        {/* Preço */}
        <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
          {game.currentPrice !== null && (
            <span className={`font-pixel text-[10px] leading-none ${
              isDiscounted ? "text-retro-green" : isFree ? "text-retro-green" : "text-retro-text"
            }`}>
              {isFree ? "GRÁTIS" : formatPrice(game.currentPrice)}
            </span>
          )}
          {isDiscounted && game.originalPrice !== null && (
            <span className="font-pixel text-[7px] text-retro-text-dim line-through leading-none">
              {formatPrice(game.originalPrice)}
            </span>
          )}
        </div>

        {/* Adicionado por */}
        <span className="hidden sm:block font-pixel text-[6px] text-retro-text-dim max-w-[120px] truncate leading-none">
          @{game.addedBy.name}
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
            className="shrink-0 flex items-center justify-center h-6 w-6 text-retro-text-dim transition-colors hover:bg-retro-red/20 hover:text-retro-red disabled:opacity-50"
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
  );
}
