"use client";
import { useState, useEffect } from "react";

export default function AdminPage() {
  const [data, setData]     = useState<Record<string,unknown> | null>(null);
  const [msg, setMsg]       = useState("");
  const [busy, setBusy]     = useState(false);

  const load = async () => {
    const r = await fetch("/api/round");
    setData(await r.json());
  };

  useEffect(() => { load(); }, []);

  const call = async (action: string) => {
    setBusy(true); setMsg("");
    const r = await fetch("/api/round", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const d = await r.json();
    setMsg(JSON.stringify(d, null, 2));
    setBusy(false);
    load();
  };

  const status = (data as Record<string,Record<string,unknown>>)?.config?.status as string ?? "?";

  return (
    <div style={{ fontFamily: "monospace", padding: 32, maxWidth: 600, color: "#f0f0ff", background: "#060608", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: 4, color: "#00ff87", marginBottom: 24 }}>VIBEVOTE ADMIN</h1>

      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 11, letterSpacing: 2, color: "#5a5a7a" }}>CURRENT STATUS: </span>
        <span style={{ color: status === "live" ? "#00ff87" : status === "ended" ? "#ffb800" : "#5a5a7a", fontWeight: 700 }}>
          {status.toUpperCase()}
        </span>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { action: "start", label: "▶ START ROUND", color: "#00ff87", enabled: status !== "live" },
          { action: "end",   label: "■ END ROUND",   color: "#ffb800", enabled: status === "live" },
          { action: "reset", label: "↺ RESET ALL",   color: "#ff3d9a", enabled: true },
        ].map(({ action, label, color, enabled }) => (
          <button key={action}
            disabled={busy || !enabled}
            onClick={() => action === "reset" ? confirm("Reset all scores?") && call(action) : call(action)}
            style={{
              padding: "10px 20px", background: "transparent",
              border: `2px solid ${enabled ? color : "#2a2a40"}`,
              borderRadius: 6, color: enabled ? color : "#2a2a40",
              fontFamily: "monospace", fontWeight: 700, fontSize: 13,
              letterSpacing: 2, cursor: enabled && !busy ? "pointer" : "not-allowed",
              opacity: busy ? 0.5 : 1,
            }}>
            {label}
          </button>
        ))}
      </div>

      {data && (
        <pre style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 6, padding: 16, fontSize: 11, overflow: "auto", color: "#5a5a7a", maxHeight: 300 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}

      {msg && (
        <pre style={{ marginTop: 12, background: "#111118", border: "1px solid #00ff87", borderRadius: 6, padding: 16, fontSize: 11, color: "#00ff87" }}>
          {msg}
        </pre>
      )}
    </div>
  );
}
