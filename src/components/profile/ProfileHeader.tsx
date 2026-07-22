"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface ProfileHeaderProps {
  name: string;
  avatarUrl: string | null;
  onAvatarChange: (dataUrl: string) => void;
  disabled?: boolean;
}

export function ProfileHeader({
  name,
  avatarUrl,
  onAvatarChange,
  disabled,
}: ProfileHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Valida tipo e tamanho (max 2MB)
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      onAvatarChange(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  const displayUrl = preview || avatarUrl;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      {/* Avatar */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="group relative flex h-20 w-20 shrink-0 items-center justify-center pixel-border-sm overflow-hidden transition-all hover:opacity-90 disabled:opacity-50"
        title="Alterar foto de perfil"
      >
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt={name}
            width={80}
            height={80}
            className="h-full w-full object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-retro-primary font-pixel text-2xl text-white">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
          disabled ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}>
          {disabled ? (
            <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {/* Name + subtitle */}
      <div className="text-center sm:text-left">
        <h1 className="font-pixel text-lg tracking-wider text-retro-text">
          {name}
        </h1>
        <p className="mt-1 font-pixel text-[8px] text-retro-text-dim">
          ★ GAMENEXUS
        </p>
      </div>
    </div>
  );
}
