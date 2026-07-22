"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useReducer,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { useSteamSearch } from "@/hooks/useSteamSearch";

interface GameSearchInputProps {
  groupId: string;
}

// ─── Reducer para dropdown visibility ─────────────────────────────────

function dropdownReducer(state: boolean, action: "SHOW" | "HIDE"): boolean {
  switch (action) {
    case "SHOW": return true;
    case "HIDE": return false;
    default: return state;
  }
}

// ─── Componente ───────────────────────────────────────────────────────

export function GameSearchInput({ groupId }: GameSearchInputProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const {
    query,
    setQuery,
    results: searchResults,
    isFetching,
    hasResults,
    isEmpty,
    isRateLimited,
    reset,
  } = useSteamSearch({
    minLength: 3,
    debounceMs: 500,
  });

  const [showDropdown, dispatchDropdown] = useReducer(dropdownReducer, false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [addingAppId, setAddingAppId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detecta link da Steam
  const extractedAppId = (() => {
    const match = query.trim().match(/\/app\/(\d+)/i);
    return match ? match[1] : null;
  })();

  const hasSteamLink = extractedAppId !== null;

  // Abre dropdown quando chegam resultados
  useEffect(() => {
    dispatchDropdown(hasResults || isEmpty || isRateLimited ? "SHOW" : "HIDE");
  }, [hasResults, isEmpty, isRateLimited]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        dispatchDropdown("HIDE");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Adicionar jogo via appId (do autocomplete)
  const addGameByAppId = useCallback(
    async (appId: string) => {
      setAddingAppId(appId);
      dispatchDropdown("HIDE");

      try {
        const body: Record<string, string> = {
          steamUrl: `https://store.steampowered.com/app/${appId}`,
          groupId,
        };

        const res = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 409) {
            addToast("Este jogo já está neste grupo!", "info");
          } else {
            addToast(data.error || "Erro ao adicionar jogo", "error");
          }
          return;
        }

        reset();
        addToast(`${data.game.title} adicionado ao grupo!`, "success");
        router.refresh();
        inputRef.current?.focus();
      } catch {
        addToast("Erro de conexão. Tente novamente.", "error");
      } finally {
        setAddingAppId(null);
      }
    },
    [groupId, router, addToast, reset]
  );

  // Adicionar jogo via link da Steam
  const addGameByLink = useCallback(
    async (url: string) => {
      try {
        const body: Record<string, string> = { steamUrl: url, groupId };

        const res = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 409) {
            addToast("Este jogo já está neste grupo!", "info");
          } else {
            addToast(data.error || "Erro ao adicionar jogo", "error");
          }
          return;
        }

        reset();
        addToast(`${data.game.title} adicionado ao grupo!`, "success");
        router.refresh();
        inputRef.current?.focus();
      } catch {
        addToast("Erro de conexão. Tente novamente.", "error");
      }
    },
    [groupId, router, addToast, reset]
  );

  // Submit: link ou busca
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    if (selectedIndex >= 0 && searchResults[selectedIndex]) {
      addGameByAppId(searchResults[selectedIndex].appId);
      return;
    }

    if (extractedAppId) {
      addGameByLink(query.trim());
      return;
    }

    if (searchResults.length === 1) {
      addGameByAppId(searchResults[0].appId);
      return;
    }

    if (query.trim().includes("store.steampowered.com")) {
      addGameByLink(query.trim());
      return;
    }

    addToast(
      "Digite um link da Steam ou selecione um jogo da lista de resultados.",
      "info"
    );
  }

  // Teclado no dropdown
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
      dispatchDropdown("HIDE");
      setSelectedIndex(-1);
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      addGameByAppId(searchResults[selectedIndex].appId);
    }
  }

  const placeholder = extractedAppId
    ? `Link detectado: store.steampowered.com/app/${extractedAppId}`
    : "Busque por nome ou cole um link da Steam...";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        {/* Ícone */}
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
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchResults.length > 0) dispatchDropdown("SHOW");
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
        {isFetching && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg className="h-4 w-4 animate-spin text-zinc-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* Dropdown */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden pixel-card border-2 border-retro-border animate-float-up"
            role="listbox"
          >
            {isRateLimited && (
              <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                <svg className="h-8 w-8 text-retro-red/60" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <p className="font-pixel text-[8px] text-retro-red">MUITAS REQUISIÇÕES</p>
                <p className="font-pixel text-[7px] text-retro-text-dim">
                  A Steam temporariamente bloqueou novas buscas. Aguarde 30 segundos e tente novamente.
                </p>
              </div>
            )}

            {isEmpty && !isRateLimited && (
              <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                <svg className="h-8 w-8 text-zinc-700" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <p className="text-sm text-zinc-500">Nenhum jogo encontrado para &ldquo;{query}&rdquo;</p>
                <p className="font-pixel text-[7px] text-retro-text-dim">
                  Tente buscar em inglês ou usar palavras-chave diferentes.
                </p>
              </div>
            )}

            {hasResults && searchResults.map((result, index) => {
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
                  <div className="shrink-0 h-10 w-[46px] overflow-hidden bg-retro-surface pixel-border-sm">
                    {result.imageUrl ? (
                      <img
                        src={result.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">?</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate font-pixel text-[8px] leading-tight text-retro-text">{result.name}</p>
                    <p className="mt-0.5 font-pixel text-[7px] text-retro-text-dim">
                      {result.releaseYear && <span className="mr-2">{result.releaseYear}</span>}
                      {result.price && (
                        <span className={result.price === "Grátis" ? "text-retro-green" : "text-retro-text-dim"}>
                          {result.price}
                        </span>
                      )}
                    </p>
                  </div>

                  <span className="shrink-0 font-pixel text-[6px] text-retro-text-dim">#{result.appId}</span>

                  {isAdding && (
                    <svg className="h-4 w-4 animate-spin text-retro-primary shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </button>
              );
            })}

            {hasResults && (
              <div className="border-t-2 border-retro-border px-3 py-1.5 font-pixel text-[6px] text-retro-text-dim text-center">
                {searchResults.length >= 8
                  ? "▼ MOSTRANDO ATÉ 8 RESULTADOS. SEJA MAIS ESPECÍFICO. ▼"
                  : `▸ ${searchResults.length} RESULTADO${searchResults.length !== 1 ? "S" : ""} ◂`}
              </div>
            )}
          </div>
        )}

        {extractedAppId && (
          <div className="absolute -bottom-5 left-0 flex items-center gap-1">
            <span className="pixel-badge bg-retro-primary/20 text-retro-primary pixel-border-sm">LINK DETECTADO</span>
            <span className="font-pixel text-[7px] text-retro-text-dim">PRESSIONE ENTER PARA ADICIONAR</span>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isFetching || !query.trim()}
        className="pixel-btn flex items-center justify-center gap-2 bg-retro-primary px-5 py-3 text-[9px] text-white disabled:opacity-40 sm:w-auto"
      >
        {addingAppId ? (
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
