"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou senha inválidos.");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm animate-float-up">
        <div className="pixel-card p-8">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center pixel-border-glow animate-glow-pulse" style={{background: 'linear-gradient(135deg, #1a1a30, #0d0d1a)'}}>
              <span className="font-pixel text-lg text-retro-primary">GN</span>
            </div>
            <h1 className="font-pixel text-base tracking-wider text-retro-text mb-1">
              GAMENEXUS
            </h1>
            <p className="font-pixel text-[7px] text-retro-text-dim">
              CONECTE. JOGUE. DOMINE.
            </p>
          </div>

          {/* Discord Login */}
          <button
            onClick={() => signIn("discord", { redirectTo: "/" })}
            type="button"
            className="pixel-btn flex w-full items-center justify-center gap-3 bg-[#5865F2] px-6 py-3 text-[9px] text-white mb-6"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            ENTRAR COM DISCORD
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-retro-border" />
            <span className="font-pixel text-[7px] text-retro-text-dim">OU</span>
            <div className="h-px flex-1 bg-retro-border" />
          </div>

          {/* Email Login */}
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="retro-input w-full px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                required
                className="retro-input w-full px-4 py-2.5 text-sm"
              />
            </div>

            {error && (
              <div className="border-2 border-retro-red/50 bg-retro-red/10 px-4 py-2.5 text-center">
                <p className="font-pixel text-[8px] text-retro-red">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="pixel-btn flex w-full items-center justify-center gap-2 bg-retro-surface px-6 py-3 text-[9px] text-retro-text border-2 border-retro-border disabled:opacity-40"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  ENTRANDO...
                </>
              ) : (
                "ENTRAR COM EMAIL"
              )}
            </button>
          </form>

          {/* Sign up link */}
          <p className="mt-5 text-center">
            <span className="font-pixel text-[7px] text-retro-text-dim">
              NÃO TEM CONTA?{' '}
            </span>
            <Link
              href="/signup"
              className="font-pixel text-[7px] text-retro-primary hover:text-retro-accent transition-colors"
            >
              CRIAR CONTA
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center font-pixel text-[6px] text-retro-text-dim">
          AO ENTRAR, VOCÊ CONCORDA COM NOSSOS TERMOS DE USO
        </p>
      </div>
    </div>
  );
}
