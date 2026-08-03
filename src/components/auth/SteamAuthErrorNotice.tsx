"use client";

import { useSearchParams } from "next/navigation";

/** Mensagens claras em português — nunca expõem detalhes internos. */
const ERROR_MESSAGES: Record<string, string> = {
  steam_sem_parametros: "A autenticação com a Steam não foi concluída. Tente novamente.",
  steam_state_invalido: "Sua sessão de login expirou. Tente novamente.",
  steam_nonce_reutilizado: "Sua sessão de login expirou. Tente novamente.",
  steam_verificacao_falhou: "A Steam não confirmou o login. Tente novamente.",
  steam_claimed_id_invalido: "Resposta inválida da Steam. Tente novamente.",
  steam_erro_interno: "Erro ao entrar com Steam. Tente novamente.",
  steam_tente_mais_tarde: "Muitas tentativas. Aguarde alguns instantes e tente novamente.",
};

/**
 * Lê o parâmetro ?error=steam_* vindo do callback e exibe a mensagem amigável.
 * Deve ser renderizado dentro de <Suspense> (useSearchParams).
 */
export function SteamAuthErrorNotice() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (!error || !error.startsWith("steam_")) return null;

  const message = ERROR_MESSAGES[error] ?? "Não foi possível entrar com Steam. Tente novamente.";

  return (
    <div
      role="alert"
      className="mb-6 border border-retro-red/30 bg-retro-red/5 px-4 py-2.5 text-center"
    >
      <p className="font-pixel text-[8px] leading-relaxed text-retro-red">{message}</p>
    </div>
  );
}
