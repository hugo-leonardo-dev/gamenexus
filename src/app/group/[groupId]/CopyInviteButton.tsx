"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";

interface CopyInviteButtonProps {
  inviteCode: string;
}

export function CopyInviteButton({ inviteCode }: CopyInviteButtonProps) {
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      addToast("Código copiado!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback para ambientes sem clipboard API
      try {
        const input = document.createElement("input");
        input.value = inviteCode;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        setCopied(true);
        addToast("Código copiado!", "success");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        addToast("Não foi possível copiar. Código: " + inviteCode, "info");
      }
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-600 hover:bg-zinc-700 hover:text-white active:scale-95"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        {copied ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
          />
        )}
      </svg>
      <span className="font-mono text-xs tracking-wider">{inviteCode}</span>
      {copied && <span className="text-xs text-emerald-400">Copiado!</span>}
    </button>
  );
}
