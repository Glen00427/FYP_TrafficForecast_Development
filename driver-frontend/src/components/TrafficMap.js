import React from "react";
import LiveTrafficMap from "./LiveTrafficMap";
import { fetchIncidents } from "./fetchIncidents";


export default function TrafficMap({ selectedRoute }) {

  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    const loadIncidents = async () => {
      const data = await fetchIncidents();
      setIncidents(data);
    };
    loadIncidents();
    
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

