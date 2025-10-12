//api key: AIzaSyDzxaLJiJgdKYs2WqTPrmeT2k8JoHTj8kk

import React, { useMemo } from "react";
import {
  GoogleMap,
  LoadScript,
  TrafficLayer,
  Polyline,
  Marker,
} from "@react-google-maps/api";

const SG = { lat: 1.3521, lng: 103.8198 }; // Singapore center
const containerStyle = { width: "100%", height: "100%" };

// 🔑 Insert your API key here
const GOOGLE_MAPS_KEY = "AIzaSyDzxaLJiJgdKYs2WqTPrmeT2k8JoHTj8kk";

export default function LiveTrafficMap({
  center = SG,
  zoom = 12,
  routeGeometry, // [{lat,lng}, ...] or [[lng,lat], ...]
  incidents = [], // [{ id, lat, lng, title }]
}) {
  const path = useMemo(() => {
    if (!routeGeometry) return null;
    if (Array.isArray(routeGeometry) && routeGeometry[0]?.lat !== undefined) {
      return routeGeometry;
    }
    if (Array.isArray(routeGeometry) && Array.isArray(routeGeometry[0])) {
      return routeGeometry.map(([lng, lat]) => ({ lat, lng }));
    }
    return null;
  }, [routeGeometry]);

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_KEY}>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={zoom}>
        {/* 🔴 Live traffic overlay */}
        <TrafficLayer />

        {/* 🔵 Selected route (optional) */}
        {path && (
          <Polyline
            path={path}
            options={{ strokeWeight: 6, strokeColor: "#2563eb" }}
          />
        )}

        {/* 🟢 Incident markers (optional) */}
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
