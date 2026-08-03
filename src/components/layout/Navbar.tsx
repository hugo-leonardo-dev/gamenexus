import { AuthButton } from "./AuthButton";
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="scanline-beam sticky top-0 z-50 border-b border-retro-border/30 bg-retro-bg/90 backdrop-blur-xl">
      {/* Bottom neon accent line */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-retro-primary/40 to-transparent" />

      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 transition-all hover:opacity-90 group"
        >
          {/* Cyberpunk style icon with chamfered corners */}
          <div
            className="cyber-chamfer-sm flex h-8 w-8 items-center justify-center border border-retro-primary/40"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,255,136,0.2), rgba(139,92,246,0.2))",
            }}
          >
            <span className="font-pixel text-[10px] leading-none text-retro-primary cyber-text-glow">
              GN
            </span>
          </div>
          <span className="font-pixel text-sm tracking-wider text-retro-primary cyber-text-glow transition-all group-hover:text-retro-cyan group-hover:cyber-text-glow-tertiary">
            GameNexus
          </span>
        </Link>
        <AuthButton />
      </div>
    </nav>
  );
}
