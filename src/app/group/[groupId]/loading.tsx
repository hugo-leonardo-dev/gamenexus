export default function GroupLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="mb-6 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-7 w-48 rounded-lg bg-zinc-800 sm:h-8" />
              <div className="h-4 w-14 rounded-md bg-zinc-800" />
            </div>
            <div className="mt-2 h-4 w-36 rounded bg-zinc-800/50" />
          </div>
          <div className="h-9 w-44 rounded-lg bg-zinc-800" />
        </div>

        {/* Members skeleton */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-4">
          <div className="h-3 w-16 rounded bg-zinc-800" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1"
            >
              <div className="h-5 w-5 rounded-full bg-zinc-700" />
              <div className="h-3 w-16 rounded bg-zinc-700" />
            </div>
          ))}
        </div>
      </div>

      {/* Add game form skeleton */}
      <div className="mb-8 animate-pulse">
        <div className="flex gap-2">
          <div className="h-12 flex-1 rounded-xl bg-zinc-800" />
          <div className="h-12 w-32 rounded-xl bg-zinc-800" />
        </div>
      </div>

      {/* Kanban skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((col) => (
          <div
            key={col}
            className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-950"
          >
            <div className="flex items-center gap-2 rounded-t-xl border-b border-zinc-800 px-4 py-3">
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <div className="h-4 w-24 rounded bg-zinc-800" />
              <div className="ml-auto h-4 w-8 rounded bg-zinc-800" />
            </div>
            <div className="flex flex-col gap-3 p-3">
              {[1, 2].map((card) => (
                <div
                  key={card}
                  className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50"
                >
                  <div className="aspect-[460/215] bg-zinc-800" />
                  <div className="space-y-2 p-3.5">
                    <div className="h-4 w-3/4 rounded bg-zinc-800" />
                    <div className="flex gap-1.5">
                      <div className="h-4 w-14 rounded bg-zinc-800" />
                      <div className="h-4 w-16 rounded bg-zinc-800" />
                    </div>
                    <div className="h-3 w-28 rounded bg-zinc-800/50" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
