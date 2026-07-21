export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="mb-8 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-zinc-800" />
        <div className="mt-2 h-5 w-64 rounded-lg bg-zinc-800/50" />
      </div>

      {/* Actions skeleton */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
          >
            <div className="mb-3 h-4 w-32 rounded bg-zinc-800" />
            <div className="space-y-3">
              <div className="h-9 w-full rounded-lg bg-zinc-800" />
              <div className="h-9 w-full rounded-lg bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Groups skeleton */}
      <section>
        <div className="mb-4 h-5 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="h-5 w-28 rounded bg-zinc-800" />
                <div className="h-4 w-14 rounded bg-zinc-800" />
              </div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-20 rounded bg-zinc-800" />
                <div className="h-4 w-20 rounded bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
