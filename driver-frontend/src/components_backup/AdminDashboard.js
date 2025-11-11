import React from "react";

export default function AdminDashboard() {
  // Demo data, replace with real API data
  const kpis = [
    {
      label: "Total Incidents",
      value: 6,
      delta: "+12% vs last month",
      up: true,
    },
    {
      label: "Active Incidents",
      value: 3,
      delta: "-8% vs last month",
      up: false,
    },
    { label: "Total Users", value: 58, delta: "+21% vs last month", up: true },
    {
      label: "Routes Planned",
      value: 37,
      delta: "+20% vs last month",
      up: true,
    },
  ];

  const types = [
    { name: "Breakdown", n: 1, color: "violet" },
    { name: "Accident", n: 2, color: "pink" },
    { name: "Roadwork", n: 1, color: "amber" },
    { name: "Community Report", n: 1, color: "green" },
    { name: "Weather", n: 1, color: "sky" },
  ];

  const severities = [
    { name: "Low", n: 1, color: "green" },
    { name: "Medium", n: 2, color: "amber" },
    { name: "High", n: 1, color: "red" },
  ];

  const recent = [
    {
      id: 1,
      road: "Orchard Road",
      tags: ["Accident", "High"],
      desc: "Traffic accident involving two vehicles. Emergency services currently on scene.",
      time: "Aug 17, 1:49 PM",
    },
    {
      id: 2,
      road: "SLE",
      tags: ["Breakdown", "Medium"],
      desc: "Vehicle Breakdown on SLE (towards BKE) at BKE (Woodlands) Exit.",
      time: "Aug 17, 1:45 PM",
    },
  ];

  const mostActive = [
    { name: "John Tan", email: "johntan@gmail.com", routes: 7, rank: 1 },
  ];
  const newUsers = [
    { name: "Emily Lee", email: "emilylee@gmail.com", role: "Admin" },
  ];

  return (
    <div className="ad-wrap">
      {/* Page header */}
      <header className="ad-header">
        <div className="ad-h-icon">📊</div>
        <div>
          <h1 className="ad-h-title">Admin Dashboard</h1>
          <p className="ad-h-sub">System analytics and management overview</p>
        </div>
      </header>

      {/* KPI tiles */}
      <section className="ad-kpis">
        {kpis.map(({ label, value, delta, up }) => (
          <div key={label} className="ad-kpi">
            <div className="ad-kpi-label">{label}</div>
            <div className="ad-kpi-value">{value}</div>
            <div className={`ad-kpi-delta ${up ? "up" : "down"}`}>
              <span className="ad-trend">{up ? "📈" : "📉"}</span>
              {delta}
            </div>
          </div>
        ))}
      </section>

      {/* Two-column content */}
      <section className="ad-grid">
        {/* Incident Analytics */}
        <div className="ad-card">
          <div className="ad-card-title">
            <span className="ad-ico">⚠️</span>
            <span>Incident Analytics</span>
          </div>

          <div className="ad-subtitle">By Type</div>
          <div className="ad-badges">
            {types.map((t) => (
              <span key={t.name} className={`ad-badge ${t.color}`}>
                {t.name}: {t.n}
              </span>
            ))}
          </div>

          <div className="ad-subtitle">By Severity</div>
          <div className="ad-badges">
            {severities.map((s) => (
              <span key={s.name} className={`ad-badge ${s.color}`}>
                {s.name}: {s.n}
              </span>
            ))}
          </div>

          <div className="ad-subtitle">Recent Incidents</div>
          <div className="ad-scroll">
            {recent.map((r) => (
              <article key={r.id} className="ad-incident">
                <div className="ad-incident-row">
                  <span className="ad-dot" aria-hidden />
                  <h4 className="ad-incident-road">{r.road}</h4>
                </div>
                <div className="ad-incident-tags">
                  {r.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`ad-tag ${
                        tag === "High"
                          ? "red"
                          : tag === "Medium"
                          ? "amber"
                          : tag === "Accident"
                          ? "pink"
                          : "slate"
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="ad-incident-desc">{r.desc}</p>
                <div className="ad-incident-time">🕒 {r.time}</div>
              </article>
            ))}
          </div>
        </div>

        {/* User Activity */}
        <div className="ad-card">
          <div className="ad-card-title">
            <span className="ad-ico">🧑‍💻</span>
            <span>User Activity</span>
          </div>

          <div className="ad-subtitle">Most Active Users</div>
          <ul className="ad-userlist">
            {mostActive.map((u) => (
              <li key={u.email} className="ad-user">
                <div className="ad-avatar ad-rank">{u.rank}</div>
                <div className="ad-user-main">
                  <div className="ad-user-name">{u.name}</div>
                  <div className="ad-user-email">{u.email}</div>
                </div>
                <span className="ad-pill">{u.routes} routes</span>
              </li>
            ))}
          </ul>

          <div className="ad-subtitle">New Users</div>
          <ul className="ad-userlist">
            {newUsers.map((u) => (
              <li key={u.email} className="ad-user">
                <div className="ad-avatar">👤</div>
                <div className="ad-user-main">
                  <div className="ad-user-name">{u.name}</div>
                  <div className="ad-user-email">{u.email}</div>
                </div>
                <span className="ad-pill green">{u.role}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
