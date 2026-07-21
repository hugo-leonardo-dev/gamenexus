// ─── Jogos ───────────────────────────────────────────────────────────────
export type GameStatus = "BACKLOG" | "PLAYING" | "COMPLETED" | "DROPPED";

export const VALID_STATUSES: GameStatus[] = ["BACKLOG", "PLAYING", "COMPLETED", "DROPPED"];

export const STATUS_LABELS: Record<GameStatus, string> = {
  BACKLOG: "Quero Jogar",
  PLAYING: "Jogando Agora",
  COMPLETED: "Finalizados",
  DROPPED: "Dropados",
};

export const STATUS_COLORS: Record<GameStatus, string> = {
  BACKLOG: "bg-zinc-800 text-zinc-300",
  PLAYING: "bg-emerald-600/20 text-emerald-400",
  COMPLETED: "bg-blue-600/20 text-blue-400",
  DROPPED: "bg-red-600/20 text-red-400",
};

// ─── Membros ─────────────────────────────────────────────────────────────
export type MemberRole = "OWNER" | "MEMBER";

// ─── Game Card Data (o que vem da API) ──────────────────────────────────
export interface GameCardData {
  id: string;
  title: string;
  imageUrl: string;
  originalPrice: number | null;
  currentPrice: number | null;
  discountPercent: number;
  status: string;
  position: number;
  reviewScore: number | null;
  reviewSummary: string | null;
  currentPlayers: number | null;
  peak24h: number | null;
  addedBy: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

// ─── Member Data ─────────────────────────────────────────────────────────
export interface MemberData {
  id: string;
  role: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

// ─── Preços ──────────────────────────────────────────────────────────────
export function formatPrice(cents: number | null): string {
  if (cents === null) return "—";
  if (cents === 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

// ─── Validações ──────────────────────────────────────────────────────────
export const VALIDATIONS = {
  groupName: { min: 1, max: 50 },
  userName: { min: 2, max: 100 },
  password: { min: 6, max: 128 },
  inviteCode: { max: 10 },
  steamUrl: { max: 500 },
} as const;

// ─── Colunas do Kanban ──────────────────────────────────────────────────
export const KANBAN_COLUMNS = [
  {
    key: "BACKLOG" as GameStatus,
    title: "Quero Jogar",
    borderColor: "border-t-zinc-600",
    headerBg: "bg-zinc-800/50",
    dotColor: "bg-zinc-500",
  },
  {
    key: "PLAYING" as GameStatus,
    title: "Jogando Agora",
    borderColor: "border-t-emerald-600",
    headerBg: "bg-emerald-900/20",
    dotColor: "bg-emerald-500",
  },
  {
    key: "COMPLETED" as GameStatus,
    title: "Finalizados",
    borderColor: "border-t-blue-600",
    headerBg: "bg-blue-900/20",
    dotColor: "bg-blue-500",
  },
  {
    key: "DROPPED" as GameStatus,
    title: "Dropados",
    borderColor: "border-t-red-600",
    headerBg: "bg-red-900/20",
    dotColor: "bg-red-500",
  },
] as const;
