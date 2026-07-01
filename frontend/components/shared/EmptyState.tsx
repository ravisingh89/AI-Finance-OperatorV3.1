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
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "256px", gap: "16px", textAlign: "center",
    }}>
      <div style={{
        width: "64px", height: "64px", borderRadius: "16px",
        background: "linear-gradient(135deg,#0F172A,#1E293B)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px",
      }}>📁</div>
      <p style={{ color: "#64748B", maxWidth: "280px", fontSize: "13px", lineHeight: "1.5" }}>{message}</p>
      {showUploadLink && (
        <Link href="/upload" style={{
          padding: "10px 22px", background: "linear-gradient(135deg,#10B981,#059669)",
          color: "white", fontSize: "13px", fontWeight: "600", borderRadius: "12px",
          textDecoration: "none",
        }}>
          Upload Statement →
        </Link>
      )}
    </div>
  );
}
