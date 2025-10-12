import React from "react";
import LiveTrafficMap from "./LiveTrafficMap";

export default function TrafficMap({ selectedRoute, incidents = [] }) {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <LiveTrafficMap
        routeGeometry={selectedRoute?.geometry}
        incidents={incidents}
      />
    </div>
  );
}

/*
export default function TrafficMap() {
  return (
    <div
      className="map-container"
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        color: "#64748b",
        fontWeight: 600,
        borderTop: "1px solid #e5e7eb",
        borderBottom: "1px solid #e5e7eb",
        background: "#eef2f7",
      }}
    >
      Map goes here (placeholder). UI is working.
    </div>
  );
}
*/
