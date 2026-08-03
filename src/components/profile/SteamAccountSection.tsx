"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/ui/ToastProvider";
import { SteamIcon } from "@/components/SteamLoginButton";

interface SteamAccountSectionProps {
  steamId: string | null;
  steamName: string | null;
  steamAvatarUrl: string | null;
  steamLinkedAt: string | null;
  /** Número de jogos na biblioteca (null = nunca sincronizou). */
  libraryOwnedCount: number | null;
  /** ISO da última sincronização (null = nunca sincronizou). */
  libraryLastSyncAt: string | null;
}

/**
 * Seção "Contas Conectadas" do perfil.
 *
 * - Sem Steam vinculada: botão "CONECTAR COM STEAM" (redireciona para
 *   /api/steam/link, que inicia o OpenID 2.0). Estado de loading evita
 *   múltiplos fluxos simultâneos.
 * - Com Steam vinculada: avatar + nome + data do vínculo + "DESCONECTAR"
 *   (modal de confirmação — ação destrutiva).
 */
export function SteamAccountSection({
  steamId,
  steamName,
  steamAvatarUrl,
  steamLinkedAt,
  libraryOwnedCount,
  libraryLastSyncAt,
}: SteamAccountSectionProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isLinked = Boolean(steamId);

  async function handleSync() {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/steam/library/sync", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (res.ok) {
        addToast("Biblioteca Steam sincronizada!", "success");
        router.refresh();
      } else {
        // Mensagens específicas (perfil privado, sem Steam, rate limit...)
        addToast(data?.error || "Erro ao sincronizar biblioteca.", "error");
      }
    } catch {
      addToast("Erro de conexão. Tente novamente.", "error");
    } finally {
      setIsSyncing(false);
    }
  }

  function handleConnect() {
    if (isConnecting) return;
    setIsConnecting(true);
    // Redirect para o fluxo OpenID — a sessão atual é mantida e vinculada
    window.location.assign("/api/steam/link");
  }

  async function handleUnlink() {
    setIsUnlinking(true);
    try {
      const res = await fetch("/api/steam/link", { method: "DELETE" });
      if (res.ok) {
        addToast("Conta Steam desvinculada.", "success");
        setConfirmOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        addToast(data.error || "Erro ao desvincular.", "error");
      }
    } catch {
      addToast("Erro de conexão. Tente novamente.", "error");
    } finally {
      setIsUnlinking(false);
    }
  }

  const linkedDate = steamLinkedAt
    ? new Date(steamLinkedAt).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const librarySyncedDate = libraryLastSyncAt
    ? new Date(libraryLastSyncAt).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <span className="font-pixel text-[8px] text-retro-text-dim uppercase tracking-wider">
          ✦ CONTAS CONECTADAS
        </span>
        <div className="h-px flex-1 bg-retro-border" />
      </div>

      <div className="rounded-lg bg-retro-surface px-4 py-4">
        {isLinked ? (
          <div className="space-y-4">
            {/* Conta vinculada */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden pixel-border-sm bg-[#171a21]">
                  {steamAvatarUrl ? (
                    <Image
                      src={steamAvatarUrl}
                      alt={steamName ?? "Avatar Steam"}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <SteamIcon className="h-6 w-6 text-white/70" />
                  )}
                </div>
                <div>
                  <p className="font-pixel text-[10px] text-retro-text">
                    {steamName ?? "Conta Steam"}
                  </p>
                  <p className="mt-0.5 font-pixel text-[7px] text-retro-text-dim">
                    {linkedDate ? `Vinculada em ${linkedDate}` : `ID: ${steamId}`}
                  </p>
                </div>
                <span className="hidden rounded border border-retro-green/40 bg-retro-green/10 px-2 py-1 font-pixel text-[6px] text-retro-green uppercase tracking-wider sm:inline-block">
                  Conectada
                </span>
              </div>

              {/* Desvincular */}
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={isUnlinking || isSyncing}
                className="pixel-btn bg-retro-red/10 px-4 py-2.5 text-[8px] text-retro-red border-2 border-retro-red/40 transition-all hover:bg-retro-red hover:text-white disabled:opacity-50"
              >
                {isUnlinking ? "DESVINCULANDO..." : "DESCONECTAR"}
              </button>
            </div>

            {/* Biblioteca Steam */}
            <div className="flex flex-col gap-3 rounded-lg border border-retro-border/20 bg-retro-bg/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-pixel text-[8px] text-retro-text">BIBLIOTECA STEAM</p>
                <p className="mt-0.5 font-pixel text-[7px] text-retro-text-dim">
                  {librarySyncedDate
                    ? `${libraryOwnedCount ?? 0} jogo${libraryOwnedCount === 1 ? "" : "s"} · sincronizada em ${librarySyncedDate}`
                    : "Nunca sincronizada — sincronize para ver tags \"Já Possuo\" no Kanban."}
                </p>
              </div>
              <button
                onClick={handleSync}
                disabled={isSyncing || isUnlinking}
                className="pixel-btn flex shrink-0 items-center justify-center gap-2 bg-retro-surface px-4 py-2.5 text-[8px] text-retro-text border-2 border-retro-border transition-all hover:border-retro-primary hover:text-retro-primary disabled:cursor-wait disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    SINCRONIZANDO...
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                    </svg>
                    SINCRONIZAR BIBLIOTECA
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center pixel-border-sm bg-[#171a21]">
                <SteamIcon className="h-6 w-6 text-white/70" />
              </div>
              <div>
                <p className="font-pixel text-[9px] text-retro-text">STEAM</p>
                <p className="mt-0.5 font-pixel text-[7px] text-retro-text-dim leading-relaxed">
                  Vincule sua conta Steam para
                  <br className="sm:hidden" /> sincronizar sua biblioteca em breve.
                </p>
              </div>
            </div>

            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="pixel-btn flex items-center justify-center gap-2 bg-[#171a21] px-5 py-2.5 text-[8px] text-white transition-all hover:bg-[#1f242c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-retro-primary disabled:cursor-wait disabled:opacity-50"
            >
              <SteamIcon className="h-4 w-4 shrink-0" />
              {isConnecting ? "REDIRECIONANDO PARA A STEAM..." : "CONECTAR COM STEAM"}
            </button>
          </div>
        )}
      </div>

      {/* Modal de confirmação de desvinculação */}
      {confirmOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={() => !isUnlinking && setConfirmOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unlink-steam-title"
          >
            <div
              className="w-full max-w-md animate-float-up pixel-card border-2 border-retro-red/30 p-6 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-retro-red/20 pixel-border-sm">
                <svg
                  className="h-7 w-7 text-retro-red"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                  />
                </svg>
              </div>

              <h2
                id="unlink-steam-title"
                className="mb-2 text-center font-pixel text-sm tracking-wider text-retro-red"
              >
                DESCONECTAR STEAM
              </h2>

              <p className="mb-4 text-center font-pixel text-[8px] text-retro-text-dim leading-relaxed">
                Sua conta Steam será desvinculada deste perfil.
                <br />
                Para reconectar depois, basta vincular novamente.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  disabled={isUnlinking}
                  className="pixel-btn bg-retro-surface px-4 py-2.5 text-[8px] text-retro-text-dim border-2 border-retro-border transition-all hover:border-retro-text-dim disabled:opacity-50"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleUnlink}
                  disabled={isUnlinking}
                  className="pixel-btn bg-retro-red px-4 py-2.5 text-[8px] text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-retro-red"
                >
                  {isUnlinking ? "DESVINCULANDO..." : "DESCONECTAR"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
