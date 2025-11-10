// saveIncident.js
import { supabase } from "../lib/supabaseClient";

const BUCKET =
  (typeof process !== "undefined" && process.env?.REACT_APP_SB_BUCKET) ||
  "incident-photos";

const USE_SIGNED_URLS =
  (typeof process !== "undefined" && process.env?.REACT_APP_SB_SIGNED) ===
  "true";

function cleanName(name = "") {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

export async function saveIncidentReport({ form, user }) {
  let photoUrl = null;

  // ---- 1) Optional photo upload ----
  if (form?.photo instanceof File) {
    const userFolder = String(user?.userid ?? user?.id ?? "guest");
    const fname = `${Date.now()}-${cleanName(form.photo.name || "photo.jpg")}`;
    const key = `${userFolder}/${fname}`;

    const { data: up, error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, form.photo, { cacheControl: "3600", upsert: false });

    if (upErr) throw upErr;

    if (USE_SIGNED_URLS) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(up.path, 60 * 60 * 24 * 30);
      photoUrl = signed?.signedUrl ?? null;
    } else {
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(up.path);
      photoUrl = pub?.publicUrl ?? null;
    }
  }

  // ---- 2) Map form → DB row ----
  const user_id =
    typeof user?.userid === "number" || typeof user?.userid === "bigint"
      ? user.userid
      : null;

  const payload = {
    user_id: user?.id,
    incidentType: form?.type || null,
    severity: (form?.severity || "").toLowerCase(),
    location:
      form?.location?.road ||
      (form?.location?.gps
        ? `${form.location.gps.lat},${form.location.gps.lng}`
        : null),
    fullAddress: form?.location?.fullAddress || null,
    latitude: form?.location?.gps?.lat ?? null,
    longitude: form?.location?.gps?.lng ?? null,
    description: form?.description || null,
    photo_url: photoUrl,
    createdAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("incident_report")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}
