import React, { useEffect, useRef, useState } from "react";

export default function RoutePreviewForm({
  open,
  onClose,
  onSubmit,
  isGuest = true,
}) {
  // shared fields
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // guest-only demo bits
  const [search, setSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // signed-in (user) extras
  const [departAt, setDepartAt] = useState(""); // datetime-local
  const [routeType, setRouteType] = useState("fastest");
  const [recurring, setRecurring] = useState(false);

  const firstRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // reset each time it opens (keeps things fresh for demo)
    setFrom("");
    setTo("");

    setSearch("");
    setShowPreview(false);

    setDepartAt("");
    setRouteType("fastest");
    setRecurring(false);

    setTimeout(() => firstRef.current?.focus(), 0);
    return () => (document.body.style.overflow = prev);
  }, [open]);

  if (!open) return null;

  function handleSubmit(e) {
    e?.preventDefault?.();

    if (isGuest) {
      setShowPreview(true);
      onSubmit?.({ from, to });
      return;
    }

    // signed-in payload includes planning options
    onSubmit?.({
      from,
      to,
      departAt, // e.g. "2025-09-29T12:30"
      routeType, // "fastest" | "shortest" | "no-tolls" | "eco"
      recurring, // boolean
    });
  }

  const title = isGuest ? "Route Preview" : "Plan Your Route";
  const headerIcon = isGuest ? "📍" : "🛫";

  return (
    <div
      className="rpf-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="rpf-card" onClick={(e) => e.stopPropagation()}>
        <button className="rpf-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        {/* Header */}
        <div className="rpf-header">
          <span className="rpf-ico" aria-hidden>
            {headerIcon}
          </span>
          <h3 className="rpf-title">{title}</h3>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rpf-form">
          <label className="rpf-label">From</label>
          <input
            ref={firstRef}
            className="rpf-input"
            placeholder="Enter starting point..."
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />

          <label className="rpf-label">To</label>
          <input
            className="rpf-input"
            placeholder="Enter destination..."
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />

          {/* Signed-in only fields */}
          {!isGuest && (
            <>
              <label className="rpf-label">Departure Time</label>
              <input
                type="datetime-local"
                className="rpf-input"
                value={departAt}
                onChange={(e) => setDepartAt(e.target.value)}
              />

              <label className="rpf-label">Route Type</label>
              <select
                className="rpf-input"
                value={routeType}
                onChange={(e) => setRouteType(e.target.value)}
              >
                <option value="fastest">Fastest Route</option>
                <option value="shortest">Shortest Route</option>
                <option value="no-tolls">Avoid Tolls</option>
                <option value="eco">Eco-friendly</option>
              </select>

              <div
                className="rpf-row"
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span aria-hidden>🔁</span>
                  <div className="rpf-label" style={{ margin: 0 }}>
                    Recurring Commute
                  </div>
                </div>
                <label
                  style={{
                    marginLeft: "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={(e) => setRecurring(e.target.checked)}
                  />
                  <span>{recurring ? "On" : "Off"}</span>
                </label>
              </div>
            </>
          )}

          <button type="submit" className="rpf-btn rpf-btn-primary">
            {isGuest ? "Get Route Preview" : "Plan Route"}
          </button>
        </form>

        {/* Guest-only preview & location search (keeps your original demo) */}
        {isGuest && (
          <>
            {(showPreview || (from && to)) && (
              <div className="rpf-section">
                <div className="rpf-card-inner">
                  <div className="rpf-section-title">Route Preview</div>
                  <div className="rpf-meta">
                    <span className="rpf-meta-item">🕒 30 min</span>
                    <span className="rpf-meta-item">📍 15 km</span>
                  </div>

                  <div className="rpf-alert">
                    <div className="rpf-alert-ico" aria-hidden>
                      📈
                    </div>
                    <div>
                      <div className="rpf-alert-title">Traffic Impact</div>
                      <div className="rpf-alert-text">
                        Moderate traffic expected
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="rpf-subtitle">Location Search</div>
            <div className="rpf-search-row">
              <span className="rpf-search-ico" aria-hidden>
                🔎
              </span>
              <input
                className="rpf-search"
                placeholder="Search location for traffic conditions.."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {search && (
              <div className="rpf-location-card">
                <div className="rpf-location-title">{search}</div>
                <div className="rpf-alert">
                  <div className="rpf-alert-ico" aria-hidden>
                    🚌
                  </div>
                  <div>
                    <div className="rpf-alert-title">Traffic Conditions</div>
                    <div className="rpf-alert-text">
                      Moderate traffic expected, currently evening peak hours
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
