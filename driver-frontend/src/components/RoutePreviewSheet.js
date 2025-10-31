import React, { useEffect, useMemo, useRef, useState } from "react";

export default function RoutePreviewSheet({ onSubmit }) {
  // ---------- snap helpers ----------
  const getSnapPoints = () => {
    const vh = Math.max(window?.innerHeight || 0, 640);
    return {
      COLLAPSED: 320,
      EXPANDED: Math.round(vh * 0.62),
      FULL: Math.round(vh - 12),
    };
  };
  const [snaps, setSnaps] = useState(getSnapPoints);
  const [{ mode, sheetHeight }, setSheet] = useState({
    mode: "collapsed",
    sheetHeight: getSnapPoints().COLLAPSED,
  });

  // drag refs
  const sheetRef = useRef(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  // ---------- user context ----------
  const currentUser = window.__APP_USER ?? null;
  const authedId = currentUser?.userid ?? currentUser?.id ?? null;
  const isAuthed =
    authedId != null && authedId !== "" && String(authedId).toLowerCase() !== "local";

  // ---------- form state ----------
  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");

  // ---------- recents (per-user only) ----------
  const [recents, setRecents] = useState([]); // [{label, ts}]

  const userKey = () => `rps:recent:u-${authedId}`;
  const fmtDate = (ts) =>
    new Date(Number(ts) || Date.now()).toLocaleDateString("en-SG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  // Remove legacy global key (prevents leak)
  useEffect(() => {
    try { localStorage.removeItem("rps:recent"); } catch {}
  }, []);

  const normalizeArray = (arr) => {
    // Accept legacy ["Orchard", ...] and new [{label,ts}, ...]
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) =>
        typeof x === "string"
          ? { label: x, ts: Date.now() }
          : { label: String(x?.label ?? ""), ts: Number(x?.ts) || Date.now() }
      )
      .filter((x) => x.label.trim().length > 0);
  };

  const loadRecents = () => {
    if (!isAuthed) {
      setRecents([]);
      return;
    }
    try {
      const raw = localStorage.getItem(userKey());
      const norm = normalizeArray(JSON.parse(raw || "[]"));

      // De-dupe by label (case-insensitive), keep earliest item’s ts order
      const seen = new Set();
      const uniq = [];
      for (const item of norm) {
        const k = item.label.trim().toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          uniq.push(item);
        }
      }
      setRecents(uniq.slice(0, 3));
    } catch {
      setRecents([]);
    }
  };

  useEffect(loadRecents, [isAuthed, authedId]);

  useEffect(() => {
    const onFocus = () => loadRecents();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []); // eslint-disable-line

  const saveRecent = (label) => {
    if (!isAuthed) return;
    const clean = String(label || "").trim();
    if (!clean) return;
    try {
      const key = userKey();
      const raw = localStorage.getItem(key);
      const list = normalizeArray(JSON.parse(raw || "[]"));

      const now = Date.now();
      const lower = clean.toLowerCase();

      // Remove any existing with same label
      const filtered = list.filter((x) => String(x.label).toLowerCase() !== lower);
      const next = [{ label: clean, ts: now }, ...filtered].slice(0, 3);

      localStorage.setItem(key, JSON.stringify(next));
      setRecents(next);
    } catch {
      /* ignore */
    }
  };

  // ---------- UI helpers ----------
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const collapse = () => setSheet({ mode: "collapsed", sheetHeight: snaps.COLLAPSED });
  const openExpanded = () => setSheet({ mode: "expanded", sheetHeight: snaps.EXPANDED });
  const openForm = () => setSheet({ mode: "form", sheetHeight: snaps.FULL });

  // Publish height for FAB layout
  useEffect(() => {
    document.documentElement.style.setProperty("--rps-height", `${sheetHeight}px`);
    return () => document.documentElement.style.removeProperty("--rps-height");
  }, [sheetHeight]);

  // Recompute snaps on resize & preserve snap
  useEffect(() => {
    const onResize = () => {
      const next = getSnapPoints();
      setSnaps(next);
      setSheet((s) => {
        if (s.mode === "collapsed") return { mode: "collapsed", sheetHeight: next.COLLAPSED };
        if (s.mode === "expanded") return { mode: "expanded", sheetHeight: next.EXPANDED };
        return { mode: "form", sheetHeight: next.FULL };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Hide map FABs when open
  useEffect(() => {
    const root = document.documentElement;
    if (mode !== "collapsed") root.classList.add("hide-map-fabs");
    else root.classList.remove("hide-map-fabs");
    return () => root.classList.remove("hide-map-fabs");
  }, [mode]);

  // drag handling
  function beginDrag(e) {
    if (mode === "form") return;
    dragging.current = true;
    document.documentElement.classList.add("hide-map-fabs");
    startY.current = e.clientY ?? (e.touches?.[0]?.clientY || 0);
    startH.current = sheetHeight;
    try { sheetRef.current?.setPointerCapture?.(e.pointerId); } catch {}
  }
  function onDrag(e) {
    if (!dragging.current) return;
    const y = e.clientY ?? (e.touches?.[0]?.clientY || 0);
    const dy = startY.current - y;
    const next = clamp(startH.current + dy, snaps.COLLAPSED, snaps.FULL);
    setSheet((s) => ({ ...s, sheetHeight: next }));
  }
  function endDrag() {
    if (!dragging.current) return;
    dragging.current = false;
    if (sheetHeight >= snaps.FULL - 24) return openForm();
    const ratio = sheetHeight / snaps.FULL;
    if (ratio > 0.45) return openExpanded();
    return collapse();
  }

  // ---------- demo cards ----------
  const preview = useMemo(
    () => ({
      time: "30 min",
      distance: "15 km",
      traffic: "Moderate traffic expected",
      placeTitle: "Our Tampines Hub",
      placeDesc: "Moderate traffic expected, currently evening peak hours",
    }),
    []
  );

  // ---------- submit ----------
  function handleSubmit(e) {
    e.preventDefault();
    const from = String(fromValue || "").trim();
    const to = String(toValue || "").trim();
    if (to) saveRecent(to);
    onSubmit?.(from, to, { source: "sheet" });
  }

  // clicking a recent -> open form & prefill "To"
  function handleRecentClick(item) {
    setToValue(String(item?.label || ""));
    openForm();
    setTimeout(() => document.getElementById("rps-to")?.focus?.(), 0);
  }

  const title = "Route Preview";
  const headerIcon = "📡";

  return (
    <div
      ref={sheetRef}
      className={`rps-sheet ${mode !== "collapsed" ? "is-open" : ""} ${mode === "form" ? "rps-full" : ""}`}
      style={{ height: sheetHeight, transition: dragging.current ? "none" : "height 160ms ease" }}
      onPointerMove={onDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseMove={onDrag}
      onMouseUp={endDrag}
      onTouchMove={onDrag}
      onTouchEnd={endDrag}
    >
      {/* Header / handle */}
      {mode === "form" ? (
        <div className="rps-header">
          <span className="rps-h-ico" aria-hidden>{headerIcon}</span>
          <h3 className="rps-h-title">{title}</h3>
          <button className="rps-close" aria-label="Close" onClick={collapse}>✕</button>
        </div>
      ) : (
        <>
          <div
            className="rps-handle"
            onPointerDown={beginDrag}
            onMouseDown={beginDrag}
            onTouchStart={beginDrag}
            aria-label="Drag to expand"
            role="button"
          />
          <div
            className="rps-search-row"
            onClick={openForm}
            onMouseDown={(e) => e.preventDefault()}
            aria-label="Open route preview form"
          >
            <span className="rps-search-leading">≡</span>
            <span className="rps-search-label">{title}</span>
            <span className="rps-search-trailing">🔎</span>
          </div>
        </>
      )}

      <div className="rps-body">
        {/* Recents */}
        {mode !== "form" && (
          <>
            <div className="rps-recent-title">Recent</div>
            <div className="rps-recent-list">
              {!isAuthed && (
                <div className="rps-recent-row is-last">
                  <span className="rps-recent-ico">🕒</span>
                  <div>
                    <div className="rps-recent-title">No recent destinations</div>
                    <div className="rps-recent-sub">Sign in to view your recent searches</div>
                  </div>
                </div>
              )}

              {isAuthed && recents.length === 0 && (
                <div className="rps-recent-row is-last">
                  <span className="rps-recent-ico">🕒</span>
                  <div>
                    <div className="rps-recent-title">No recent destinations</div>
                    <div className="rps-recent-sub">Search a destination to get started</div>
                  </div>
                </div>
              )}

              {isAuthed &&
                recents.map((item, i) => (
                  <div
                    key={`${item.label}-${item.ts}-${i}`}
                    className={`rps-recent-row ${i === recents.length - 1 ? "is-last" : ""}`}
                    onClick={() => handleRecentClick(item)}
                  >
                    <span className="rps-recent-ico">🕒</span>
                    <div>
                      <div className="rps-recent-title">{item.label}</div>
                      <div className="rps-recent-sub">{fmtDate(item.ts)}</div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}

        {/* Full form */}
        {mode === "form" && (
          <>
            <form className="rps-form rps-form--pretty" onSubmit={handleSubmit}>
              <label className="rps-label" htmlFor="rps-from">From</label>
              <input
                id="rps-from"
                name="from"
                className="rps-input rps-input--lg"
                placeholder="Enter starting point…"
                value={fromValue}
                onChange={(e) => setFromValue(e.target.value)}
              />

              <label className="rps-label" htmlFor="rps-to">To</label>
              <input
                id="rps-to"
                name="to"
                className="rps-input rps-input--lg"
                placeholder="Enter destination…"
                value={toValue}
                onChange={(e) => setToValue(e.target.value)}
              />

              <button className="rps-btn rps-btn-primary rps-btn--lg" type="submit" style={{ marginTop: 10 }}>
                Get Route Preview
              </button>
            </form>

            {/* Demo cards */}
            <div className="rps-card">
              <div className="rps-card-title">Route Preview</div>
              <div className="rps-meta">
                <div className="rps-meta-item">🕒 {preview.time}</div>
                <div className="rps-meta-item">📍 {preview.distance}</div>
              </div>
              <div className="rps-alert rps-alert--amber">
                <span className="rps-alert-ico">📈</span>
                <div>
                  <div className="rps-alert-title">Traffic Impact</div>
                  <div className="rps-alert-text">{preview.traffic}</div>
                </div>
              </div>
            </div>

            <div className="rps-subtitle">Location Search</div>
            <div className="rps-search-input rps-search-input--pill">
              <span className="rps-search-ico">🔎</span>
              <input
                className="rps-input-ghost"
                placeholder="Search location for traffic conditions…"
                defaultValue={preview.placeTitle}
              />
            </div>

            <div className="rps-location-card rps-card">
              <div className="rps-location-title">{preview.placeTitle}</div>
              <div className="rps-alert rps-alert--amber rps-alert--light">
                <span className="rps-alert-ico">🚌</span>
                <div>
                  <div className="rps-alert-title">Traffic Conditions</div>
                  <div className="rps-alert-text">{preview.placeDesc}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
