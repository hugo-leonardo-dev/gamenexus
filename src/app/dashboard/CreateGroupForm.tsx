"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { VALIDATIONS } from "@/lib/types";

export function CreateGroupForm() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { addToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar grupo");
        return;
      }

      setName("");
      addToast(`Grupo "${data.group.name}" criado com sucesso!`, "success");
      router.refresh();
      inputRef.current?.focus();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pixel-card p-4">
      <h3 className="font-pixel text-[9px] text-retro-primary mb-3 uppercase tracking-wider">
        ★ Criar Novo Grupo
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError("");
          }}
          placeholder="Nome do grupo"
          maxLength={VALIDATIONS.groupName.max}
          className="retro-input w-full px-3 py-2 text-sm"
          aria-label="Nome do novo grupo"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="pixel-btn flex w-full items-center justify-center gap-2 bg-retro-primary px-4 py-2.5 text-[9px] text-white disabled:opacity-40"
        >
          {loading ? (
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
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
          )}
          {loading ? "Criando..." : "Criar Grupo"}
        </button>
        {error && (
          <p className="text-xs text-red-400" role="alert">{error}</p>
        )}
      </form>
    </div>
  );
}
