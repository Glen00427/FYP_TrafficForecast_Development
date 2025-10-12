import React from "react";

export default function CreateAccountSuccess({ open, onClose, onLogin }) {
  if (!open) return null;

  return (
    <div
      className="acm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Account created"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="acm-card" onClick={(e) => e.stopPropagation()}>
        <button className="acm-close" aria-label="Close" onClick={onClose}>
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

        <h3 className="acm-title">Account Created!</h3>
        <p className="acm-text">
          You can now use all our functions! Log in to get started.
        </p>

        <button className="acm-login" onClick={onLogin}>
          Log In
        </button>
      </div>
    </div>
  );
}
