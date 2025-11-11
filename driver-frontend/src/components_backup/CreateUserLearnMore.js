// CreateUserLearnMore.jsx
import React, { useEffect } from "react";

export default function CreateUserLearnMore({
  open,
  onClose,
  onGoBack,
  fullScreen = false, // NEW — mirrors CreateUserAccount
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [open]);

  if (!open) return null;

  const backdropClass = `culm-backdrop${
    fullScreen ? " culm-backdrop--full" : ""
  }`;
  const cardClass = `culm-card${fullScreen ? " culm-card--full" : ""}`;

  return (
    <div
      className={backdropClass}
      role="dialog"
      aria-modal="true"
      aria-label="What You Unlock"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className={cardClass} onClick={(e) => e.stopPropagation()}>
        <button className="culm-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <div className="culm-titlebar">
          <span className="culm-q">❓</span>
          <h3 className="culm-title">What You Unlock</h3>
        </div>

        <ul className="culm-list">
          <li className="culm-item">
            <span className="culm-ico">🚗</span>
            <span className="culm-text">
              Core Navigation & Travel Time Estimation
            </span>
          </li>
          <li className="culm-item">
            <span className="culm-ico">⚠️</span>
            <span className="culm-text">Traffic & Incident Awareness</span>
          </li>
          <li className="culm-item">
            <span className="culm-ico">🔔</span>
            <span className="culm-text">Alerts & Driver Assistance</span>
          </li>
          <li className="culm-item">
            <span className="culm-ico">👥</span>
            <span className="culm-text">Community-Driven Features</span>
          </li>
          <li className="culm-item">
            <span className="culm-ico">🖊️</span>
            <span className="culm-text">User Experience Customisation</span>
          </li>
        </ul>

        <button
          className="culm-btn"
          onClick={() => (onGoBack ? onGoBack() : onClose?.())}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
