import Link from "next/link";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-retro-surface/50 ring-1 ring-retro-border/30">
        <span className="text-retro-text-dim">{icon}</span>
      </div>
      <h3 className="mb-2 font-pixel text-[11px] text-retro-text">{title}</h3>
      <p className="mb-6 max-w-sm font-pixel text-[8px] text-retro-text-dim leading-relaxed">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 rounded-lg bg-retro-primary px-5 py-2.5 font-pixel text-[9px] text-white transition-all hover:bg-retro-primary/90 hover:shadow-[0_0_16px_rgba(74,124,255,0.2)]"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
