import { AuthButton } from "./AuthButton";
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b-2 border-retro-border bg-retro-bg/95 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80 group">
          {/* Pixel art style icon */}
          <div className="flex h-8 w-8 items-center justify-center pixel-border-sm" style={{background: 'linear-gradient(135deg, #4a7cff, #8b5cf6)'}}>
            <span className="font-pixel text-[10px] leading-none text-white" style={{imageRendering: 'pixelated'}}>
              GN
            </span>
          </div>
          <span className="font-pixel text-sm tracking-wider text-retro-primary group-hover:text-retro-cyan transition-colors">
            GameNexus
          </span>
          <span className="hidden sm:inline font-pixel text-[8px] text-retro-text-dim">
            NEX™
          </span>
        </Link>
        <AuthButton />
      </div>
    </nav>
  );
}
