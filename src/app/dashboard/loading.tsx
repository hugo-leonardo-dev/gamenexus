export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-10 sm:px-8 lg:px-10 xl:px-12">
      {/* Welcome skeleton */}
      <div className="mb-10 animate-pulse">
        <div className="mb-2 h-7 w-64 rounded-lg bg-zinc-800/60" />
        <div className="h-4 w-96 rounded-lg bg-zinc-800/40" />
      </div>

      {/* Stats skeleton */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-zinc-800/30 bg-zinc-900/30 p-5"
          >
            <div className="mb-3 h-3 w-20 rounded bg-zinc-800/60" />
            <div className="mb-2 h-8 w-16 rounded bg-zinc-800/60" />
            <div className="h-3 w-28 rounded bg-zinc-800/40" />
          </div>
        ))}
      </div>

      {/* Actions skeleton */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-zinc-800/30 bg-zinc-900/30 p-5"
          >
            <div className="mb-3 h-4 w-28 rounded bg-zinc-800/60" />
            <div className="space-y-3">
              <div className="h-10 w-full rounded-lg bg-zinc-800/50" />
              <div className="h-10 w-full rounded-lg bg-zinc-800/50" />
            </div>
          </div>
        ))}
      </div>

      {/* Groups skeleton */}
      <div className="mb-4 h-5 w-28 animate-pulse rounded bg-zinc-800/60" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-zinc-800/30 bg-zinc-900/30 p-5"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="h-5 w-32 rounded bg-zinc-800/60" />
              <div className="h-4 w-14 rounded bg-zinc-800/60" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-4 w-20 rounded bg-zinc-800/50" />
              <div className="h-4 w-20 rounded bg-zinc-800/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
