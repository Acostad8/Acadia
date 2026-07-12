export function PageLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="h-3 w-32 animate-pulse rounded-full bg-white/10" />
      <div className="mt-3 h-8 w-64 animate-pulse rounded-xl bg-white/10" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
          />
        ))}
      </div>
      <div className="mt-10 h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
    </main>
  );
}
