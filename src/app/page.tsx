import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

// ─── Discord Icon (reutilizável) ─────────────────────────────────────────

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-5 w-5 shrink-0"}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col">
      {/* ════════════════════════════════════════════════ */}
      {/* HERO */}
      {/* ════════════════════════════════════════════════ */}
      <section className="relative flex flex-col items-center overflow-hidden px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 lg:pt-32 lg:pb-36">
        {/* Background glow */}
        <div className="hero-glow pointer-events-none absolute inset-0" />

        {/* Grid overlay */}
        <div className="bg-grid pointer-events-none absolute inset-0" />

        {/* Top-right accent gradient */}
        <div
          className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full opacity-10 blur-3xl"
          style={{
            background: "radial-gradient(circle, #4a7cff, transparent)",
          }}
        />

        {/* Bottom-left accent gradient */}
        <div
          className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full opacity-10 blur-3xl"
          style={{
            background: "radial-gradient(circle, #8b5cf6, transparent)",
          }}
        />

        {/* ─── Hero Content ─── */}
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
          {/* Left: Text */}
          <div className="flex-1 text-center lg:text-left">
            {/* Title */}
            <h1 className="font-pixel text-3xl leading-tight tracking-wider sm:text-4xl lg:text-5xl">
              Organize seu backlog
              <br />
              de jogos com <span className="text-gradient">seus amigos</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 max-w-lg text-base leading-relaxed text-retro-text-dim sm:text-lg lg:mx-0">
              Crie grupos privados, adicione jogos da Steam, acompanhe o
              progresso de cada título e nunca mais esqueça o que jogar.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Link
                href="/login"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-lg bg-[#5865F2] px-7 py-3.5 font-pixel text-[9px] text-white transition-all hover:bg-[#4752C4] hover:shadow-[0_0_24px_rgba(88,101,242,0.3)]"
              >
                <DiscordIcon />
                <span>ENTRAR COM DISCORD</span>
              </Link>

              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg border border-retro-border/50 bg-retro-surface/50 px-7 py-3.5 font-pixel text-[9px] text-retro-text backdrop-blur-sm transition-all hover:border-retro-primary/30 hover:bg-retro-surface hover:shadow-[0_0_16px_rgba(74,124,255,0.1)]"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                <span>CRIAR CONTA</span>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-10 flex items-center gap-6 text-center lg:justify-start">
              <div>
                <div className="font-pixel text-lg text-retro-primary">
                  100%
                </div>
                <div className="font-pixel text-[6px] text-retro-text-dim">
                  GRÁTIS
                </div>
              </div>
              <div className="h-8 w-px bg-retro-border/50" />
              <div>
                <div className="font-pixel text-lg text-retro-cyan">Steam</div>
                <div className="font-pixel text-[6px] text-retro-text-dim">
                  INTEGRAÇÃO
                </div>
              </div>
              <div className="h-8 w-px bg-retro-border/50" />
              <div>
                <div className="font-pixel text-lg text-retro-green">∞</div>
                <div className="font-pixel text-[6px] text-retro-text-dim">
                  JOGOS
                </div>
              </div>
            </div>
          </div>

          {/* Right: Kanban Mockup */}
          <div className="hidden flex-1 lg:block">
            <div className="relative">
              {/* Glow behind mockup */}
              <div
                className="pointer-events-none absolute -inset-8 rounded-3xl opacity-20 blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle at center, #4a7cff, transparent)",
                }}
              />

              <div className="relative flex gap-3 rounded-xl border border-retro-border/30 bg-retro-bg/60 p-4 backdrop-blur-sm">
                {/* Column: Backlog */}
                <div className="mockup-column flex-1 p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-retro-amber" />
                    <span className="font-pixel text-[7px] text-retro-text-dim uppercase">
                      Backlog
                    </span>
                    <span className="ml-auto font-pixel text-[6px] text-retro-text-dim">
                      4
                    </span>
                  </div>
                  <div className="space-y-2">
                    <MockupCard title="Elden Ring" image="ER" color="#ffd700" />
                    <MockupCard
                      title="Baldur's Gate 3"
                      image="BG"
                      color="#8b5cf6"
                    />
                    <MockupCard title="Hades II" image="H2" color="#ff3355" />
                  </div>
                </div>

                {/* Column: Jogando */}
                <div className="mockup-column flex-1 p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-retro-green" />
                    <span className="font-pixel text-[7px] text-retro-text-dim uppercase">
                      Jogando
                    </span>
                    <span className="ml-auto font-pixel text-[6px] text-retro-text-dim">
                      2
                    </span>
                  </div>
                  <div className="space-y-2">
                    <MockupCard
                      title="Dark Souls III"
                      image="DS"
                      color="#4a7cff"
                    />
                    <MockupCard
                      title="Stardew Valley"
                      image="SV"
                      color="#40ff80"
                    />
                  </div>
                </div>

                {/* Column: Finalizados */}
                <div className="mockup-column flex-1 p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-retro-cyan" />
                    <span className="font-pixel text-[7px] text-retro-text-dim uppercase">
                      Zerados
                    </span>
                    <span className="ml-auto font-pixel text-[6px] text-retro-text-dim">
                      3
                    </span>
                  </div>
                  <div className="space-y-2">
                    <MockupCard title="Portal 2" image="P2" color="#00e5ff" />
                    <MockupCard
                      title="Hollow Knight"
                      image="HK"
                      color="#9898c0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <div className="flex flex-col items-center gap-2 animate-bounce">
            <span className="font-pixel text-[6px] text-retro-text-dim/50">
              SCROLL
            </span>
            <svg
              className="h-4 w-4 text-retro-text-dim/50"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════ */}
      {/* COMO FUNCIONA */}
      {/* ════════════════════════════════════════════════ */}
      <section className="border-t border-retro-border/20 px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          {/* Section header */}
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-retro-border/30 bg-retro-surface/30 px-4 py-1.5 backdrop-blur-sm">
              <span className="font-pixel text-[7px] tracking-wider text-retro-text-dim">
                COMO FUNCIONA
              </span>
            </div>
            <h2 className="font-pixel text-xl tracking-wider text-retro-text sm:text-2xl">
              Comece em <span className="text-gradient">4 passos</span>
            </h2>
            <p className="mt-3 font-pixel text-[8px] text-retro-text-dim">
              DO ZERO AO KANBAN EM MENOS DE 1 MINUTO
            </p>
          </div>

          {/* Steps grid */}
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <StepCard
              number="01"
              title="Crie um grupo"
              description="Dê um nome ao seu grupo. Pode ser o nome da sua crew ou algo criativo."
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              }
            />
            <StepCard
              number="02"
              title="Convide amigos"
              description="Compartilhe o código de convite. Seu grupo é privado — só entra quem você chamar."
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
              }
            />
            <StepCard
              number="03"
              title="Adicione jogos"
              description="Cole um link da Steam ou busque pelo nome. Preços e dados são sincronizados automaticamente."
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.136-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.5 10.25"
                  />
                </svg>
              }
            />
            <StepCard
              number="04"
              title="Organize em Kanban"
              description="Arraste jogos entre colunas. Do backlog aos finalizados, tudo visual e rápido."
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════ */}
      {/* RECURSOS */}
      {/* ════════════════════════════════════════════════ */}
      <section className="border-t border-retro-border/20 px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          {/* Section header */}
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-retro-border/30 bg-retro-surface/30 px-4 py-1.5 backdrop-blur-sm">
              <span className="font-pixel text-[7px] tracking-wider text-retro-text-dim">
                RECURSOS
              </span>
            </div>
            <h2 className="font-pixel text-xl tracking-wider text-retro-text sm:text-2xl">
              Tudo que você precisa em{" "}
              <span className="text-gradient-accent">um só lugar</span>
            </h2>
            <p className="mt-3 font-pixel text-[8px] text-retro-text-dim">
              FERRAMENTAS PROJETADAS PARA ORGANIZAR SUA BIBLIOTECA
            </p>
          </div>

          {/* Features grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.136-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.5 10.25"
                  />
                </svg>
              }
              title="Steam Integration"
              description="Importe jogos automaticamente com apenas um link. Preços, capas e dados são sincronizados."
              color="#4a7cff"
            />
            <FeatureCard
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
              }
              title="Grupos Privados"
              description="Crie grupos com código de convite. Apenas quem você chamar pode participar e ver os jogos."
              color="#8b5cf6"
            />
            <FeatureCard
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>
              }
              title="Kanban Visual"
              description="Arraste jogos entre colunas com drag & drop. Backlog, jogando, pausados e finalizados."
              color="#ffd700"
            />
            <FeatureCard
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                  />
                </svg>
              }
              title="Responsivo"
              description="Funciona perfeitamente no celular, tablet e desktop. Organize seus jogos de qualquer lugar."
              color="#00e5ff"
            />
            <FeatureCard
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                  />
                </svg>
              }
              title="Preços Automáticos"
              description="Preços da Steam sincronizados diariamente. Saiba quando aquele jogo entrar em promoção."
              color="#40ff80"
            />
            <FeatureCard
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              }
              title="100% Gratuito"
              description="Sem planos, sem assinaturas. Todas as funcionalidades são liberadas para todos os usuários."
              color="#ff3355"
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════ */}
      {/* CTA FINAL */}
      {/* ════════════════════════════════════════════════ */}
      <section className="border-t border-retro-border/20 px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="glass-card relative overflow-hidden rounded-2xl p-10 sm:p-16">
            {/* Background decoration */}
            <div
              className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full opacity-10 blur-3xl"
              style={{
                background: "radial-gradient(circle, #4a7cff, transparent)",
              }}
            />
            <div
              className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full opacity-10 blur-3xl"
              style={{
                background: "radial-gradient(circle, #8b5cf6, transparent)",
              }}
            />

            <div className="relative z-10">
              <h2 className="font-pixel text-xl tracking-wider text-retro-text sm:text-2xl">
                Pronto para organizar{" "}
                <span className="text-gradient">seu backlog?</span>
              </h2>
              <p className="mx-auto mt-4 max-w-md font-pixel text-[8px] text-retro-text-dim">
                Crie sua conta gratuitamente e comece a organizar seus jogos com
                seus amigos agora mesmo.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-3 rounded-lg bg-[#5865F2] px-8 py-3.5 font-pixel text-[9px] text-white transition-all hover:bg-[#4752C4] hover:shadow-[0_0_24px_rgba(88,101,242,0.3)]"
                >
                  <DiscordIcon />
                  <span>ENTRAR COM DISCORD</span>
                </Link>

                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-lg border border-retro-border/50 bg-retro-surface/50 px-8 py-3.5 font-pixel text-[9px] text-retro-text backdrop-blur-sm transition-all hover:border-retro-primary/30 hover:bg-retro-surface"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                  <span>CRIAR CONTA</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ════════════════════════════════════════════════ */}
      <footer className="border-t border-retro-border/20 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-3">
            {/* Brand */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-retro-primary to-retro-purple">
                  <span className="font-pixel text-[10px] leading-none text-white">
                    GN
                  </span>
                </div>
                <span className="font-pixel text-sm tracking-wider text-retro-text">
                  GameNexus
                </span>
              </div>
              <p className="font-pixel text-[7px] text-retro-text-dim leading-relaxed">
                Organize seu backlog de jogos com amigos.
                <br />
                Gratuito, colaborativo e integrado com a Steam.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="mb-4 font-pixel text-[8px] tracking-wider text-retro-text uppercase">
                Links
              </h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://github.com/hugo-leonardo-dev/gamenexus"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-pixel text-[7px] text-retro-text-dim transition-colors hover:text-retro-text"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      />
                    </svg>
                    GitHub
                  </a>
                </li>
              </ul>
            </div>

            {/* Info */}
            <div>
              <h4 className="mb-4 font-pixel text-[8px] tracking-wider text-retro-text uppercase">
                Info
              </h4>
              <ul className="space-y-2 font-pixel text-[7px] text-retro-text-dim">
                <li>GameNexus v1.1</li>
                <li>© 2026 GameNexus</li>
                <li>Feito com ❤️ para jogadores</li>
                <li>
                  Powered by{" "}
                  <a
                    href="https://github.com/hugo-leonardo-dev"
                    target="_blank"
                    className="inline-flex items-center gap-2 font-pixel text-[7px] text-retro-text-dim transition-colors hover:text-retro-text"
                  >
                    Hugo Leonardo
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 border-t border-retro-border/20 pt-6 text-center">
            <p className="font-pixel text-[6px] text-retro-text-dim/60">
              GAMENEXUS • ORGANIZE. JOGUE. COMPARTILHE.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────

function MockupCard({
  title,
  image,
  color,
}: {
  title: string;
  image: string;
  color: string;
}) {
  return (
    <div className="mockup-card flex items-center gap-2.5 px-2.5 py-2">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
        style={{ background: `${color}20`, border: `1px solid ${color}40` }}
      >
        <span className="font-pixel text-[6px]" style={{ color }}>
          {image}
        </span>
      </div>
      <span className="truncate font-pixel text-[7px] text-retro-text-dim">
        {title}
      </span>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="step-connector group text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-retro-primary/20 to-retro-purple/20 ring-1 ring-retro-primary/20 transition-all group-hover:ring-retro-primary/40 group-hover:shadow-[0_0_16px_rgba(74,124,255,0.15)]">
        <div className="text-retro-primary">{icon}</div>
      </div>
      <span className="mb-2 block font-pixel text-[10px] text-gradient">
        {number}
      </span>
      <h3 className="mb-2 font-pixel text-[9px] text-retro-text">{title}</h3>
      <p className="font-pixel text-[7px] text-retro-text-dim leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="glass-card group relative overflow-hidden rounded-xl p-5 transition-all hover:-translate-y-0.5">
      {/* Hover glow line */}
      <div
        className="pointer-events-none absolute -inset-0.5 rounded-xl opacity-0 blur transition-all group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${color}20, transparent 60%)`,
        }}
      />

      <div className="relative z-10">
        <div
          className="feature-icon-glow mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <h3 className="mb-2 font-pixel text-[9px] text-retro-text">{title}</h3>
        <p className="font-pixel text-[7px] text-retro-text-dim leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
