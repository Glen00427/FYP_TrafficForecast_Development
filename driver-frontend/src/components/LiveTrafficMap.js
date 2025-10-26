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
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status === "OK") {
    const address = data.results[0];
    const routeComp = address.address_components.find(c =>
      c.types.includes("route")
    );
    return routeComp?.long_name || address.formatted_address;
  } else {
    console.error("Reverse geocode failed", data.status);
    return null;
  }
}

export default function LiveTrafficMap({ 
  routeGeometry = [], 
  incidents = [] 
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

  // Auto-zoom to route when it changes (this is the key addition!)
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
        {incidents.map((i) => (
          <Marker 
            key={i.id} 
            position={{ lat: i.lat, lng: i.lng }} 
            title={i.title} 
            onClick={async () => {
              const roadName = await getRoadName(i.lat, i.lng);
              setSelectedIncident({ ...i, roadName }); 
          />
        ))}

        {/* InfoWindow for selected incident */}
        {selectedIncident && (
          <InfoWindow
            position={{ lat: selectedIncident.lat, lng: selectedIncident.lng }}
            onCloseClick={() => setSelectedIncident(null)}
          >
            <div style={{ maxWidth: "200px" }}>
              <h4 style={{ margin: "0 0 5px 0" }}>{selectedIncident.title}</h4>
              {selectedIncident.roadName && (
                <p style={{ margin: 0 }}>
                  <strong>Road:</strong> {selectedIncident.roadName}
                </p>
              )}
              {selectedIncident.message && (
                <p style={{ margin: 0 }}>{selectedIncident.message}</p>
              )}
          </div>
        </InfoWindow>
  )}     
      </GoogleMap>
    </LoadScript>
  );
}
