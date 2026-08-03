"use client";

import { useSearchParams } from "next/navigation";

/** Mensagens claras em português — nunca expõem detalhes internos. */
const ERROR_MESSAGES: Record<string, string> = {
  steam_link_sem_parametros: "A vinculação com a Steam não foi concluída. Tente novamente.",
  steam_link_state_invalido:
    "Sua sessão expirou ou o fluxo foi alterado. Inicie a vinculação novamente.",
  steam_link_nonce_reutilizado: "Sua sessão expirou. Inicie a vinculação novamente.",
  steam_link_verificacao_falhou: "A Steam não confirmou a vinculação. Tente novamente.",
  steam_link_claimed_id_invalido: "Resposta inválida da Steam. Tente novamente.",
  steam_link_steam_ja_vinculado_outra_conta:
    "Este SteamID já está vinculado a outra conta do GameNexus. Se for sua conta, desvincule-a da outra conta antes de tentar novamente.",
  steam_link_ja_possui_steam:
    "Você já possui uma conta Steam vinculada. Desvincule-a antes de conectar outra.",
  steam_link_usuario_inexistente: "Usuário não encontrado. Faça login novamente.",
  steam_link_tente_mais_tarde:
    "Muitas tentativas. Aguarde alguns instantes e tente novamente.",
  steam_link_erro_interno: "Erro ao vincular com a Steam. Tente novamente.",
};

/**
 * Lê ?error=steam_link_* (falha do callback) e ?success=steam_vinculado
 * (sucesso) e exibe o aviso correspondente.
 * Deve ser renderizado dentro de <Suspense> (useSearchParams).
 */
export function SteamLinkNotice() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");

  if (error?.startsWith("steam_link_")) {
    const message =
      ERROR_MESSAGES[error] ??
      "Não foi possível vincular a conta Steam. Tente novamente.";
    return (
      <div
        role="alert"
        className="mb-6 border border-retro-red/30 bg-retro-red/5 px-4 py-2.5 text-center"
      >
        <p className="font-pixel text-[8px] leading-relaxed text-retro-red">{message}</p>
      </div>
    );
  }

  if (success === "steam_vinculado") {
    return (
      <div
        role="status"
        className="mb-6 border border-retro-green/30 bg-retro-green/5 px-4 py-2.5 text-center"
      >
        <p className="font-pixel text-[8px] leading-relaxed text-retro-green">
          Conta Steam vinculada com sucesso!
        </p>
      </div>
    );
  }

  return null;
}
