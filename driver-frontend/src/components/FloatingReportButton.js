import React from "react";

export default function FloatingReportButton({ onClick }) {
  return (
    <button
      className="map-fab incident-fab"
      onClick={onClick}
      aria-label="Report incident"
      title="Report incident"
    >
      ⚠️
    </button>
  );
}
