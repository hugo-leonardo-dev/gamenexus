import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="text-center animate-crt-on">
        {/* Pixel art logo */}
        <div className="mx-auto mb-8 flex flex-col items-center gap-4">
          <div
            className="flex h-24 w-24 items-center justify-center pixel-border-glow animate-glow-pulse"
            style={{
              background: "linear-gradient(135deg, #1a1a30, #0d0d1a)",
            }}
          >
            <span className="font-pixel text-2xl leading-none text-retro-primary">
              GN
            </span>
          </div>
          <h1 className="font-pixel text-2xl tracking-wider text-retro-text sm:text-3xl">
            GameNexus
          </h1>
          <span className="font-pixel text-[8px] text-retro-text-dim tracking-widest">
            ★ CONECTE. JOGUE. DOMINE. ★
          </span>
        </div>

        {/* Retro description box */}
        <div className="mx-auto mb-10 max-w-md pixel-card p-5 text-center">            <p className="text-sm leading-relaxed text-retro-text">
            Organize sua lista de jogos com amigos no GameNexus. Crie grupos,
            adicione jogos da Steam, e acompanhe o que estão jogando.
          </p>
          <div className="mt-3 border-t border-retro-border pt-3">
            <span className="font-pixel text-[7px] text-retro-text-dim">
              COMPATÍVEL COM NES™ • SNES™ • GENESIS™
            </span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="pixel-btn flex items-center gap-2 bg-retro-primary px-8 py-4 text-[10px] text-white animate-glow-pulse"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
            COMEÇAR
          </Link>
          <Link
            href="/signup"
            className="pixel-btn flex items-center gap-2 bg-retro-surface px-8 py-4 text-[10px] text-retro-text border-2 border-retro-border"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            CRIAR CONTA
          </Link>
        </div>

        {/* Features row */}
        <div className="mx-auto mt-16 grid max-w-2xl gap-4 sm:grid-cols-3">
          <div className="pixel-card p-4 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center pixel-border-sm" style={{background: 'linear-gradient(135deg, #4a7cff, #8b5cf6)'}}>
              <span className="font-pixel text-xs text-white">G</span>
            </div>
            <h3 className="font-pixel text-[9px] text-retro-text mb-2">Grupos</h3>
            <p className="font-pixel text-[7px] text-retro-text-dim leading-relaxed">
              Crie grupos privados{'\n'}com amigos
            </p>
          </div>
          <div className="pixel-card p-4 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center pixel-border-sm" style={{background: 'linear-gradient(135deg, #40ff80, #00e5ff)'}}>
              <span className="font-pixel text-xs text-black">S</span>
            </div>
            <h3 className="font-pixel text-[9px] text-retro-text mb-2">Steam</h3>
            <p className="font-pixel text-[7px] text-retro-text-dim leading-relaxed">
              Adicione jogos{'\n'}da Steam
            </p>
          </div>
          <div className="pixel-card p-4 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center pixel-border-sm" style={{background: 'linear-gradient(135deg, #ffd700, #ffb000)'}}>
              <span className="font-pixel text-xs text-black">K</span>
            </div>
            <h3 className="font-pixel text-[9px] text-retro-text mb-2">Kanban</h3>
            <p className="font-pixel text-[7px] text-retro-text-dim leading-relaxed">
              Organize com{'\n'}drag & drop
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 border-t-2 border-retro-border pt-6">
          <p className="font-pixel text-[7px] text-retro-text-dim">
            GAMENEXUS v1.0 • 2026 • FEITO COM ❤️ PARA JOGADORES RETRO
          </p>
          <div className="mt-2 flex items-center justify-center gap-1">
            <span className="inline-block h-2 w-2 bg-retro-green" />
            <span className="font-pixel text-[6px] text-retro-text-dim">POWERED BY NEXT.JS</span>
            <span className="inline-block h-2 w-2 bg-retro-red animate-flicker" />
          </div>
        </div>
      </div>
    </div>
  );
}
