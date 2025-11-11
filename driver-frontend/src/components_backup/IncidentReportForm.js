import React, { useEffect, useRef, useState } from "react";

export default function IncidentReportForm({
  open = true,
  onCancel = () => {},
  onSubmit = () => {},
}) {
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState("");
  const [road, setRoad] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState(null);
  const [gps, setGps] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [open]);

  if (!open) return null;

  const TYPES = [
    { key: "heavy", label: "Heavy Traffic", icon: "🚗" },
    { key: "roadwork", label: "Roadwork", icon: "🚧" },
    { key: "breakdown", label: "Breakdown", icon: "🛠️" },
    { key: "accident", label: "Accident", icon: "⚠️" },
    { key: "weather", label: "Weather", icon: "🌧️" },
    { key: "hazards", label: "Other Hazards", icon: "➕" },
    { key: "police", label: "Police", icon: "👮‍♂️" },
  ];
  const SEVERITIES = ["Low", "Medium", "High"];

  function handleUseGPS() {
    if (!navigator.geolocation) {
      alert("Geolocation not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        setGps(coords);
        if (!road) setRoad(`${coords.lat}, ${coords.lng}`);
      },
      () => alert("Unable to fetch GPS. Please type the location."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    setPhoto(f);
  }

  function submit(e) {
    e.preventDefault();
    if (!type) return alert("Please choose an incident type.");
    if (!severity) return alert("Please choose a severity.");
    if (!road && !fullAddress && !gps)
      return alert("Please provide a location (road, address, or GPS).");

    const payload = {
      type,
      severity,
      location: { road, fullAddress, gps }, // gps: {lat, lng} if provided
      description,
      photo, // File or null
      createdAt: new Date().toISOString(),
    };
    onSubmit(payload);
  }

  return (
    <div className="rif-backdrop rif-backdrop--full" onClick={onCancel}>
      <div
        className="rif-card rif-card--sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="rif-header">
          <div className="rif-header-left">
            <span className="rif-type-icon" aria-hidden>
              📍
            </span>
            <h3 className="cam-title" style={{ margin: 0 }}>
              Report Traffic Incident
            </h3>
          </div>
          <button
            className="rif-icon-btn"
            type="button"
            onClick={onCancel}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Incident Type */}
        <label className="rif-label" style={{ marginTop: 6 }}>
          Incident Type
        </label>
        <div className="rif-type-grid">
          {TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`rif-type-btn ${type === t.key ? "is-active" : ""}`}
              onClick={() => setType(t.key)}
              aria-pressed={type === t.key}
            >
              <span className="rif-type-icon" aria-hidden>
                {t.icon}
              </span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Severity */}
        <label className="rif-label">Severity</label>
        <div className="rif-row" role="group" aria-label="Severity">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              type="button"
              className={`rif-type-btn ${severity === s ? "is-active" : ""}`}
              onClick={() => setSeverity(s)}
              aria-pressed={severity === s}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Location */}
        <label className="rif-label">Location</label>
        <div className="rif-row">
          <input
            className="rif-input"
            placeholder="Enter road name"
            value={road}
            onChange={(e) => setRoad(e.target.value)}
          />
          <button type="button" className="rif-gps-btn" onClick={handleUseGPS}>
            📍 Use GPS
          </button>
        </div>
        <input
          className="rif-input rif-input--full"
          placeholder="Full address (optional)"
          value={fullAddress}
          onChange={(e) => setFullAddress(e.target.value)}
        />

        {/* Description */}
        <label className="rif-label">Description</label>
        <textarea
          className="rif-input rif-textarea"
          placeholder="Describe what you have observed..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Photo */}
        <label className="rif-label">Add Photo (optional)</label>
        <div
          className="rif-upload"
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") && fileRef.current?.click()
          }
        >
          {photo ? (
            <img
              className="rif-upload-preview"
              src={URL.createObjectURL(photo)}
              alt="Selected"
              onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
            />
          ) : (
            <div className="rif-upload-placeholder">
              <div style={{ fontSize: 24, marginBottom: 6 }}>📷</div>
              Tap to add photo
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleFile}
          />
        </div>

        {/* Actions */}
        <div className="rif-footer">
          <button
            type="button"
            className="rif-btn rif-btn--ghost"
            onClick={onCancel}
          >
            Cancel
          </button>
          {/* Use base rif-btn + an existing blue primary class from your CSS */}
          <button
            type="submit"
            className="rif-btn sbm-btn-primary"
            onClick={submit}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
