export function LoadingSpinner({ text = "Loading…" }: { text?: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "256px", gap: "16px",
    }}>
      <div style={{ position: "relative", width: "40px", height: "40px" }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%",
          border: "3px solid #F1F5F9",
        }}/>
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%",
          border: "3px solid transparent",
          borderTopColor: "#10B981",
          position: "absolute", inset: 0,
          animation: "spin 0.8s linear infinite",
        }}/>
      </div>
      <p style={{ color: "#94A3B8", fontSize: "13px" }}>{text}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
