import React from "react";
import LiveTrafficMap from "./LiveTrafficMap";

export default function TrafficMap({ selectedRoute, incidents = [], isGuest }) {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <LiveTrafficMap
        routeGeometry={selectedRoute?.geometry}
        incidents={incidents}
        isGuest={isGuest}
      />
    </div>
  );
}

