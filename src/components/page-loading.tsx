function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

export function PageLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <Shimmer className="h-3 w-32" />
      <div className="mt-3">
        <Shimmer className="h-8 w-72" />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Shimmer key={i} className="h-24" />
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Shimmer className="h-64" />
        <div className="space-y-3">
          <Shimmer className="h-32" />
          <Shimmer className="h-32" />
        </div>
      </div>
      <div className="mt-8">
        <Shimmer className="h-56" />
      </div>
    </main>
  );
}
