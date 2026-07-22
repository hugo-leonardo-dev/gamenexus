interface ProfileInfoProps {
  email: string | null;
  createdAt: string;
}

export function ProfileInfo({ email, createdAt }: ProfileInfoProps) {
  const memberSince = new Date(createdAt).toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <span className="font-pixel text-[8px] text-retro-text-dim uppercase tracking-wider">
          ✦ INFORMAÇÕES DA CONTA
        </span>
        <div className="h-px flex-1 bg-retro-border" />
      </div>

      <div className="space-y-3">
        {/* Email */}
        <div className="flex items-center justify-between rounded-lg bg-retro-surface px-4 py-3">
          <div>
            <p className="font-pixel text-[7px] text-retro-text-dim uppercase tracking-wider">Email</p>
            <p className="mt-0.5 font-pixel text-[9px] text-retro-text">
              {email ?? "Não informado"}
            </p>
          </div>
          <span className="font-pixel text-[6px] text-retro-amber uppercase tracking-wider">
            {email ? "Verificado" : "Indisponível"}
          </span>
        </div>

        {/* Membro desde */}
        <div className="flex items-center justify-between rounded-lg bg-retro-surface px-4 py-3">
          <div>
            <p className="font-pixel text-[7px] text-retro-text-dim uppercase tracking-wider">Membro desde</p>
            <p className="mt-0.5 font-pixel text-[9px] text-retro-text">{memberSince}</p>
          </div>
        </div>

        {/* Email change notice */}
        <div className="rounded-lg border-2 border-retro-border/50 bg-retro-surface/50 px-4 py-3">
          <p className="font-pixel text-[7px] text-retro-text-dim leading-relaxed">
            A alteração de email estará disponível em breve.
          </p>
        </div>
      </div>
    </section>
  );
}
