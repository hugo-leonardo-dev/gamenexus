"use client";

import type { MemberData } from "@/lib/types";

interface MemberListProps {
  members: MemberData[];
  currentUserId: string;
}

export function MemberList({
  members,
  currentUserId,
}: MemberListProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t-2 border-retro-border pt-4">
      <span className="font-pixel text-[7px] text-retro-text-dim uppercase tracking-wider">
        ▸ MEMBROS ({members.length}):
      </span>
      {members.map((member) => {
        const isCurrentUser = member.userId === currentUserId;

        return (
          <div
            key={member.id}
            className="flex items-center gap-1.5 pixel-border-sm px-2.5 py-1 bg-retro-surface"
          >
            {member.user.avatarUrl ? (
              <img
                src={member.user.avatarUrl}
                alt=""
                className="h-5 w-5"
                style={{imageRendering: 'pixelated', borderRadius: 0}}
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center bg-retro-border text-[8px] text-retro-text-dim font-pixel">
                {member.user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-pixel text-[7px] text-retro-text">
              {member.user.name}
              {isCurrentUser && (
                <span className="ml-1 text-retro-text-dim">(VOCÊ)</span>
              )}
            </span>
            {member.role === "OWNER" && (
              <span className="font-pixel text-[7px] text-retro-accent" title="Dono do grupo">★</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
