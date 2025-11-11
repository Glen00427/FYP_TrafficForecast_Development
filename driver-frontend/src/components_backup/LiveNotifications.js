import React from "react";

export default function LiveNotifications({ open, onClose, items = [] }) {
  if (!open) return null;

  return (
    <div
      className="notif-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Live Updates"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="notif-card" onClick={(e) => e.stopPropagation()}>
        <button className="notif-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <div className="notif-head">
          <span className="notif-head-ico" aria-hidden>
            🔔
          </span>
          <h3 className="notif-title">Live Updates</h3>
        </div>
        <div className="notif-sub">within the last 12 hours</div>

        <div className="notif-list">
          {items.map((n) => (
            <article key={n.id} className="notif-item">
              <div className="notif-time">{n.when}</div>
              <div className="notif-item-title">{n.title}</div>
              <div className="notif-item-desc">{n.desc}</div>
            </article>
          ))}
          {items.length === 0 && (
            <div className="notif-empty">No new updates.</div>
          )}
        </div>
      </div>
    </div>
  );
}
