import fetch from "node-fetch";
import "dotenv/config";

const LTA_KEY = process.env.LTA_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || "lta-incidents";
const EXPIRATION_HOURS = 6;

let lastTs = null;

// 🔥 Assign severity purely from `type`
function determineSeverity(type = "") {
  const t = type.toLowerCase();

  if (t.includes("accident") || t.includes("road block")) return "High";
  if (t.includes("heavy traffic") || t.includes("roadwork")) return "Medium";
  if (t.includes("obstacle") || t.includes("unattended vehicle") || t.includes("vehicle breakdown"))
    return "Low";

  return "Unknown";
}

// 🔹 Fetch incidents from LTA DataMall
async function fetchIncidents() {
  let url = "https://datamall2.mytransport.sg/ltaodataservice/TrafficIncidents";
  if (lastTs) url += `?$filter=CreatedDt gt ${lastTs}&$top=500`;
  else url += "?$top=500";

  const response = await fetch(url, {
    headers: { AccountKey: LTA_KEY, accept: "application/json" },
  });

  if (!response.ok) throw new Error(`LTA API error: ${response.statusText}`);

  const data = await response.json();
  return data.value || [];
}

// 🔹 Save incidents into Supabase
async function saveToSupabase(incidents) {
  if (!incidents.length) return;

  const now = new Date();

  const payload = incidents.map((r) => ({
    type: r.Type || "",
    severity: determineSeverity(r.Type), // ✅ Only from `type`
    message: r.Message || "",
    latitude: r.Latitude ? parseFloat(r.Latitude) : null,
    longitude: r.Longitude ? parseFloat(r.Longitude) : null,
    ts: now.toISOString(),
  }));

  console.log("Payload sample:", payload.slice(0, 2)); // 👀 Check before sending

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(payload),
  });

  const resultText = await res.text();
  console.log("Supabase response:", resultText);

  if (incidents.length) lastTs = incidents[incidents.length - 1].CreatedDt;
}

// 🔹 Main function
async function main() {
  try {
    const incidents = await fetchIncidents();
    console.log(`Fetched incidents: ${incidents.length}`);

    if (incidents.length) {
      await saveToSupabase(incidents);
      console.log("✅ Incidents updated in Supabase successfully.");
    } else {
      console.log("No new incidents found.");
    }
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

// Run once
main();
