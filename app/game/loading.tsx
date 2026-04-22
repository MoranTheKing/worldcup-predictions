export default function GameLoading() {
  return (
    <div className="max-w-5xl p-4 md:p-8">
      <div className="mb-6 animate-pulse rounded-[2rem] border border-white/8 bg-[rgba(13,27,46,0.72)] p-6">
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="mt-4 h-10 w-56 rounded bg-white/10" />
        <div className="mt-3 h-4 w-80 max-w-full rounded bg-white/10" />
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="h-24 rounded-[1.4rem] bg-white/5" />
          <div className="h-24 rounded-[1.4rem] bg-white/5" />
        </div>
      </div>

      <div className="mb-6 h-14 animate-pulse rounded-2xl border border-white/8 bg-[rgba(13,27,46,0.72)]" />

      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-2xl border border-white/8 bg-[rgba(13,27,46,0.72)]" />
        <div className="h-40 animate-pulse rounded-2xl border border-white/8 bg-[rgba(13,27,46,0.72)]" />
      </div>
    </div>
  );
}
