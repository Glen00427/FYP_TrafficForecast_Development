// src/components/fetchIncidents.js
import { supabase_second } from "../lib/supabase_second";

export async function fetchIncidents() {
  const { data, error } = await supabase
    .from("incidents")
    .select("id, type, message, latitude, longitude, ts")
    .order("ts", { ascending: false });

  if (error) {
    console.error("Error fetching incidents:", error);
    return [];
  }

  // Map Supabase columns to the format used by LiveTrafficMap
  return data.map((i) => ({
    id: i.id,
    title: `${i.type}: ${i.message}`,
    lat: i.latitude,
    lng: i.longitude,
    timestamp: i.ts,
  }));
}
