import React from "react";

export default function FloatingThemeToggle({ theme = "light", onToggle }) {
  const isDark = theme === "dark";
  return (
    <button
      className="map-fab theme-fab"
      onClick={onToggle}
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
