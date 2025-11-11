import React, { useState, useEffect } from "react";

export default function NotificationsSettings({
  theme = "light",
  onToggleTheme,
  onClose,
}) {
  // Traffic alerts
  const [accident, setAccident] = useState(true);
  const [roadwork, setRoadwork] = useState(false);
  const [congestion, setCongestion] = useState(false);
  const [reroute, setReroute] = useState(false);

  // Audio
  const [audioAlerts, setAudioAlerts] = useState(false);
  const [voiceNav, setVoiceNav] = useState(false);
  const [volume, setVolume] = useState(100);

  // (kept for future use, not shown in mobile sheet)
  const [voiceLang] = useState("en");
  const [darkMode, setDarkMode] = useState(theme === "dark");
  const [forecastRange] = useState("30");
  const [routeType] = useState("fastest");
  const [saveHistory] = useState(false);
  const [pushNoti] = useState(true);
  const [smsNoti] = useState(false);
  const [speedAlerts] = useState(false);
  const [alertDistance] = useState(2);

  useEffect(() => {
    // lock background scroll while sheet is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, []);

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    onToggleTheme?.(next ? "dark" : "light");
  }

  return (
    <div
      className="ns-sheet-backdrop nsm-full nsm-screen"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="ns-sheet nsm-full nsm-screen"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="nsm-header">
          <div className="nsm-title-wrap">
            <span className="nsm-gear">⚙️</span>
            <h2 className="nsm-title">Notifications &amp; Settings</h2>
          </div>
          {onClose && (
            <button className="nsm-close" aria-label="Close" onClick={onClose}>
              ✕
            </button>
          )}
        </div>

        <div className="nsm-content">
          {/* Section: Traffic Alerts */}
          <Section title="Traffic Alert Preferences" icon="🚗">
            <Item
              icon="⚠️"
              title="Accident Alerts"
              desc="Notify about accidents on your route"
              on={accident}
              setOn={setAccident}
            />
            <Item
              icon="🛠️"
              title="Roadwork Alerts"
              desc="Get updates on planned roadworks"
              on={roadwork}
              setOn={setRoadwork}
            />
            <Item
              icon="🕒"
              title="Congestion Alerts"
              desc="Alerts about heavy traffic areas"
              on={congestion}
              setOn={setCongestion}
            />
            <Item
              icon="↩️"
              title="Auto Re-routing"
              desc="Automatically find alternative routes"
              on={reroute}
              setOn={setReroute}
            />
          </Section>

          {/* Section: Audio */}
          <Section title="Audio Alert Configuration" icon="🔊">
            <Item
              icon="🔔"
              title="Audio Alerts"
              desc="Sound notifications for incidents"
              on={audioAlerts}
              setOn={setAudioAlerts}
            />
            <Item
              icon="🎙️"
              title="Voice Navigation"
              desc="Spoken turn-by-turn directions"
              on={voiceNav}
              setOn={setVoiceNav}
            />

            <div className="nsm-field">
              <div className="nsm-field-top">
                <span className="nsm-label">Volume Level</span>
                <span className="nsm-hint">{volume}</span>
              </div>
              <input
                className="nsm-range"
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value, 10))}
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ---------- Mobile subcomponents ---------- */

function Section({ title, icon, children }) {
  return (
    <section className="nsm-card">
      <div className="nsm-card-head">
        <span className="nsm-card-ico" aria-hidden>
          {icon}
        </span>
        <h3 className="nsm-card-title">{title}</h3>
      </div>
      <div className="nsm-card-body">{children}</div>
    </section>
  );
}

function Item({ icon, title, desc, on, setOn }) {
  return (
    <div className="nsm-item">
      <div className="nsm-item-left">
        <span className="nsm-item-ico" aria-hidden>
          {icon}
        </span>
        <div className="nsm-item-text">
          <div className="nsm-item-title">{title}</div>
          <div className="nsm-item-desc">{desc}</div>
        </div>
      </div>
      <Switch on={on} setOn={setOn} />
    </div>
  );
}

function Switch({ on, setOn }) {
  const toggle = () => (typeof setOn === "function" ? setOn(!on) : setOn());
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`nsm-switch ${on ? "is-on" : ""}`}
      onClick={toggle}
      aria-label="toggle"
    >
      <span className="nsm-switch-knob" />
    </button>
  );
}
