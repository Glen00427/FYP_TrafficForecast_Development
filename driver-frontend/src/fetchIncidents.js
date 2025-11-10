// driver-frontend/src/fetchIncidents.js
import { supabase } from "./lib/supabaseClient";


export async function fetchIncidents() {
  try {
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    
    // --- Fetch LTA incidents ---
    const { data: ltaData, error: ltaErr } = await supabase
      .from("lta-incidents")
      .select("id, type, message, severity, latitude, longitude, ts")
      .order("ts", { ascending: false });

    if (ltaErr) throw ltaErr;

    // Filter to last 12 hours
    const recentLta = (ltaData || []).filter((r) => {
      if (!r.latitude || !r.longitude) return false;
      if (!r.ts) return false;
      const ts = new Date(r.ts);
      return ts >= twelveHoursAgo;
    });

    console.log("Fetched LTA incidents:", recentLta);

    // --- Fetch User incidents ---
    const { data: userData, error: userErr } = await supabase
      .from("incident_report")
      .select('id, "incidentType", description, latitude, longitude, severity, user_id, "fullAddress", photo_url,"createdAt"');

    if (userErr) throw userErr;
    console.log("Fetched user incidents:", userData);

    // --- Tag sources and normalize ---
    const ltaIncidents = (recentLta || []).map((r) => {
      const lat = r.latitude;
      const lng = r.longitude;

      return {
        id: `lta-${r.id}`,
        title: r.type || "Traffic Incident",
        message: r.message,
        lat,
        lng,
        severity: r.severity || "Medium",
        source: "LTA",
        user_id: null,
        fullAddress: null,
        createdAt: r.ts,
      };
    });

    const userIncidents = (userData || [])
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => {
        const lat = r.latitude;
        const lng = r.longitude;

        const d = new Date(r.createdAt);
        const day = d.toLocaleString('en-GB', { timeZone: 'Asia/Singapore', day: '2-digit' });
        const month = d.toLocaleString('en-GB', { timeZone: 'Asia/Singapore', month: '2-digit' });
        const hours = d.toLocaleString('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', hour12: false });
        const minutes = d.toLocaleString('en-GB', { timeZone: 'Asia/Singapore', minute: '2-digit' });

        return {
          id: `user-${r.id}-${r.latitude}-${r.longitude}`,
          title: r.incidentType,
          message: r.description,
          lat,
          lng,
          severity: r.severity || "Low",
          source: "User",
          user_id: r.user_id,
          fullAddress: r.fullAddress,
          photo_url: r.photo_url, 
          createdAt: `${day}/${month} ${hours}:${minutes}`,
        };
      });

    // --- Combine both ---
    console.log("Final incidents with delay:", [...ltaIncidents, ...userIncidents]);
    return [...ltaIncidents, ...userIncidents];
  } catch (err) {
    console.error("Error fetching incidents:", err);
    return [];
  }
}
