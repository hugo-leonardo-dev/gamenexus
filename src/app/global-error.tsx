"use client";

// Render dinâmico: evita o prerender estático do Next 16 de quebrar o build
// ao gerar a página interna /_global-error (erro conhecido do framework).
export const dynamic = "force-dynamic";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full items-center justify-center bg-retro-bg px-4 font-mono text-retro-text">
        <div className="pixel-card max-w-sm p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border border-retro-red/40 bg-retro-red/10">
            <span className="font-pixel text-lg text-retro-red">!</span>
          </div>
          <h1 className="font-pixel text-sm tracking-wider text-retro-text">
            ALGO DEU ERRADO
          </h1>
          <p className="mt-3 font-pixel text-[8px] leading-relaxed text-retro-text-dim">
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          {process.env.NODE_ENV === "development" && (
            <p className="mt-3 break-all font-mono text-[10px] text-retro-amber">
              {error.message || error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            className="pixel-btn mt-6 bg-retro-primary px-6 py-3 text-[9px] text-white"
          >
            TENTAR NOVAMENTE
          </button>
        </div>
      </body>
    </html>
  );
}
