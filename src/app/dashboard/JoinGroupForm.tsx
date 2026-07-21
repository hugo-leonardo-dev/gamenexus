"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";

export function JoinGroupForm() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { addToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao entrar no grupo");
        return;
      }

      setCode("");
      addToast(`Você entrou em "${data.group.name}"!`, "success");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="mb-3 text-sm font-semibold text-zinc-200">
        Entrar com Código
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (error) setError("");
            }}
            placeholder="JOG-XXXXXX"
            maxLength={10}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm tracking-widest text-zinc-200 placeholder-zinc-600 transition-colors focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            aria-label="Código de convite"
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
              />
            </svg>
          )}
          {loading ? "Entrando..." : "Entrar no Grupo"}
        </button>
        {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
        {success && <p className="text-xs text-emerald-400">{success}</p>}
      </form>
    </div>
  );
}
