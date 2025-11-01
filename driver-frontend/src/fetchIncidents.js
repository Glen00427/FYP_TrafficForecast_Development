// driver-frontend/src/fetchIncidents.js
import { supabase } from './lib/supabaseClient';

export async function fetchIncidents() {
  const { data, error } = await supabase
    .from("lta-incidents")
    .select("id, type, message, latitude, longitude, ts")
    .order("ts", { ascending: false });

  if (error) {
    console.error("Error fetching incidents:", error);
    return [];
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 16 * 60 * 60 * 1000);

  //  Filter only incidents from the last 24 hours
  const recentData = data.filter((row) => {
    const incidentTime = new Date(row.ts);
    return incidentTime >= twentyFourHoursAgo;
  });

  // Map Supabase columns to the format used by LiveTrafficMap
   return recentData
    .map((row) => ({
      id: row.id,
      title: row.type,
      message: row.message,
      lat: parseFloat(row.latitude),
      lng: parseFloat(row.longitude)
    }))
    .filter((r) => !isNaN(r.lat) && !isNaN(r.lng));
}
