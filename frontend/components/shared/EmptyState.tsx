import Link from "next/link";

interface Props {
  message?: string;
  showUploadLink?: boolean;
}

export function EmptyState({
  message = "No data yet. Upload a bank statement to get your full financial analysis.",
  showUploadLink = true,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl gradient-navy flex items-center justify-center text-3xl">📁</div>
      <p className="text-slate-500 max-w-xs text-sm">{message}</p>
      {showUploadLink && (
        <Link href="/upload"
          className="px-5 py-2.5 gradient-emerald text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
          Upload Statement →
        </Link>
      )}
    </div>
  );
}
