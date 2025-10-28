import fetch from 'node-fetch';
import 'dotenv/config';

const LTA_KEY = process.env.LTA_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || 'incidents';
const EXPIRATION_HOURS = 6;

// Store last timestamp in memory for simplicity (or Supabase)
let lastTs = null;

async function fetchIncidents() {
  let url = 'https://datamall2.mytransport.sg/ltaodataservice/TrafficIncidents';
  if (lastTs) url += `?$filter=CreatedDt gt ${lastTs}&$top=500`;
  else url += '?$top=500';

  const response = await fetch(url, {
    headers: { 'AccountKey': LTA_KEY, 'accept': 'application/json' }
  });

  const data = await response.json();
  return data.value || [];
}

async function saveToSupabase(incidents) {
  if (!incidents.length) return;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPIRATION_HOURS * 3600 * 1000).toISOString();
  
  const payload = incidents.map(r => ({
    type: r.Type || '',
    message: r.Message || '',
    latitude: r.Latitude || null,
    longitude: r.Longitude || null,
    ts: now.toISOString(),
  }));

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(payload)
  });

  const result = await res.text();
  console.log('Supabase response:', result);

  // Update lastTs
  if (incidents.length) lastTs = incidents[incidents.length - 1].CreatedDt;
}

async function main() {
  try {
    const incidents = await fetchIncidents();
    console.log('Fetched incidents:', incidents.length);
    await saveToSupabase(incidents);
  } catch (err) {
    console.error('Error:', err);
  }
}

// Run once
main();
