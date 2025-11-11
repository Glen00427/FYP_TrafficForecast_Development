import React from "react";

export default function BannedDialog({ open, onClose, onAppeal }) {
  if (!open) return null;
  return (
    <div className="gate-backdrop" role="dialog" aria-modal="true">
      <div className="gate-card" onClick={(e) => e.stopPropagation()}>
        <button className="gate-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <div className="gate-logo" aria-hidden>🚫</div>
        <h2 className="gate-title">Your Account Has Been Banned</h2>
        <p className="gate-sub">
          Your account has been banned due to a violation.
        </p>

        <div className="ban-actions">
          <button
            type="button"
            className="sm-user-pill is-ghost"
            onClick={onClose}
          >
            Ok
          </button>

          <button
            type="button"
            className="sm-user-pill"
            onClick={onAppeal}
          >
            Appeal
          </button>
        </div>

      </div>
    </div>
  );
}
