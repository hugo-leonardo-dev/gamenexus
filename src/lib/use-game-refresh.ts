"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";

/**
 * Hook customizado que gerencia o refresh automático da página
 * após operações de adicionar/mover/remover jogos.
 *
 * Usa `useTransition` do React para não bloquear a UI durante o refresh.
 * Já integra toast de feedback visual.
 */
export function useGameRefresh() {
  const router = useRouter();
  const { addToast } = useToast();
  const [isRefreshing, startTransition] = useTransition();

  const refresh = useCallback(
    (message?: string) => {
      startTransition(() => {
        router.refresh();
      });
      if (message) {
        addToast(message, "success");
      }
    },
    [router, addToast]
  );

  const refreshWithError = useCallback(
    (errorMessage: string) => {
      addToast(errorMessage, "error");
    },
    [addToast]
  );

  /**
   * Faz uma requisição PATCH para mover um jogo e já atualiza a página.
   */
  const moveGame = useCallback(
    async (
      gameId: string,
      data: { status: string; position: number; groupId: string }
    ) => {
      try {
        const res = await fetch(`/api/games/${gameId}/move`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          refresh();
        } else {
          const errorData = await res.json();
          refreshWithError(errorData.error || "Erro ao mover jogo");
        }
      } catch {
        refreshWithError("Erro de conexão ao mover jogo.");
      }
    },
    [refresh, refreshWithError]
  );

  return {
    refresh,
    moveGame,
    isRefreshing,
  };
}
