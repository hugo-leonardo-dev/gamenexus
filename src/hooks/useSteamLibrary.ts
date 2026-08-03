"use client";

import { useEffect, useRef, useState } from "react";

interface UseSteamLibraryOptions {
  /** Usuário logado tem conta Steam vinculada? */
  steamLinked: boolean;
  /** ISO da última sincronização (null = nunca sincronizou). */
  lastLibrarySyncAt: string | null;
  /** Chamado após sync automática bem-sucedida (ex: router.refresh()). */
  onSynced?: () => void;
}

/**
 * Hook compartilhado de biblioteca Steam (Kanban de grupo, futuro backlog
 * pessoal, perfil). Responsabilidades:
 *
 *  - Auto-sync: se o usuário tem Steam vinculada mas NUNCA sincronizou a
 *    biblioteca, dispara a sync automaticamente uma única vez (guard com
 *    useRef evita double-fire do React StrictMode em dev).
 *  - Estados de loading/erro para a UI (nunca piscar tags erradas: enquanto
 *    sincroniza, `isSyncing` fica true e a UI pode ocultar o filtro).
 *
 * Usuários SEM Steam vinculada: o hook fica ocioso (feature não se aplica).
 */
export function useSteamLibrary({ steamLinked, lastLibrarySyncAt, onSynced }: UseSteamLibraryOptions) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  // onSynced fica em ref: o callback do chamador costuma ser uma arrow inline
  // (nova identidade a cada render). Depender dele no effect faria o cleanup
  // cancelar a própria auto-sync (spinner infinito, refresh nunca dispara).
  // A atualização do ref acontece em effect (regra react-hooks/refs).
  const onSyncedRef = useRef(onSynced);
  useEffect(() => {
    onSyncedRef.current = onSynced;
  }, [onSynced]);

  useEffect(() => {
    // Sem Steam vinculada, ou já sincronizado → nada a fazer.
    if (!steamLinked || lastLibrarySyncAt || attemptedRef.current) return;
    attemptedRef.current = true;

    let cancelled = false;
    setIsSyncing(true);

    (async () => {
      try {
        const res = await fetch("/api/steam/library/sync", { method: "POST" });
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (cancelled) return;
        if (!res.ok) {
          // Ex: perfil privado — a UI mostra o erro sem travar a página.
          setError(data?.error ?? "Não foi possível sincronizar sua biblioteca Steam.");
        } else {
          onSyncedRef.current?.();
        }
      } catch {
        if (!cancelled) setError("Erro de conexão ao sincronizar a biblioteca Steam.");
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    })();

    // O cleanup só roda no unmount (deps estáveis) — não cancela a sync.
    return () => {
      cancelled = true;
    };
  }, [steamLinked, lastLibrarySyncAt]);

  return { isSyncing, error };
}
