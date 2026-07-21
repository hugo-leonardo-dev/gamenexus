"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";

interface SearchResult {
  appId: string;
  name: string;
  imageUrl: string;
  price: string | null;
  releaseYear: string | null;
}

interface GameSearchInputProps {
  groupId: string;
}

// ─── Hook de debounce ─────────────────────────────────────────────────
function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function GameSearchInput({ groupId }: GameSearchInputProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [addingAppId, setAddingAppId] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "results" | "empty">("idle");

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const debouncedQuery = useDebounce(inputValue.trim(), 300);

  // ─── Detectar se é link da Steam ──────────────────────────────────
  // Usamos useMemo para evitar criar novo objeto RegExpMatchArray a cada render
  const extractedAppId = useMemo(() => {
    const match = inputValue.trim().match(/\/app\/(\d+)/i);
    return match ? match[1] : null;
  }, [inputValue]);

  const hasSteamLink = extractedAppId !== null;

  // ─── Fazer busca quando o debounce atualizar ──────────────────────
  useEffect(() => {
    if (debouncedQuery.length < 2 || hasSteamLink) {
      setSearchResults([]);
      setShowDropdown(false);
      setSearchStatus("idle");
      return;
    }

    setSearchStatus("searching");
    let cancelled = false;

    // Cancela requisição anterior
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setLoading(true);

    fetch(`/api/games/search?query=${encodeURIComponent(debouncedQuery)}`, {
      signal: abortRef.current.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const results = data.results ?? [];
        setSearchResults(results);
        setShowDropdown(true); // sempre mostra o dropdown (resultados ou "nada")
        setSearchStatus(results.length === 0 ? "empty" : "results");
        setSelectedIndex(-1);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        if (cancelled) return;
        setSearchStatus("idle");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, hasSteamLink]);

  // ─── Fechar dropdown ao clicar fora ───────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Adicionar jogo via appId (do autocomplete) ───────────────────
  const addGameByAppId = useCallback(
    async (appId: string) => {
      setAddingAppId(appId);
      setShowDropdown(false);

      try {
        const res = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steamUrl: `https://store.steampowered.com/app/${appId}`, groupId }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 409) {
            addToast("Este jogo já está no GameNexus!", "info");
          } else {
            addToast(data.error || "Erro ao adicionar jogo", "error");
          }
          return;
        }

        setInputValue("");
        setSearchResults([]);
        addToast(`${data.game.title} adicionado ao GameNexus!`, "success");
        router.refresh();
        inputRef.current?.focus();
      } catch {
        addToast("Erro de conexão. Tente novamente.", "error");
      } finally {
        setAddingAppId(null);
      }
    },
    [groupId, router, addToast]
  );

  // ─── Adicionar jogo via link da Steam ─────────────────────────────
  const addGameByLink = useCallback(
    async (url: string) => {
      setLoading(true);

      try {
        const res = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steamUrl: url, groupId }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 409) {
            addToast("Este jogo já está no GameNexus!", "info");
          } else {
            addToast(data.error || "Erro ao adicionar jogo", "error");
          }
          return;
        }

        setInputValue("");
        addToast(`${data.game.title} adicionado ao GameNexus!`, "success");
        router.refresh();
        inputRef.current?.focus();
      } catch {
        addToast("Erro de conexão. Tente novamente.", "error");
      } finally {
        setLoading(false);
      }
    },
    [groupId, router, addToast]
  );

  // ─── Submit: link ou busca ────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Se tem seleção no dropdown, usa ela
    if (selectedIndex >= 0 && searchResults[selectedIndex]) {
      addGameByAppId(searchResults[selectedIndex].appId);
      return;
    }

    // Se parece link, usa link
    if (extractedAppId) {
      addGameByLink(inputValue.trim());
      return;
    }

    // Se existe exatamente 1 resultado no dropdown, usa ele
    if (searchResults.length === 1) {
      addGameByAppId(searchResults[0].appId);
      return;
    }

    // Fallback: tenta como link mesmo sem match de regex
    if (inputValue.trim().includes("store.steampowered.com")) {
      addGameByLink(inputValue.trim());
      return;
    }

    addToast(
      "Digite um link da Steam ou selecione um jogo da lista de resultados.",
      "info"
    );
  }

  // ─── Teclado no dropdown ──────────────────────────────────────────
  function handleKeyDown(e: KeyboardEvent) {
    if (!showDropdown || searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : searchResults.length - 1
      );
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setSelectedIndex(-1);
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      addGameByAppId(searchResults[selectedIndex].appId);
    }
  }

  // ─── Placeholder dinâmico ─────────────────────────────────────────
  const placeholder = extractedAppId
    ? `Link detectado: store.steampowered.com/app/${extractedAppId}`
    : "Busque por nome ou cole um link da Steam...";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        {/* Ícone de busca ou link */}
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
          {hasSteamLink ? (
            <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.136-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364L4.5 10.25" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchResults.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          className="retro-input w-full py-3 pl-10 pr-4 text-sm"
          aria-label="Buscar jogo por nome ou colar link da Steam"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          autoComplete="off"
          role="combobox"
        />

        {/* Loading spinner */}
        {loading && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg className="h-4 w-4 animate-spin text-zinc-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* Dropdown de resultados */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden pixel-card border-2 border-retro-border animate-float-up"
            role="listbox"
          >
            {searchStatus === "empty" && (
              <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                <svg className="h-8 w-8 text-zinc-700" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <p className="text-sm text-zinc-500">
                  Nenhum jogo encontrado para &ldquo;{debouncedQuery}&rdquo;
                </p>
                <p className="text-xs text-zinc-600">
                  Tente buscar em inglês ou usar palavras-chave diferentes.
                </p>
              </div>
            )}
            {searchResults.length > 0 && (
              <>
                {searchResults.map((result, index) => {
                  const isSelected = index === selectedIndex;
                  const isAdding = addingAppId === result.appId;

                  return (
                    <button
                      key={result.appId}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => addGameByAppId(result.appId)}
                      disabled={isAdding}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-retro-primary/20 text-retro-text"
                          : "text-retro-text-dim hover:bg-retro-surface-hover"
                      } ${isAdding ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {/* Capa pequena */}
                      <div className="shrink-0 h-10 w-[46px] overflow-hidden bg-retro-surface pixel-border-sm">
                        {result.imageUrl ? (
                          <img
                            src={result.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">
                            ?
                          </div>
                        )}
                      </div>

                      {/* Informações */}
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-pixel text-[8px] leading-tight text-retro-text">
                          {result.name}
                        </p>
                        <p className="mt-0.5 font-pixel text-[7px] text-retro-text-dim">
                          {result.releaseYear && (
                            <span className="mr-2">{result.releaseYear}</span>
                          )}
                          {result.price && (
                            <span className={result.price === "Grátis" ? "text-retro-green" : "text-retro-text-dim"}>
                              {result.price}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* App ID */}
                      <span className="shrink-0 font-pixel text-[6px] text-retro-text-dim">
                        #{result.appId}
                      </span>

                      {/* Spinner de adicionando */}
                      {isAdding && (
                        <svg className="h-4 w-4 animate-spin text-retro-primary shrink-0" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                    </button>
                  );
                })}

                {/* Footer do dropdown */}
                <div className="border-t-2 border-retro-border px-3 py-1.5 font-pixel text-[6px] text-retro-text-dim text-center">
                  {searchResults.length >= 8
                    ? "▼ MOSTRANDO ATÉ 8 RESULTADOS. SEJA MAIS ESPECÍFICO. ▼"
                    : `▸ ${searchResults.length} RESULTADO${searchResults.length !== 1 ? "S" : ""} ◂`}
                </div>
              </>
            )}
          </div>
        )}

        {/* Indicador de link detectado */}
        {extractedAppId && (
          <div className="absolute -bottom-5 left-0 flex items-center gap-1">
            <span className="pixel-badge bg-retro-primary/20 text-retro-primary pixel-border-sm">
              LINK DETECTADO
            </span>
            <span className="font-pixel text-[7px] text-retro-text-dim">
              PRESSIONE ENTER PARA ADICIONAR
            </span>
          </div>
        )}
      </div>

      {/* Botão de submit */}
      <button
        type="submit"
        disabled={loading || !inputValue.trim()}
        className="pixel-btn flex items-center justify-center gap-2 bg-retro-primary px-5 py-3 text-[9px] text-white disabled:opacity-40 sm:w-auto"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Adicionando...</span>
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>{extractedAppId ? "Adicionar" : "Buscar"}</span>
          </>
        )}
      </button>
    </form>
  );
}
