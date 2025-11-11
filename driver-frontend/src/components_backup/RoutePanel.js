import React from "react";

export default function RoutePanel({ routes, onSelect }) {
  // If predictions exist, show those; else show placeholder demo routes
  const routeOptions = routes?.length
    ? routes
    : [
        {
          id: "demo1",
          name: "Fastest Route",
          duration: "22 min",
          distance: "15.2 km",
          primary: true,
          label: "Recommended",
        },
        {
          id: "demo2",
          name: "Alternative Route",
          duration: "28 min",
          distance: "18.1 km",
        },
        {
          id: "demo3",
          name: "Scenic Route",
          duration: "35 min",
          distance: "21.8 km",
        },
      ];

  return (
    <div className="route-panel">
      <h3>Route Options</h3>
      {routeOptions.map((r) => (
        <div
          key={r.id}
          className={`route-item ${r.primary ? "primary" : ""}`}
          onClick={() => onSelect?.(r)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" ? onSelect?.(r) : null)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
            <span className="title">{r.name}</span>
            {/* Prediction badges */}
            {r.label && (
              <span
                className={`pred-badge ${
                  /best/i.test(r.label)
                    ? "best"
                    : /worst/i.test(r.label)
                    ? "worst"
                    : ""
                }`}
              >
                {r.label}
              </span>
            )}
            {typeof r.confidence === "number" && (
              <span className="pred-conf">
                {Math.round(r.confidence * 100)}% conf.
              </span>
            )}
          </div>

          {/* If ML provided these, show; else the demo values */}
          <div className="meta">
            {r.duration && <span>{r.duration}</span>}
            {r.distance && <span>{r.distance}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
