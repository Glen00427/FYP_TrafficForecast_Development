import React, { useEffect, useMemo, useRef, useState } from "react";

export default function RoutePreviewSheet({ onSubmit, isGuest = true }) {
  // ----- snap points (recomputed on resize) -----
  const getSnapPoints = () => {
    const vh = Math.max(window?.innerHeight || 0, 640);
    const FULL = Math.round(vh - 12); // small safe edge
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

  // Publish live height via CSS var (for FAB positioning)
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--rps-height", `${sheetHeight}px`);
    return () => root.style.removeProperty("--rps-height");
  }, [sheetHeight]);

  // Recompute snaps on resize and keep the current snap state
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

  // Hide ALL map FABs whenever not collapsed
  useEffect(() => {
    const root = document.documentElement;
    if (mode !== "collapsed") root.classList.add("hide-map-fabs");
    else root.classList.remove("hide-map-fabs");
    return () => root.classList.remove("hide-map-fabs");
  }, [mode]);

  // ----- drag handling -----
  function beginDrag(e) {
    if (mode === "form") return; // no drag in full form
    dragging.current = true;
    document.documentElement.classList.add("hide-map-fabs");

    startY.current = e.clientY ?? (e.touches?.[0]?.clientY || 0);
    startH.current = sheetHeight;

    try {
      sheetRef.current?.setPointerCapture?.(e.pointerId);
    } catch {}
  }

  function onDrag(e) {
    if (!dragging.current) return;
    const y = e.clientY ?? (e.touches?.[0]?.clientY || 0);
    const dy = startY.current - y; // drag up = increase height
    const next = clamp(startH.current + dy, snaps.COLLAPSED, snaps.FULL);
    setSheet((s) => ({ ...s, sheetHeight: next }));
  }

  function endDrag() {
    if (!dragging.current) return;
    dragging.current = false;

    // snap
    const NEAR_TOP_PX = 24;
    if (sheetHeight >= snaps.FULL - NEAR_TOP_PX) return openForm();

    const ratio = sheetHeight / snaps.FULL;
    if (ratio > 0.45) return openExpanded();
    return collapse();
  }

  // ----- static preview bits for the lower demo card -----
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

  // ----- submit handlers (guest vs user) -----
  function handleGuestSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const from = form.get("from")?.toString().trim();
    const to = form.get("to")?.toString().trim();
    onSubmit?.(from, to);
  }

  function handleUserSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const from = form.get("from")?.toString().trim();
    const to = form.get("to")?.toString().trim();
    const departAt = form.get("departAt")?.toString() || "";
    const routeType = form.get("routeType")?.toString() || "fastest";
    const recurring = form.get("recurring") === "on";
    onSubmit?.(from, to, { departAt, routeType, recurring });
  }

  // UI bits that differ by guest/user
  const title = isGuest ? "Route Preview" : "Plan Your Route";
  const headerIcon = isGuest ? "📡" : "🛫";

  return (
    <div
      ref={sheetRef}
      className={`rps-sheet ${mode !== "collapsed" ? "is-open" : ""} ${
        mode === "form" ? "rps-full" : ""
      }`}
      style={{
        height: sheetHeight,
        transition: dragging.current ? "none" : "height 160ms ease",
      }}
      onPointerMove={onDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseMove={onDrag}
      onMouseUp={endDrag}
      onTouchMove={onDrag}
      onTouchEnd={endDrag}
    >
      {/* Top chrome */}
      {mode === "form" ? (
        <div className="rps-header">
          <span className="rps-h-ico" aria-hidden>
            {headerIcon}
          </span>
          <h3 className="rps-h-title">{title}</h3>
          <button className="rps-close" aria-label="Close" onClick={collapse}>
            ✕
          </button>
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
        {/* ========= GUEST (collapsed/expanded recent list) ========= */}
        {mode !== "form" && isGuest && (
          <>
            <div className="rps-recent-title">Recent</div>
            <div className="rps-recent-list">
              {[
                { t: "Bugis+", s: "201 Victoria St, Singapore 188067" },
                {
                  t: "Changi Airport T3",
                  s: "65 Airport Blvd., Singapore 819663",
                },
                {
                  t: "Our Tampines Hub",
                  s: "1 Tampines Walk, Singapore 528523",
                },
              ].map((r, i, a) => (
                <div
                  key={r.t}
                  className={`rps-recent-row ${
                    i === a.length - 1 ? "is-last" : ""
                  }`}
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

        {/* ========= GUEST (full form) ========= */}
        {mode === "form" && isGuest && (
          <>
            <form
              className="rps-form rps-form--pretty"
              onSubmit={handleGuestSubmit}
            >
              <label className="rps-label" htmlFor="rps-from">
                From
              </label>
              <input
                id="rps-from"
                name="from"
                className="rps-input rps-input--lg"
                placeholder="Enter starting point…"
              />

              <label className="rps-label" htmlFor="rps-to">
                To
              </label>
              <input
                id="rps-to"
                name="to"
                className="rps-input rps-input--lg"
                placeholder="Enter destination…"
              />

              <button
                className="rps-btn rps-btn-primary rps-btn--lg"
                type="submit"
              >
                Get Route Preview
              </button>
            </form>

            {/* demo card below */}
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
              <div className="rps-location-title">Our Tampines Hub</div>
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

        {/* ========= USER (full form like your 2nd screenshot) ========= */}
        {mode === "form" && !isGuest && (
          <form
            className="rps-form rps-form--pretty"
            onSubmit={handleUserSubmit}
          >
            <label className="rps-label" htmlFor="rps-from">
              From
            </label>
            <input
              id="rps-from"
              name="from"
              className="rps-input rps-input--lg"
              placeholder="Enter starting point…"
            />

            <label className="rps-label" htmlFor="rps-to">
              To
            </label>
            <input
              id="rps-to"
              name="to"
              className="rps-input rps-input--lg"
              placeholder="Enter destination…"
            />

            <label className="rps-label" htmlFor="rps-depart">
              Departure Time
            </label>
            <input
              id="rps-depart"
              name="departAt"
              type="datetime-local"
              className="rps-input rps-input--lg"
            />

            <label className="rps-label" htmlFor="rps-route-type">
              Route Type
            </label>
            <select
              id="rps-route-type"
              name="routeType"
              className="rps-input rps-input--lg"
              defaultValue="fastest"
            >
              <option value="fastest">Fastest Route</option>
              <option value="shortest">Shortest Route</option>
              <option value="no-tolls">Avoid Tolls</option>
              <option value="eco">Eco-friendly</option>
            </select>

            {/* Recurring row styled with sbm-* switch already in your CSS */}
            <div className="sbm-recurring" style={{ marginTop: 8 }}>
              <div className="sbm-rec-left">
                <span className="sbm-rec-ico">🔁</span>
                <div className="sbm-rec-title">Recurring Commute</div>
              </div>
              <label className={`sbm-switch`}>
                <input
                  type="checkbox"
                  name="recurring"
                  style={{ position: "absolute", inset: 0, opacity: 0 }}
                  aria-label="Enable recurring commute"
                />
                <span className="sbm-switch-knob" />
              </label>
            </div>

            <button
              className="rps-btn rps-btn-primary rps-btn--lg"
              type="submit"
              style={{ marginTop: 10 }}
            >
              ✈️&nbsp; Plan Route
            </button>
          </form>
        )}

        {/* ========= USER (collapsed/expanded) ========= */}
        {mode !== "form" && !isGuest && (
          <>
            {/* For signed-in users, tapping the bar goes straight to form */}
            <div className="rps-recent-title" style={{ marginTop: 6 }}>
              Recent
            </div>
            <div className="rps-recent-list">
              {[
                { t: "Home", s: "Saved address" },
                { t: "Work", s: "Saved address" },
                { t: "Favourite", s: "Your starred places" },
                { t: "Saved", s: "Saved routes" },
              ].map((r, i, a) => (
                <div
                  key={r.t}
                  className={`rps-recent-row ${
                    i === a.length - 1 ? "is-last" : ""
                  }`}
                  onClick={openForm}
                >
                  <span className="rps-recent-ico">📍</span>
                  <div>
                    <div className="rps-recent-title">{r.t}</div>
                    <div className="rps-recent-sub">{r.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
