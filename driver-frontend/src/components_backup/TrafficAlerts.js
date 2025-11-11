import React, { useState } from "react";

const initialAlerts = [
  {
    id: 1,
    title: "Accident reported",
    location: "PIE towards Changi Airport",
    time: "5 min ago",
    severity: "high",
  },
  {
    id: 2,
    title: "Road works",
    location: "Orchard Road, Lane closure",
    time: "15 min ago",
    severity: "medium",
  },
  {
    id: 3,
    title: "Heavy traffic",
    location: "ECP towards city",
    time: "2 min ago",
    severity: "high",
  },
];

export default function TrafficAlerts() {
  const [alerts, setAlerts] = useState(initialAlerts);
  return (
    <div className="alerts">
      {alerts.map((a) => (
        <div key={a.id} className={`alert ${a.severity}`}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <strong>{a.title}</strong>
            <span>{a.location}</span>
            <small>{a.time}</small>
          </div>
          <button
            className="close"
            onClick={() =>
              setAlerts((prev) => prev.filter((x) => x.id !== a.id))
            }
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
