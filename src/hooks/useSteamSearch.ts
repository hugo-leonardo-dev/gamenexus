"use client";

import { useEffect, useRef, useCallback, useMemo, useReducer } from "react";
import { useDebounce } from "./useDebounce";

// ─── Tipos ─────────────────────────────────────────────────────────────

export interface SearchResult {
  appId: string;
  name: string;
  imageUrl: string;
  price: string | null;
  releaseYear: string | null;
}

export type SearchStatus = "idle" | "searching" | "results" | "empty" | "rate_limited";

interface UseSteamSearchOptions {
  /** Mínimo de caracteres para disparar a busca (default: 3) */
  minLength?: number;
  /** Delay do debounce em ms (default: 500) */
  debounceMs?: number;
  /** TTL do cache em ms (default: 5 minutos) */
  cacheTTL?: number;
}

// ─── Estado + Reducer ──────────────────────────────────────────────────

interface SearchState {
  results: SearchResult[];
  status: SearchStatus;
  isFetching: boolean;
}

type SearchAction =
  | { type: "IDLE" }
  | { type: "SEARCHING" }
  | { type: "RESULTS"; results: SearchResult[] }
  | { type: "EMPTY" }
  | { type: "RATE_LIMITED" }
  | { type: "RESET" };

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "IDLE":
      return { results: [], status: "idle", isFetching: false };
    case "SEARCHING":
      return { ...state, status: "searching", isFetching: true };
    case "RESULTS":
      return { results: action.results, status: "results", isFetching: false };
    case "EMPTY":
      return { results: [], status: "empty", isFetching: false };
    case "RATE_LIMITED":
      return { ...state, status: "rate_limited", isFetching: false };
    case "RESET":
      return { results: [], status: "idle", isFetching: false };
    default:
      return state;
  }
}

const initialState: SearchState = {
  results: [],
  status: "idle",
  isFetching: false,
};

// ─── Cache local (sessão) ──────────────────────────────────────────────
const searchCache = new Map<string, { data: SearchResult[]; expiresAt: number }>();

function getCached(query: string): SearchResult[] | null {
  const entry = searchCache.get(query);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    searchCache.delete(query);
    return null;
  }
  return entry.data;
}

function setCache(query: string, data: SearchResult[], ttlMs: number) {
  searchCache.set(query, { data, expiresAt: Date.now() + ttlMs });
}

// ─── Hook ──────────────────────────────────────────────────────────────

/**
 * Hook inteligente para busca de jogos na Steam.
 *
 * Funcionalidades:
 * - Debounce de 500ms antes de disparar a requisição
 * - Mínimo de 3 caracteres
 * - Cache em memória com TTL (evita repetir buscas iguais)
 * - AbortController para cancelar requisições anteriores
 * - Prevenção de race conditions (requisições antigas não sobrescrevem as novas)
 * - Backoff automático para 429 (Too Many Requests)
 * - Loading apenas durante a requisição, não durante o debounce
 */
export function useSteamSearch({
  minLength = 3,
  debounceMs = 500,
  cacheTTL = 5 * 60 * 1000,
}: UseSteamSearchOptions = {}) {
  const [query, setQuery] = useReducer((_: string, next: string) => next, "");
  const [state, dispatch] = useReducer(searchReducer, initialState);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const backoffUntilRef = useRef(0);

  const debouncedQuery = useDebounce(query.trim(), debounceMs);
  const canSearch = debouncedQuery.length >= minLength;

  // ─── Reseta estado quando a query fica abaixo do mínimo ────────
  useEffect(() => {
    if (!canSearch && state.status !== "idle") {
      dispatch({ type: "RESET" });
    }
  }, [canSearch, state.status]);

  // ─── Busca efetiva ─────────────────────────────────────────────
  useEffect(() => {
    if (!canSearch) return;

    // Verifica backoff (429)
    if (Date.now() < backoffUntilRef.current) {
      dispatch({ type: "RATE_LIMITED" });
      return;
    }

    const normalizedQuery = debouncedQuery.toLowerCase();

    // Cache hit?
    const cached = getCached(normalizedQuery);
    if (cached) {
      dispatch(cached.length > 0 ? { type: "RESULTS", results: cached } : { type: "EMPTY" });
      return;
    }

    // Cancela requisição anterior
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    // Incrementa o requestId para race condition
    const currentRequestId = ++requestIdRef.current;

    dispatch({ type: "SEARCHING" });

    fetch(`/api/games/search?query=${encodeURIComponent(debouncedQuery)}`, { signal })
      .then(async (res) => {
        if (currentRequestId !== requestIdRef.current) return;

        if (res.status === 429) {
          backoffUntilRef.current = Date.now() + 30_000;
          dispatch({ type: "RATE_LIMITED" });
          return;
        }

        if (!res.ok) {
          dispatch({ type: "IDLE" });
          return;
        }

        const data = await res.json();
        if (currentRequestId !== requestIdRef.current) return;

        const searchResults: SearchResult[] = data.results ?? [];
        setCache(normalizedQuery, searchResults, cacheTTL);

        dispatch(
          searchResults.length > 0
            ? { type: "RESULTS", results: searchResults }
            : { type: "EMPTY" }
        );
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        if (currentRequestId !== requestIdRef.current) return;
        dispatch({ type: "IDLE" });
      });
  }, [debouncedQuery, canSearch, cacheTTL, minLength]);

  // ─── Reset manual ──────────────────────────────────────────────
  const reset = useCallback(() => {
    setQuery("");
    if (abortRef.current) {
      abortRef.current.abort();
    }
    dispatch({ type: "RESET" });
  }, []);

  // ─── Retorno ───────────────────────────────────────────────────
  const { results, status, isFetching } = state;

  return useMemo(
    () => ({
      query,
      setQuery,
      results,
      status,
      isFetching,
      hasResults: status === "results",
      isEmpty: status === "empty",
      isSearching: status === "searching",
      isRateLimited: status === "rate_limited",
      reset,
    }),
    [query, results, status, isFetching, reset]
  );
}
