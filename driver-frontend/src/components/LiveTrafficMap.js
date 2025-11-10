//api key: AIzaSyDzxaLJiJgdKYs2WqTPrmeT2k8JoHTj8kk

// driver-frontend/src/components/LiveTrafficMap.js
import React, { useMemo, useRef, useCallback, useEffect } from "react";
import {
  GoogleMap,
  LoadScript,
  TrafficLayer,
  Polyline,
  Marker,
  InfoWindow
} from "@react-google-maps/api";

const SG = { lat: 1.3521, lng: 103.8198 }; // Singapore center
const containerStyle = { width: "100%", height: "100%" };

// Your Google Maps API key
const GOOGLE_MAPS_KEY = "AIzaSyDzxaLJiJgdKYs2WqTPrmeT2k8JoHTj8kk";

/**
 * Normalize coordinates to Google Maps format {lat, lng}
 * Handles both GeoJSON [lng, lat] and Google [lat, lng] formats
 */
function normalizePath(routeGeometry) {
  if (!routeGeometry || routeGeometry.length === 0) return [];

  // Already {lat, lng} objects
  if (typeof routeGeometry[0] === "object" && "lat" in routeGeometry[0]) {
    return routeGeometry;
  }

  // Array pairs - detect if [lng, lat] or [lat, lng]
  return routeGeometry
    .map((pt) => {
      if (!Array.isArray(pt) || pt.length < 2) return null;
      const [a, b] = pt;
      // Singapore heuristic: lng ~103, lat ~1
      // If first number > second, it's [lng, lat] (GeoJSON)
      const isGeoJSON = Math.abs(a) > Math.abs(b);
      return isGeoJSON ? { lat: b, lng: a } : { lat: a, lng: b };
    })
    .filter(Boolean);
}

async function getRoadName(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    return data?.address?.road || "Unknown road";
  } catch (err) {
    console.error("Reverse geocode failed:", err);
    return "Unknown road";
  }
}

export default function LiveTrafficMap({ 
  routeGeometry = [], 
  incidents = [],
  user,
  isGuest
}) {
  const mapRef = useRef(null);
  const path = useMemo(() => normalizePath(routeGeometry), [routeGeometry]);

  const [selectedIncident, setSelectedIncident] = React.useState(null);
  
  const onMapLoad = useCallback(
    (map) => {
      mapRef.current = map;
      
      // If we have a route, fit bounds to it
      if (path.length > 1) {
        const bounds = new window.google.maps.LatLngBounds();
        path.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
      } else {
        // Default to Singapore center
        map.setCenter(SG);
        map.setZoom(12);
      }
    },
    [path]
  );

  // Auto-zoom to route when it changes 
  useEffect(() => {
    if (mapRef.current && path.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      mapRef.current.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    }
  }, [path]);


  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_KEY}>
      <GoogleMap
        key={incidents.length}
        mapContainerStyle={containerStyle}
        onLoad={onMapLoad}
        options={{
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
        }}
      >
        {/* Live traffic overlay */}
        <TrafficLayer />

        {/* Draw route polyline */}
        {path.length > 1 && (
          <Polyline
            path={path}
            options={{
              strokeColor: "#2563eb",
              strokeOpacity: 1.0,
              strokeWeight: 6,
            }}
          />
        )}

        {/* Optional incident markers */}
        {!isGuest &&
        incidents.map((i) => {
            const iconUrl = i.source === "User" ? "./userwarning.png" : "./warning.png";
            const icon =
              window.google && window.google.maps
                ? {
                    url: iconUrl,
                    scaledSize: new window.google.maps.Size(30, 30),
                    anchor: new window.google.maps.Point(17, 34),
                  }
                : null;

            return (
              <Marker
                key={i.id}
                position={{ lat: i.lat, lng: i.lng }}
                title={i.title}
                icon={icon}
                onClick={async () => {
                  const roadName = await getRoadName(i.lat, i.lng);
                  setSelectedIncident({ ...i, roadName });
                }}
              />
            );
          })}

        {selectedIncident && (() => {
        let dateTime = null;
        let cleanMessage = selectedIncident.message || "";

        // Use pre-formatted createdAt for user incidents
        if (selectedIncident.source === "User" && selectedIncident.createdAt) {
          dateTime = selectedIncident.createdAt; 
        } else {
          // Fallback: parse date/time from message
          const match = cleanMessage.match(/\((\d{1,2}\/\d{1,2})\)(\d{2}:\d{2})/);
          if (match) {
            const [fullMatch, datePart, timePart] = match;
            dateTime = `${datePart} ${timePart}`;
            cleanMessage = cleanMessage.replace(fullMatch, "").trim();
          }
        }

        return (
          <InfoWindow
            position={{
              lat: selectedIncident.lat,
              lng: selectedIncident.lng,
            }}
            onCloseClick={() => setSelectedIncident(null)}
          >
          
            <div style={{ maxWidth: "240px" }}>
              {dateTime && (
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>
                  🕒 {dateTime}
                </p>
              )}
              
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                <h4 style={{ margin: 0, fontWeight: "bold" }}>
                  {selectedIncident.title
                    ? selectedIncident.title.charAt(0).toUpperCase() +
                      selectedIncident.title.slice(1)
                    : "Incident"}
                </h4>

                {selectedIncident.severity && (
                  <p
                    style={{
                      margin: 0,
                      fontWeight: "bold",
                      color:
                        selectedIncident.severity.toLowerCase() === "high"
                          ? "red"
                          : selectedIncident.severity.toLowerCase() === "medium"
                          ? "orange"
                          : "green",
                    }}
                  >
                    {selectedIncident.severity.charAt(0).toUpperCase() +
                      selectedIncident.severity.slice(1)}
                  </p>
                )}
              </div>

              {selectedIncident.roadName && (
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold", fontStyle: "italic" }}>
                  {selectedIncident.roadName}
                </p>
              )}

              {selectedIncident.fullAddress && (
                <p style={{ margin: "0 0 5px 0", fontStyle: "italic" }}>
                  {selectedIncident.fullAddress}
                </p>
              )}
              
              {selectedIncident.photo_url && (
                <div style={{ margin: "5px 0" }}>
                  <img
                    src={selectedIncident.photo_url}
                    alt="Incident"
                    style={{
                      width: "100%",
                      maxHeight: "150px",
                      objectFit: "cover",
                      borderRadius: "6px",
                    }}
                  />
                </div>
              )}
              <p style={{ margin: 0 }}>{cleanMessage}</p>

              {selectedIncident.user_id && (
                <p style={{ margin: "0 0 5px 0", color: "#555" }}>
                  <br />
                  👤 Submitted by: User #{selectedIncident.user_id}
                </p>
              )}

            </div>
          </InfoWindow>
        );
      })()}
      </GoogleMap>
    </LoadScript>
  );
}
