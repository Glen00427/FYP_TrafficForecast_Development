import React from "react";

export default function notificationIcon({ onClick, title = "Notifications" }) {
  return (
    <button
      type="button"
      className="floating-notification-fab"
      aria-label={title}
      title={title}
      onClick={onClick}
    >
      <span role="img" aria-hidden>
        🔔
      </span>
    </button>
  );
}
