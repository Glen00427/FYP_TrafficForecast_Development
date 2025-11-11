import React, { useEffect } from "react";

export default function ReportIncidentSubmit({
  open,
  onClose,
  autoCloseMs = 0, // e.g. 1800 to auto-dismiss
}) {
  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const id = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(id);
  }, [open, autoCloseMs, onClose]);

  if (!open) return null;

  return (
    <div
      className="ris-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Report submitted"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="ris-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="ris-close"
          aria-label="Close"
          title="Close"
          onClick={onClose}
        >
          ✕
        </button>

        {/* Green check icon */}
        <div style={{ display: "grid", placeItems: "center", marginTop: 2 }}>
          <svg width="64" height="64" viewBox="0 0 48 48" aria-hidden="true">
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              opacity="0.25"
            />
            <path
              d="M16 24.5l5.2 5.2L32 18"
              fill="none"
              stroke="#22c55e"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h3 className="ris-title" style={{ textAlign: "center" }}>
          Report Submitted!
        </h3>
        <p className="ris-text" style={{ textAlign: "center" }}>
          Thank you for helping other drivers. Your report is being reviewed.
        </p>
      </div>
    </div>
  );
}
