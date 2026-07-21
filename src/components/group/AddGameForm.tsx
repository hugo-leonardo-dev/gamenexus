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
    <div className="space-y-1">
      <GameSearchInput groupId={groupId} />
      <p className="text-[11px] text-zinc-600">
        Digite o nome do jogo para buscar, ou cole um link da Steam (ex: store.steampowered.com/app/730)
      </p>
    </div>
  );
}
