import React, { useEffect, useMemo, useRef, useState } from "react";

export default function RoutePreviewSheet({ onSubmit, isGuest = true }) {
  // ----- snap points (recomputed on resize) -----
  const getSnapPoints = () => {
    const vh = Math.max(window?.innerHeight || 0, 640);
    const FULL = Math.round(vh - 12);
    const EXPANDED = Math.round(vh * 0.62);
    const COLLAPSED = 320;
    return { COLLAPSED, EXPANDED, FULL };
  };

  const [snaps, setSnaps] = useState(getSnapPoints);
  const [{ mode, sheetHeight }, setSheet] = useState({
    mode: "collapsed", // 'collapsed' | 'expanded' | 'form'
    sheetHeight: getSnapPoints().COLLAPSED,
  });

  // ----- refs used while dragging -----
  const sheetRef = useRef(null);
  const startY = useRef(0);
  const startH = useRef(0);
  const dragging = useRef(false);

  // ----- helpers -----
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const collapse = () =>
    setSheet({ mode: "collapsed", sheetHeight: snaps.COLLAPSED });
  const openExpanded = () =>
    setSheet({ mode: "expanded", sheetHeight: snaps.EXPANDED });
  const openForm = () => setSheet({ mode: "form", sheetHeight: snaps.FULL });

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--rps-height", `${sheetHeight}px`);
    return () => root.style.removeProperty("--rps-height");
  }, [sheetHeight]);

  useEffect(() => {
    const onResize = () => {
      const next = getSnapPoints();
      setSnaps(next);
      setSheet((s) => {
        if (s.mode === "collapsed")
          return { mode: "collapsed", sheetHeight: next.COLLAPSED };
        if (s.mode === "expanded")
          return { mode: "expanded", sheetHeight: next.EXPANDED };
        return { mode: "form", sheetHeight: next.FULL };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (mode !== "collapsed") root.classList.add("hide-map-fabs");
    else root.classList.remove("hide-map-fabs");
    return () => root.classList.remove("hide-map-fabs");
  }, [mode]);

  // ----- drag handling -----
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
    const NEAR_TOP_PX = 24;
    if (sheetHeight >= snaps.FULL - NEAR_TOP_PX) return openForm();
    const ratio = sheetHeight / snaps.FULL;
    if (ratio > 0.45) return openExpanded();
    return collapse();
  }

  // ----- demo bits -----
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

  // ===== submit (keep your App.js signature: onSubmit(from, to, options)) =====
  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const from = fd.get("from")?.toString().trim() || "";
    const to = fd.get("to")?.toString().trim() || "";
    onSubmit?.(from, to, { source: "sheet", mode: "user-or-guest-same" });
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
        {mode !== "form" && (
          <>
            <div className="rps-recent-title">Recent</div>
            <div className="rps-recent-list">
              {[
                { t: "Bugis+", s: "201 Victoria St, Singapore 188067" },
                { t: "Changi Airport T3", s: "65 Airport Blvd., Singapore 819663" },
                { t: "Our Tampines Hub", s: "1 Tampines Walk, Singapore 528523" },
              ].map((r, i, a) => (
                <div
                  key={r.t}
                  className={`rps-recent-row ${i === a.length - 1 ? "is-last" : ""}`}
                  onClick={openForm}
                >
                  <span className="rps-recent-ico">🕒</span>
                  <div>
                    <div className="rps-recent-title">{r.t}</div>
                    <div className="rps-recent-sub">{r.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {mode === "form" && (
          <>
            <form className="rps-form rps-form--pretty" onSubmit={handleSubmit}>
              <label className="rps-label" htmlFor="rps-from">From</label>
              <input id="rps-from" name="from" className="rps-input rps-input--lg" placeholder="Enter starting point…" />

              <label className="rps-label" htmlFor="rps-to">To</label>
              <input id="rps-to" name="to" className="rps-input rps-input--lg" placeholder="Enter destination…" />

                <button className="rps-btn rps-btn-primary rps-btn--lg" type="submit" style={{ flex: 1 }}>
                  Get Route Preview
                </button>

            </form>

            {/* demo cards */}
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
              <input className="rps-input-ghost" placeholder="Search location for traffic conditions…" defaultValue={preview.placeTitle} />
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
