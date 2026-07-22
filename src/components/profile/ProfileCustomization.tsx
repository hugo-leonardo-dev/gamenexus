"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/ToastProvider";

interface ProfileCustomizationProps {
  currentName: string;
}

export function ProfileCustomization({ currentName }: ProfileCustomizationProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const { addToast } = useToast();
  const [name, setName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSaveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (res.ok) {
        addToast("Nome atualizado com sucesso!", "success");
        updateSession();
        router.refresh();
      } else {
        const data = await res.json();
        addToast(data.error || "Erro ao atualizar nome.", "error");
      }
    } catch {
      addToast("Erro de conexão. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <span className="font-pixel text-[8px] text-retro-text-dim uppercase tracking-wider">
          ✦ PERSONALIZAÇÃO
        </span>
        <div className="h-px flex-1 bg-retro-border" />
      </div>

      <div className="space-y-4">
        {/* Nome */}
        <div>
          <label className="mb-1.5 block font-pixel text-[7px] text-retro-text-dim uppercase tracking-wider">
            Nome de exibição
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              disabled={isSaving}
              className="flex-1 bg-retro-bg border-2 border-retro-border px-3 py-2 font-pixel text-[9px] text-retro-text outline-none transition-all focus:border-retro-primary disabled:opacity-50"
              placeholder="Seu nome"
            />
            <button
              onClick={handleSaveName}
              disabled={isSaving || !name.trim() || name.trim() === currentName}
              className="pixel-btn bg-retro-primary px-4 py-2 text-[8px] text-white disabled:opacity-40"
            >
              {isSaving ? (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                "SALVAR"
              )}
            </button>
          </div>
          <p className="mt-1 font-pixel text-[7px] text-retro-text-dim">
            Seu nome será exibido em grupos e no perfil.
          </p>
        </div>
      </div>
    </section>
  );
}
