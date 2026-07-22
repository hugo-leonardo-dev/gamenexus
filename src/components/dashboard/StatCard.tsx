interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  subtitle?: string;
}

export function StatCard({ icon, label, value, color, subtitle }: StatCardProps) {
  return (
    <div className="glass-card group relative overflow-hidden rounded-xl p-6 transition-all hover:-translate-y-0.5">
      {/* Color accent bar */}
      <div
        className="absolute top-0 left-0 h-full w-0.5 transition-all group-hover:w-1"
        style={{ background: `linear-gradient(180deg, ${color}, transparent)` }}
      />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-pixel text-[7px] tracking-wider text-retro-text-dim uppercase">
            {label}
          </p>
          <p
            className="font-pixel text-2xl tracking-wider"
            style={{ color }}
          >
            {value}
          </p>
          {subtitle && (
            <p className="font-pixel text-[7px] text-retro-text-dim">{subtitle}</p>
          )}
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
    </div>
  );
}
