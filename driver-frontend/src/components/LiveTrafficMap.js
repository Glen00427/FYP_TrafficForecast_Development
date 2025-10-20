//api key: AIzaSyDzxaLJiJgdKYs2WqTPrmeT2k8JoHTj8kk

// driver-frontend/src/components/LiveTrafficMap.js
import React, { useMemo, useRef, useCallback } from "react";
import {
  GoogleMap,
  LoadScript,
  TrafficLayer,
  Polyline,
  Marker,
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

export default function LiveTrafficMap({
  routeGeometry = [],
  incidents = []
}) {
  const mapRef = useRef(null);
  const path = useMemo(() => normalizePath(routeGeometry), [routeGeometry]);

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
          />
        ))}
      </GoogleMap>
    </LoadScript>
  );
}