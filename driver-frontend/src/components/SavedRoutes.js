import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

function formatDuration(mins) {
  const m = Math.max(0, Math.round(Number(mins ?? 0)));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${m} min`;
  if (r === 0) return `${h} hr${h > 1 ? "s" : ""}`;
  return `${h} hr${h > 1 ? "s" : ""} ${r} min`;
}
function formatDistance(distStr) {
  if (distStr == null) return "-";
  const s = String(distStr).trim().toLowerCase().replace(/\s+/g, "").replace(/,/g, "");
  const m = s.match(/^([0-9]*\.?[0-9]+)(km|m)$/);
  if (!m) return String(distStr);
  const [, num, unit] = m;
  return `${+num} ${unit}`;
}
function distanceToKm(distStr) {
  const s = String(distStr ?? "").trim().toLowerCase().replace(/\s+/g, "").replace(/,/g, "");
  const m = s.match(/^([0-9]*\.?[0-9]+)(km|m)$/);
  if (!m) return 0;
  const value = parseFloat(m[1]);
  return m[2] === "km" ? value : value / 1000;
}

export default function SavedRoutes({
  userId,
  active = true,
  routes: initialRoutes,
  onStartTrip,
  onNavigate,
  onAddRoute,
  onDelete,
  onClose,
}) {
  const [routes, setRoutes] = useState(initialRoutes || []);
  const [loading, setLoading] = useState(!initialRoutes);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | fav | rec | recent

  const uid = Number(userId) || 0;

  const fetchRoutes = useCallback(async () => {
    if (!uid) {
      setRoutes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("savedRoutes")
      .select("id, user_id, origin, destination, duration, distance, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("SavedRoutes load error:", error);
      setError(error.message || "Failed to load routes");
      setLoading(false);
      return;
    }

    const mapped = (data || []).map((r) => ({
      id: r.id,
      from: r.origin,
      to: r.destination,
      timeMin: Math.max(0, Math.round(Number(r.duration ?? 0))),
      distanceStr: r.distance ?? "",
      // created_at is DATE 
      date: r.created_at
        ? new Date(`${r.created_at}T00:00:00`).toISOString()
        : new Date().toISOString(),
      favorite: false,
      recurring: false,
    }));

    setRoutes(mapped);
    setLoading(false);
  }, [uid]);

  // initial + when user changes
  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  // re-fetch whenever the page becomes active 
  useEffect(() => {
    if (active) fetchRoutes();
  }, [active, fetchRoutes]);

  // refresh when a route is saved anywhere
  useEffect(() => {
    const onSaved = () => fetchRoutes();
    window.addEventListener("route:saved", onSaved);
    // also refresh when tab regains focus (common UX)
    window.addEventListener("focus", onSaved);
    return () => {
      window.removeEventListener("route:saved", onSaved);
      window.removeEventListener("focus", onSaved);
    };
  }, [fetchRoutes]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "auto";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // client-only toggles
  const toggleFav = (r) =>
    setRoutes((list) => list.map((x) => (x.id === r.id ? { ...x, favorite: !x.favorite } : x)));

  const toggleRecurring = (r) =>
    setRoutes((list) => list.map((x) => (x.id === r.id ? { ...x, recurring: !x.recurring } : x)));

  const doDelete = async (r) => {
    if (!confirm("Delete this saved route?")) return;
    const prev = routes;
    setRoutes((list) => list.filter((x) => x.id !== r.id));
    onDelete?.(r);
    const { error } = await supabase.from("savedRoutes").delete().eq("id", r.id);
    if (error) {
      setRoutes(prev);
      alert("Failed to delete: " + error.message);
    } else {
      // keep UI and DB in sync just in case
      fetchRoutes();
    }
  };

  // search + filters
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = routes;
    if (q) {
      arr = arr.filter((r) => r.from.toLowerCase().includes(q) || r.to.toLowerCase().includes(q));
    }
    if (filter === "fav") arr = arr.filter((r) => r.favorite);
    if (filter === "rec") arr = arr.filter((r) => r.recurring);
    if (filter === "recent") {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      arr = arr.filter((r) => new Date(r.date).getTime() >= cutoff);
    }
    return arr;
  }, [routes, query, filter]);

  /* ---------- UI ---------- */
  return (
    <div className="sr-page">
      <div className="sr-header" style={{ position: "relative" }}>
        {onClose && (
          <button
            aria-label="Close"
            title="Close"
            onClick={onClose}
            className="sr-close"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--border, #e2e2e2)",
              background: "var(--panel, #fff)",
              fontSize: 18,
              lineHeight: "34px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        )}
        <div className="sr-title-wrap">
          <span className="sr-title-icon">⭐</span>
          <h1 className="sr-title">Saved Routes & Favourites</h1>
        </div>
      </div>

      <div className="sr-grid">
        <main className="sr-main">
          <div className="sr-toolbar">
            <div className="sr-search">
              <span className="sr-search-icon">🔎</span>
              <input
                className="sr-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search routes.."
              />
            </div>
            <div className="sr-filters">
              <button className={`sr-chip ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
                All Routes
              </button>
              <button className={`sr-chip ${filter === "fav" ? "active" : ""}`} onClick={() => setFilter("fav")}>
                Favourites
              </button>
              <button className={`sr-chip ${filter === "rec" ? "active" : ""}`} onClick={() => setFilter("rec")}>
                Recurring
              </button>
              <button className={`sr-chip ${filter === "recent" ? "active" : ""}`} onClick={() => setFilter("recent")}>
                Recent
              </button>
              <button
                type="button"
                className="sr-add-btn"
                onClick={() => onAddRoute?.()}
                title="Add saved route"
                aria-label="Add saved route"
              >
                ➕ Add Route
              </button>
            </div>
          </div>

          {loading && <div className="sr-empty">Loading routes…</div>}
          {error && <div className="sr-empty" style={{ color: "crimson" }}>{error}</div>}

          {!loading && !error && (
            <div className="sr-list">
              {filtered.map((r) => (
                <article key={r.id} className="sr-route-card">
                  <div className="sr-route-head">
                    <div className="sr-route-head-left">
                      <span className="sr-pin">📍</span>
                      <div className="sr-route-title">
                        {r.from} <span className="sr-arrow">→</span> {r.to}
                      </div>
                    </div>
                    <div className="sr-route-head-actions">
                      <button className="sr-icon-btn" title="Toggle favourite" onClick={() => toggleFav(r)}>
                        {r.favorite ? "⭐" : "☆"}
                      </button>
                      <button className="sr-icon-btn" title="Toggle recurring" onClick={() => toggleRecurring(r)}>
                        🔁
                      </button>
                      <button className="sr-icon-btn" title="Delete" onClick={() => doDelete(r)}>
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="sr-meta">
                    <span className="sr-meta-item">⏱️ {formatDuration(r.timeMin)}</span>
                    <span className="sr-meta-item">🚗 {formatDistance(r.distanceStr)}</span>
                    <span className="sr-meta-item">📅 {new Date(r.date).toLocaleDateString()}</span>
                  </div>

                  <div className="sr-actions">
                    <button className="sr-btn sr-btn-ghost" onClick={() => onNavigate?.(r)}>
                      ✈️ Navigate
                    </button>
                    <button className="sr-btn sr-btn-primary" onClick={() => onStartTrip?.(r)}>
                      Start Trip
                    </button>
                  </div>
                </article>
              ))}
              {filtered.length === 0 && (
                <div className="sr-empty">No routes found. Try clearing filters or saving a route.</div>
              )}
            </div>
          )}
        </main>

        <aside className="sr-aside">
          <div className="sr-card">
            <h3 className="sr-card-title">📈 Route Statistics</h3>
            <div className="sr-kv"><span>Total Routes</span><strong>{routes.length}</strong></div>
            <div className="sr-kv"><span>Favourites</span><strong>{routes.filter((r) => r.favorite).length}</strong></div>
            <div className="sr-kv"><span>Recurring</span><strong>{routes.filter((r) => r.recurring).length}</strong></div>
            <div className="sr-kv">
              <span>Avg. Distance</span>
              <strong>
                {routes.length
                  ? (routes.reduce((s, r) => s + distanceToKm(r.distanceStr), 0) / routes.length).toFixed(2)
                  : "0.00"} km
              </strong>
            </div>
          </div>

          <div className="sr-card">
            <h3 className="sr-card-title">📊 Travel Analytics</h3>
            <div className="sr-kv-sm">
              <span>Most Visited</span>
              <strong>
                {(() => {
                  const counts = routes.reduce((m, r) => ((m[r.to] = (m[r.to] || 0) + 1), m), {});
                  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
                })()}
              </strong>
            </div>
            <div className="sr-kv-sm">
              <span>Average Trip Time</span>
              <strong>
                {routes.length
                  ? Math.round(routes.reduce((s, r) => s + (r.timeMin || 0), 0) / routes.length)
                  : 0} minutes
              </strong>
            </div>
            <div className="sr-kv-sm"><span>Total Trips</span><strong>{routes.length} routes planned</strong></div>
          </div>

          <div className="sr-card">
            <h3 className="sr-card-title">🗓️ Recurring Commutes</h3>
            <div className="sr-muted">No recurring commutes set up.</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
