import React, { useState, useRef, useEffect } from "react";

export default function SearchBar({ onPlanRoute, onPredict }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [depart, setDepart] = useState(""); // ISO string for <input type="datetime-local">
  const [routeType, setRouteType] = useState("fastest");
  const [recurring, setRecurring] = useState(false);

  const firstRef = useRef(null);

  // focus first field when modal opens
  useEffect(() => {
    if (open && firstRef.current) firstRef.current.focus();
  }, [open]);

  // prevent body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [open]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!from || !to) {
      alert("Please enter both ‘From’ and ‘To’.");
      return;
    }
    onPlanRoute?.(from, to);
    setOpen(false);
  }

  function handlePredictClick() {
    if (!from || !to) {
      alert("Please enter both ‘From’ and ‘To’.");
      return;
    }
    onPredict?.(from, to);
  }

  return (
    <>
      {/* launcher button lives where SearchBar used to be */}
      <div className="sb-launch">
        <button className="sb-open-btn" onClick={() => setOpen(true)}>
          <span className="sb-open-ico">🧭</span>
          <span>Plan Route</span>
        </button>
      </div>

      {!open ? null : (
        <div
          className="sbm-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Plan your route"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="sbm-card" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sbm-header">
              <div className="sbm-title">
                <span className="sbm-title-ico">🧭</span>
                <h3>Plan Your Route</h3>
              </div>
              <button
                aria-label="Close"
                className="sbm-close"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form className="sbm-form" onSubmit={handleSubmit}>
              <label className="sbm-label">From</label>
              <input
                ref={firstRef}
                className="sbm-input"
                placeholder="Enter starting point…"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />

              <label className="sbm-label">To</label>
              <input
                className="sbm-input"
                placeholder="Enter destination…"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />

              <label className="sbm-label">Departure Time</label>
              <div className="sbm-row">
                <input
                  className="sbm-input"
                  type="datetime-local"
                  value={depart}
                  onChange={(e) => setDepart(e.target.value)}
                  placeholder="dd/mm/yyyy --:-- --"
                />
                <span className="sbm-icon-inline" aria-hidden>
                  📅
                </span>
              </div>

              <label className="sbm-label">Route Type</label>
              <div className="sbm-row">
                <select
                  className="sbm-input"
                  value={routeType}
                  onChange={(e) => setRouteType(e.target.value)}
                >
                  <option value="fastest">Fastest Route</option>
                  <option value="shortest">Shortest Distance</option>
                  <option value="scenic">Scenic Route</option>
                  <option value="eco">Eco (Fuel-saving)</option>
                </select>
                <span className="sbm-icon-inline" aria-hidden>
                  ▾
                </span>
              </div>

              {/* Recurring toggle */}
              <div className="sbm-recurring">
                <div className="sbm-rec-left">
                  <span className="sbm-rec-ico">🔁</span>
                  <div className="sbm-rec-text">
                    <div className="sbm-rec-title">Recurring Commute</div>
                  </div>
                </div>
                <button
                  type="button"
                  className={`sbm-switch ${recurring ? "is-on" : ""}`}
                  role="switch"
                  aria-checked={recurring}
                  onClick={() => setRecurring((v) => !v)}
                >
                  <span className="sbm-switch-knob" />
                </button>
              </div>

              <div className="sbm-actions">
                {onPredict && (
                  <button
                    type="button"
                    className="sbm-btn sbm-btn-ghost"
                    onClick={handlePredictClick}
                  >
                    Predict
                  </button>
                )}
                <button type="submit" className="sbm-btn sbm-btn-primary">
                  <span className="sbm-btn-ico">🧭</span> Plan Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
