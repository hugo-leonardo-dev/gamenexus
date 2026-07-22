"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";

interface MoveData {
  status: string;
  position: number;
  groupId: string;
}

interface MoveState {
  gameId: string;
  previous: MoveData;
}

/**
 * Hook para mover jogos entre colunas com atualização otimista.
 *
 * Fluxo:
 * 1. Aplica a mudança imediatamente na UI (via callback onOptimistic)
 * 2. Dispara a requisição PATCH para a API
 * 3. Se falhar, chama onRollback para desfazer a mudança
 * 4. Se suceder, faz router.refresh() para sincronizar com o servidor
 */
export function useMoveGame() {
  const router = useRouter();
  const { addToast } = useToast();
  const pendingRef = useRef<Map<string, AbortController>>(new Map());

  const moveGame = useCallback(
    async (
      gameId: string,
      data: MoveData,
      callbacks?: {
        onOptimistic?: () => void;
        onRollback?: () => void;
      }
    ) => {
      // Cancela requisição pendente para o mesmo jogo
      const existing = pendingRef.current.get(gameId);
      if (existing) {
        existing.abort();
      }

      const controller = new AbortController();
      pendingRef.current.set(gameId, controller);

      // Aplica otimisticamente
      callbacks?.onOptimistic?.();

      try {
        const res = await fetch(`/api/games/${gameId}/move`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          signal: controller.signal,
        });

        pendingRef.current.delete(gameId);

        if (res.ok) {
          router.refresh();
        } else {
          const errorData = await res.json().catch(() => ({}));
          callbacks?.onRollback?.();
          addToast(errorData.error || "Erro ao mover jogo.", "error");
        }
      } catch (err: unknown) {
        pendingRef.current.delete(gameId);
        if (err instanceof Error && err.name === "AbortError") return;
        callbacks?.onRollback?.();
        addToast("Erro de conexão ao mover jogo.", "error");
      }
    },
    [router, addToast]
  );

  return { moveGame };
}
