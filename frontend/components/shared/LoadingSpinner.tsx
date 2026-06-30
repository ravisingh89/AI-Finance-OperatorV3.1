export function LoadingSpinner({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="relative w-12 h-12">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200"/>
        <div className="w-12 h-12 rounded-full border-4 border-t-emerald-500 animate-spin absolute inset-0"/>
      </div>
      <p className="text-slate-500 text-sm">{text}</p>
    </div>
  );
}
