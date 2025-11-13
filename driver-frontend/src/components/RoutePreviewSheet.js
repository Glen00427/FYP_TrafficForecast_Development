import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CongestionInfo from "./CongestionInfo";

export default function RoutePreviewSheet({
  onSubmit,
  onNavigate,
  predictionData,
  prefillValues,
  onPrefillConsumed,
}) {
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

  // ---------- navigation state ----------
  const [navDestination, setNavDestination] = useState("");
  const [navOriginCoords, setNavOriginCoords] = useState(null);
  const [navOriginLabel, setNavOriginLabel] = useState("");
  const [navOriginWarning, setNavOriginWarning] = useState(null);
  const [navLocStatus, setNavLocStatus] = useState("idle");
  const [navLocError, setNavLocError] = useState(null);

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
    try { localStorage.removeItem("rps:recent"); } catch { }
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

      // De-dupe by label (case-insensitive), keep earliest item's ts order
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

  useEffect(() => {
    if (!prefillValues) return;

    const from = String(prefillValues.from ?? "");
    const to = String(prefillValues.to ?? "");
    const focusTarget = prefillValues.focus === "to" ? "rps-to" : "rps-from";
    const shouldOpen = Boolean(prefillValues.forceOpen) || Boolean(from) || Boolean(to);

    setFromValue(from);
    setToValue(to);

    if (shouldOpen) {
      openForm();
      setTimeout(() => document.getElementById(focusTarget)?.focus?.(), 0);
    }

    onPrefillConsumed?.();
  }, [prefillValues, onPrefillConsumed]);

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
    try { sheetRef.current?.setPointerCapture?.(e.pointerId); } catch { }
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

  const reverseGeocode = useCallback(async ({ lat, lng }) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { "Accept-Language": "en" } }
      );
      if (!res.ok) throw new Error(`Reverse geocode failed (${res.status})`);
      const data = await res.json();
      const label = data?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setNavOriginLabel(label);
      setNavOriginWarning(null);
      setNavLocStatus("ready");
    } catch (err) {
      console.error("Reverse geocode failed:", err);
      setNavOriginLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      setNavOriginWarning("Using coordinates – address unavailable.");
      setNavLocStatus("ready");
    }
  }, []);

  const refreshOrigin = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNavLocStatus("error");
      setNavLocError("Current location is not supported in this browser.");
      setNavOriginCoords(null);
      setNavOriginLabel("");
      setNavOriginWarning(null);
      return;
    }

    setNavLocStatus("loading");
    setNavLocError(null);
    setNavOriginWarning(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setNavOriginCoords(coords);
        setNavLocStatus("resolving");
        reverseGeocode(coords);
      },
      (err) => {
        console.error("Geolocation failed:", err);
        setNavLocStatus("error");
        setNavLocError(err?.message || "Unable to detect current location.");
        setNavOriginCoords(null);
        setNavOriginLabel("");
        setNavOriginWarning(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [reverseGeocode]);

  useEffect(() => {
    refreshOrigin();
  }, [refreshOrigin]);

  // ---------- submit ----------
  function handleSubmit(e) {
    e.preventDefault();
    const from = String(fromValue || "").trim();
    const to = String(toValue || "").trim();
    if (to) saveRecent(to);
    onSubmit?.(from, to, { source: "sheet" });
  }

  function handleNavigationSubmit(e) {
    e.preventDefault();
    const destination = String(navDestination || "").trim();
    if (!destination) {
      alert("Please enter a destination to start navigation.");
      return;
    }

    const originLabel = String(
      navOriginLabel ||
        (navOriginCoords
          ? `${navOriginCoords.lat.toFixed(5)}, ${navOriginCoords.lng.toFixed(5)}`
          : "")
    ).trim();

    if (!originLabel) {
      alert("Current location unavailable. Please allow location access and try again.");
      refreshOrigin();
      return;
    }

    saveRecent(destination);

    const maybePromise = onNavigate?.(originLabel, destination, {
      source: "navigation",
      originCoords: navOriginCoords,
    });

    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise
        .then(() => setNavDestination(""))
        .catch(() => {});
    } else {
      setNavDestination("");
    }
  }

  // clicking a recent -> open form & prefill "To"
  function handleRecentClick(item) {
    setToValue(String(item?.label || ""));
    openForm();
    setTimeout(() => document.getElementById("rps-to")?.focus?.(), 0);
  }

  const title = "Route Preview";
  const headerIcon = "📡";

  // Check if we should show CongestionInfo
  const showCongestionInfo = predictionData != null;

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
        <div className="rps-header">
          <div className="rps-h-group">
            <span className="rps-h-ico" aria-hidden>{headerIcon}</span>
            <h3 className="rps-h-title">{title}</h3>
          </div>
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
        {/* Show CongestionInfo OR Recents */}
        {mode !== "form" && (
          <>
            {showCongestionInfo ? (
              <CongestionInfo predictionData={predictionData} />
            ) : (
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

            {/* Navigation feature */}
            <div className="rps-card rps-nav-card">
              <div className="rps-card-title">Navigation</div>
              <div className="rps-nav-origin" id="rps-nav-origin">
                <div className="rps-nav-label">Origin</div>
                <div className="rps-nav-value">
                  {navLocStatus === "loading" || navLocStatus === "resolving"
                    ? "Detecting your current location…"
                    : navLocStatus === "error"
                    ? "Current location unavailable"
                    : navOriginLabel ||
                      (navOriginCoords
                        ? `${navOriginCoords.lat.toFixed(4)}, ${navOriginCoords.lng.toFixed(4)}`
                        : "Detecting your current location…")}
                </div>
                {navOriginWarning && (
                  <div className="rps-nav-note">{navOriginWarning}</div>
                )}
                {navLocStatus === "error" && navLocError && (
                  <div className="rps-nav-error">{navLocError}</div>
                )}
                <button
                  type="button"
                  className="rps-btn rps-btn-secondary rps-nav-refresh"
                  onClick={refreshOrigin}
                  disabled={navLocStatus === "loading" || navLocStatus === "resolving"}
                >
                  {navLocStatus === "loading" || navLocStatus === "resolving"
                    ? "Locating…"
                    : "Use current location"}
                </button>
              </div>

              <form className="rps-nav-form" onSubmit={handleNavigationSubmit}>
                <label className="rps-label" htmlFor="rps-nav-destination">
                  Destination
                </label>
                <input
                  id="rps-nav-destination"
                  name="navigation-destination"
                  className="rps-input rps-input--lg"
                  placeholder="Enter destination…"
                  value={navDestination}
                  onChange={(e) => setNavDestination(e.target.value)}
                  aria-describedby="rps-nav-origin"
                />
                <button
                  className="rps-btn rps-btn-primary rps-btn--lg"
                  type="submit"
                  disabled={navLocStatus === "loading" || navLocStatus === "resolving"}
                >
                  Start Navigation
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
