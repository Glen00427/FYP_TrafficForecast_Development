// driver-frontend/src/components/PredictionDialog.js
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function PredictionDialog({
  result,
  userId,            // ← pass user?.id from App
  onClose,
  onShowRoute,
}) {
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  if (!result) return null;

  const best = result.best || {};
  const alternatives = result.alternatives || [];
  const congestionPercent = Math.round(
    (best.congestionProb ?? best.congestion_prob ?? 0) * 100
  );

  // Try to derive "From" and "To" from the route label/name if present.
  const routeLabel = best.route_name || best.name || "";
  const [derivedFrom, derivedTo] = routeLabel
    .split("→")
    .map((s) => s?.trim());

  // Ensure numeric mins and a varchar distance like "12 km"
  const mins = Number.isFinite(best.duration_min)
    ? Math.round(best.duration_min)
    : Number.isFinite(best.duration)
    ? Math.round(best.duration)
    : 0;

  const kmNumber =
    Number.isFinite(best.distance_km) ? best.distance_km : best.distance || 0;
  const distanceStr = `${Math.round(Number(kmNumber) || 0)} km`;

  async function handleSaveRoute() {
    if (!userId) {
      setToast("Please sign in to save routes.");
      return;
    }

    const from = result.from || derivedFrom || ""; // if your API attaches from/to, it’ll use those
    const to   = result.to   || derivedTo   || "";

    // Minimal guard so we don’t send junk
    if (!from || !to) {
      setToast("Missing From/To.");
      return;
    }

    // Coerce userId to number to satisfy int8 column
    const uid = Number(userId);
    if (!Number.isFinite(uid)) {
      setToast("Invalid user id.");
      return;
    }

    setSaving(true);
    const payload = {
      user_id: uid,
      origin: from,
      destination: to,
      duration: Number.isFinite(mins) ? mins : 0, // int8
      distance: distanceStr,                       // varchar
      // created_at is optional (DB default). If you want to set:
      // created_at: new Date().toISOString().slice(0, 10),
    };

    const { error } = await supabase
      .from("savedRoutes")
      .insert([payload])
      .select()
      .single();

    setSaving(false);
    if (error) {
      setToast(`Save failed: ${error.message}`);
      return;
    }
    setToast("Route saved");
    // hide toast after 1.2s
    setTimeout(() => setToast(""), 1200);
  }

  return (
    <div style={backdrop}>
      <div style={card}>
        {/* Title row with Save button on the RIGHT */}
        <div style={titleRow}>
          <h2 style={{ margin: 0 }}>{best.label || "🚗 Traffic Prediction"}</h2>
          <button
            onClick={handleSaveRoute}
            disabled={saving}
            style={saveBtn}
            title="Save this route"
          >
            {saving ? "⭐ Saving…" : "⭐ Save route"}
          </button>
        </div>

        {/* BEST ROUTE */}
        <div style={{ marginBottom: 20, lineHeight: 1.8 }}>
          <div>
            <strong>Route:</strong>{" "}
            {routeLabel || `${derivedFrom ?? "?"} → ${derivedTo ?? "?"}`}
          </div>
          <div><strong>Status:</strong> {(best.status || "unknown").toString().toUpperCase()}</div>
          <div><strong>Congestion:</strong> {congestionPercent}%</div>
          <div><strong>Duration:</strong> {mins} min</div>
          <div><strong>Distance:</strong> {distanceStr}</div>
          <div>
            <strong>Confidence:</strong>{" "}
            {Math.round((best.confidence ?? 0) * 100)}%
          </div>
        </div>

        {/* ALTERNATIVES */}
        {alternatives.length > 0 && (
          <div style={altsBox}>
            <div style={{ fontWeight: "bold", marginBottom: 10 }}>
              Other Routes:
            </div>
            {alternatives.map((alt, idx) => {
              const altPct = Math.round(
                (alt.congestionProb ?? alt.congestion_prob ?? 0) * 100
              );
              return (
                <div
                  key={idx}
                  style={{
                    marginBottom: 8,
                    fontSize: 14,
                    paddingBottom: 8,
                    borderBottom:
                      idx < alternatives.length - 1 ? "1px solid #ddd" : "none",
                  }}
                >
                  <div>{alt.label} - {altPct}% congested</div>
                  <div style={{ color: "#666", fontSize: 13 }}>
                    {alt.duration_min} min, {alt.distance_km} km
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* NOTE */}
        {result.note && (
          <div style={noteBox}>
            {result.note}
          </div>
        )}

        {/* BUTTONS */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onShowRoute} style={primaryBtn}>Show Route</button>
          <button onClick={onClose} style={ghostBtn}>OK</button>
        </div>

        {/* tiny toast */}
        {toast && (
          <div style={toastBox}>
            <span>⭐ {toast}</span>
            <button style={toastClose} onClick={() => setToast("")}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* styles */
const backdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999999,
};
const card = {
  background: "white",
  padding: 30,
  borderRadius: 10,
  maxWidth: 520,
  width: "92%",
  maxHeight: "80vh",
  overflow: "auto",
};
const titleRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
};
const saveBtn = {
  padding: "10px 14px",
  background: "white",
  border: "1px solid #ddd",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14,
};
const primaryBtn = {
  flex: 1,
  padding: 12,
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 6,
  fontSize: 15,
  cursor: "pointer",
};
const ghostBtn = {
  flex: 1,
  padding: 12,
  background: "white",
  color: "#333",
  border: "1px solid #ccc",
  borderRadius: 6,
  fontSize: 15,
  cursor: "pointer",
};
const altsBox = { marginBottom: 20, padding: 15, background: "#f9f9f9", borderRadius: 5 };
const noteBox = { padding: 10, background: "#e8f5e9", borderRadius: 5, marginBottom: 20, fontSize: 14, color: "#2e7d32" };
const toastBox = {
  position: "fixed",
  left: "50%",
  top: "50%",
  transform: "translate(-50%,-50%)",
  background: "white",
  boxShadow: "0 10px 30px rgba(0,0,0,.12)",
  borderRadius: 10,
  padding: "16px 18px",
  display: "flex",
  alignItems: "center",
  gap: 12,
};
const toastClose = {
  background: "none",
  border: "none",
  color: "#8a2be2",
  cursor: "pointer",
  fontSize: 14,
};
