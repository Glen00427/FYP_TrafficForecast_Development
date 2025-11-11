import React, { useEffect } from "react";

export default function UserSignInSuccess({
  open,
  onClose,
  onContinue,
  autoCloseMs = 1800,
}) {
  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const t = setTimeout(() => {
      onClose?.();
      onContinue?.();
    }, autoCloseMs);
    return () => clearTimeout(t);
  }, [open, autoCloseMs, onClose, onContinue]);

  if (!open) return null;

  return (
    <div
      className="uss-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Signed in"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="uss-card" onClick={(e) => e.stopPropagation()}>
        <button className="uss-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        {/* Green check icon */}
        <svg width="64" height="64" viewBox="0 0 48 48" aria-hidden="true">
          <circle
            cx="24"
            cy="24"
            r="22"
            fill="#e8f6ee"
            stroke="#22c55e"
            strokeWidth="2"
          />
          <path
            d="M14 24l6 6 14-14"
            fill="none"
            stroke="#22c55e"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <h3 className="uss-title">Signed In!</h3>
        <p className="uss-text">
          You’re now signed in. Redirecting to your dashboard…
        </p>

        <button
          className="uss-btn"
          onClick={() => {
            onClose?.();
            onContinue?.();
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
