import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function PredictionDialog({ result, onClose, onShowRoute, user }) {
  if (!result) return null;

  const best = result.best || {};
  const alternatives = result.alternatives || [];
  const congestionPercent = Math.round(
    (best.congestionProb ?? best.congestion_prob ?? 0) * 100
  );

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  async function handleSaveRoute() {
    const currentUser = user || window.__APP_USER || null;
    const uidRaw = currentUser?.userid ?? currentUser?.id;
    const uid = uidRaw != null ? Number(uidRaw) : null;

    if (!uid) {
      setToast({ type: "err", msg: "Please sign in to save routes." });
      return;
    }

    const from =
      result?.query?.from ||
      best?.origin ||
      (best?.route_name?.split(" → ")[0] ?? "");
    const to =
      result?.query?.to ||
      best?.destination ||
      (best?.route_name?.split(" → ")[1] ?? "");

    const mins = Number(best?.duration_min ?? best?.duration ?? 0);
    const distanceStr = (() => {
      const km = best?.distance_km ?? best?.distance;
      return km != null ? `${km} km` : "";
    })();

    // YYYY-MM-DD (local)
    const now = new Date();
    const createdAt = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);

    const payload = {
      user_id: uid,
      origin: from,
      destination: to,
      duration: Number.isFinite(mins) ? mins : 0,
      distance: distanceStr,
      created_at: createdAt,
    };

    setSaving(true);
    try {
      const { error } = await supabase
        .from("savedRoutes")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("save route error:", error);
        setToast({ type: "err", msg: error.message || "Save failed." });
      } else {
        setToast({ type: "ok", msg: "Route saved" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
      }}
    >
      <div
        style={{
          background: "white",
          padding: 30,
          borderRadius: 10,
          maxWidth: 520,
          width: "92%",
          maxHeight: "80vh",
          overflow: "auto",
          position: "relative",
        }}
      >
        {/* Header + Save */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <h2 style={{ margin: 0, flex: 1 }}>{best.label || "🚗 Traffic Prediction"}</h2>
          <button
            onClick={handleSaveRoute}
            disabled={saving}
            style={{
              padding: "10px 14px",
              background: "white",
              border: "1px solid #ddd",
              borderRadius: 8,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
            }}
            title="Save to Saved Routes"
          >
            {saving ? "⭐ Saving…" : "⭐ Save route"}
          </button>
        </div>

        {/* BEST ROUTE */}
        <div style={{ marginBottom: 20, lineHeight: 1.8 }}>
          <div><strong>Route:</strong> {best.route_name || best.name}</div>
          <div><strong>Status:</strong> {String(best.status || "").toUpperCase()}</div>
          <div><strong>Congestion:</strong> {congestionPercent}%</div>
          <div><strong>Duration:</strong> {best.duration_min ?? best.duration ?? "-"} min</div>
          <div><strong>Distance:</strong> {best.distance_km ?? best.distance ?? "-"} km</div>
          <div><strong>Confidence:</strong> {best.confidence != null ? Math.round(best.confidence * 100) : "-"}%</div>
        </div>

        {/* ALTERNATIVES */}
        {alternatives.length > 0 && (
          <div style={{ marginBottom: 20, padding: 15, background: "#f9f9f9", borderRadius: 5 }}>
            <div style={{ fontWeight: "bold", marginBottom: 10 }}>Other Routes:</div>
            {alternatives.map((alt, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: 8,
                  fontSize: 14,
                  paddingBottom: 8,
                  borderBottom: idx < alternatives.length - 1 ? "1px solid #ddd" : "none",
                }}
              >
                <div>
                  {alt.label} - {Math.round((alt.congestionProb ?? alt.congestion_prob ?? 0) * 100)}% congested
                </div>
                <div style={{ color: "#666", fontSize: 13 }}>
                  {alt.duration_min} min, {alt.distance_km} km
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NOTE */}
        {result.note && (
          <div style={{ padding: 10, background: "#e8f5e9", borderRadius: 5, marginBottom: 20, fontSize: 14, color: "#2e7d32" }}>
            {result.note}
          </div>
        )}

        {/* BUTTONS */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onShowRoute}
            style={{
              flex: 1,
              padding: 12,
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 5,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Show Route
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: 12,
              background: "white",
              color: "#333",
              border: "1px solid #ccc",
              borderRadius: 5,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            OK
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.35)",
            zIndex: 1000000,
          }}
          onClick={() => setToast(null)}
        >
          <div
            style={{
              background: "white",
              padding: "16px 20px",
              borderRadius: 10,
              minWidth: 260,
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ fontWeight: 600, display: "flex", gap: 8 }}>
              <span>⭐</span>
              <span>{toast.msg}</span>
            </div>
            <div style={{ textAlign: "right", marginTop: 8 }}>
              <button
                onClick={() => setToast(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#7c3aed",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
