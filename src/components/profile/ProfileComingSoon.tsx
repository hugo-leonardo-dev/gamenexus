/**
 * Card "Em breve" para funcionalidades futuras do perfil.
 * Preparado para: backlog público, biografia, seguidores, etc.
 */
export function ProfileComingSoon() {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <span className="font-pixel text-[8px] text-retro-text-dim uppercase tracking-wider">
          🚧 BACKLOG PÚBLICO
        </span>
        <div className="h-px flex-1 bg-retro-border" />
      </div>

      <div className="pixel-card border-2 border-retro-border/50 border-dashed p-6 text-center">
        {/* Ilustração */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center bg-retro-surface pixel-border-sm">
          <svg
            className="h-8 w-8 text-retro-text-dim"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h3 className="mb-2 font-pixel text-[10px] text-retro-text uppercase tracking-wider">
          Em Breve
        </h3>

        <p className="mx-auto max-w-sm font-pixel text-[8px] text-retro-text-dim leading-relaxed">
          Em breve você poderá criar um backlog público para compartilhar
          sua coleção de jogos com outros usuários.
        </p>

        {/* Roadmap items */}
        <div className="mx-auto mt-5 grid max-w-xs gap-2 text-left">
          {[
            "Coleção de jogos pública",
            "Perfil personalizado com bio",
            "Estatísticas e conquistas",
            "Seguir outros jogadores",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-retro-text-dim/40" />
              <span className="font-pixel text-[7px] text-retro-text-dim/60">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
