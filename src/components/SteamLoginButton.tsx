"use client";

import { useState } from "react";

/** Ícone oficial da Steam (reutilizado em botões e navbar). */
export function SteamIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 12-5.373 12-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.715.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.63-.26-1.32-.26-1.95 0-.448.185-.809.511-1.066.93l1.399.578c.87.36 1.286 1.357.924 2.225-.359.867-1.356 1.284-2.225.924l.117-.49zm9.899-7.772c0-1.787-1.446-3.232-3.232-3.232-1.787 0-3.234 1.446-3.234 3.233s1.446 3.232 3.234 3.232c1.786 0 3.232-1.446 3.232-3.232zm-5.158-.151c0-1.063.86-1.924 1.926-1.924 1.062 0 1.922.861 1.922 1.924s-.86 1.925-1.922 1.925c-1.065 0-1.926-.862-1.926-1.925z" />
    </svg>
  );
}

/**
 * Botão "Entrar com Steam" — redireciona para /api/auth/steam, que por sua
 * vez redireciona para o endpoint oficial da Steam (OpenID 2.0).
 * Acessível por teclado (é um <button>) e com foco visível.
 *
 * `className` permite trocar o estilo por contexto: o default (pixel-btn) é
 * usado em login/cadastro; a landing page passa um estilo de Link próprio.
 */
export function SteamLoginButton({
  className = "pixel-btn w-full px-6 py-3 hover:shadow-[0_0_12px_rgba(102,192,244,0.25)]",
}: {
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  function handleLogin() {
    setLoading(true);
    window.location.assign("/api/auth/steam");
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={loading}
      aria-label="Entrar com Steam"
      className={`flex items-center justify-center gap-3 bg-[#171a21] text-[9px] text-white transition-all hover:bg-[#1f242c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-retro-primary disabled:cursor-wait disabled:opacity-40 ${className}`}
    >
      <SteamIcon className="h-5 w-5 shrink-0" />
      {loading ? "REDIRECIONANDO PARA A STEAM..." : "ENTRAR COM STEAM"}
    </button>
  );
}
