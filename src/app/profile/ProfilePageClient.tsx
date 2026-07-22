"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/ToastProvider";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileInfo } from "@/components/profile/ProfileInfo";
import { ProfileCustomization } from "@/components/profile/ProfileCustomization";
import { ProfileComingSoon } from "@/components/profile/ProfileComingSoon";

interface ProfilePageClientProps {
  name: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export function ProfilePageClient({
  name: initialName,
  email,
  avatarUrl: initialAvatar,
  createdAt,
}: ProfilePageClientProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const { addToast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  async function handleAvatarChange(dataUrl: string) {
    setIsSavingAvatar(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });

      if (res.ok) {
        setAvatarUrl(dataUrl);
        addToast("Foto de perfil atualizada!", "success");
        updateSession();
        router.refresh();
      } else {
        const data = await res.json();
        addToast(data.error || "Erro ao atualizar avatar.", "error");
      }
    } catch {
      addToast("Erro de conexão. Tente novamente.", "error");
    } finally {
      setIsSavingAvatar(false);
    }
  }

  return (
    <div className="space-y-8 animate-float-up" style={{ animationDelay: "0.1s" }}>
      {/* Card principal */}
      <div className="pixel-card p-6 sm:p-8">
        <ProfileHeader
          name={initialName}
          avatarUrl={avatarUrl}
          onAvatarChange={handleAvatarChange}
          disabled={isSavingAvatar}
        />
      </div>

      {/* Informações da Conta */}
      <div className="pixel-card p-6 sm:p-8">
        <ProfileInfo email={email} createdAt={createdAt} />
      </div>

      {/* Personalização */}
      <div className="pixel-card p-6 sm:p-8">
        <ProfileCustomization currentName={initialName} />
      </div>

      {/* Backlog Público (Em Breve) */}
      <div className="pixel-card p-6 sm:p-8">
        <ProfileComingSoon />
      </div>

      {/* Footer */}
      <div className="border-t-2 border-retro-border pt-4 text-center">
        <span className="font-pixel text-[6px] text-retro-text-dim">
          ▸ MAIS FUNCIONALIDADES EM BREVE ◂
        </span>
      </div>
    </div>
  );
}
