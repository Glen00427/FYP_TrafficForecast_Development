// src/components/fetchIncidents.js
import { supabase_second } from "../lib/supabase_second";

export async function fetchIncidents() {
  const { data, error } = await supabase_second
    .from("incidents")
    .select("id, type, message, latitude, longitude, ts")
    .order("ts", { ascending: false });

  if (error) {
    console.error("Error fetching incidents:", error);
    return [];
  }

  // Map Supabase columns to the format used by LiveTrafficMap
   return data
    .map((row) => ({
      id: row.id,
      title: row.message,
      lat: parseFloat(row.latitude),
      lng: parseFloat(row.longitude)
    }))
    .filter((r) => !isNaN(r.lat) && !isNaN(r.lng));
}
