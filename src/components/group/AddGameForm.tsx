"use client";

import { GameSearchInput } from "./GameSearchInput";

interface AddGameFormProps {
  groupId: string;
}

/**
 * AddGameForm agora usa o GameSearchInput inteligente,
 * que suporta busca por nome (com autocomplete) e colagem de link da Steam.
 */
export function AddGameForm({ groupId }: AddGameFormProps) {
  return (
    <div className="crt-screen p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-2 w-2 bg-retro-green animate-blink" />
        <span className="font-pixel text-[8px] text-retro-text-dim uppercase tracking-wider">
          ADICIONAR JOGO
        </span>
      </div>
      <GameSearchInput groupId={groupId} />
      <p className="mt-2 font-pixel text-[7px] text-retro-text-dim">
        DIGITE O NOME DO JOGO PARA BUSCAR, OU COLE UM LINK DA STEAM
      </p>
    </div>
  );
}
