import React from "react";

export default function FloatingMenuButton({ onOpenMenu }) {
  return (
    <button
      className="map-fab menu-fab"
      onClick={onOpenMenu}
      aria-label="Open menu"
      title="Menu"
    >
      ☰
    </button>
  );
}
