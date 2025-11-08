// components/SideMenu.js
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SideMenu({
  open,
  onClose,
  activePage = "live",
  onNavigate,
  isGuest = false,
  onCreateAccount,
  onSignIn,
  onLogout,
  userName = "User",
}) {
  if (!open) return null;

  const go = (page) => {
    onNavigate?.(page);
    onClose?.();
  };
  const nudgeToAuth = () => (onSignIn ? onSignIn() : onCreateAccount?.());

  const appUser =
    (typeof window !== "undefined" && window.__APP_USER) || null;
  const userId = appUser?.id ?? appUser?.userid ?? null;

  const [inboxOpen, setInboxOpen] = useState(false);
  const [loadingInbox, setLoadingInbox] = useState(false);

  const [rejectedIncidents, setRejectedIncidents] = useState([]);
  const [appealsByIncident, setAppealsByIncident] = useState({});

  const keyS = (v) => String(v ?? "");
  const keyN = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const normStatus = (s) => String(s ?? "").trim().toLowerCase();

  async function loadRejectedAndAppeals() {
    if (!userId) return;

    // 1) Get all incidents for user, then filter by status in JS (case-insensitive)
    const { data: inc, error: incErr } = await supabase
      .from("incident_report")
      .select(
        "id, user_id, status, incidentType, location, createdAt, reason"
      )
      .eq("user_id", Number(userId))
      .order("createdAt", { ascending: false })
      .limit(200);

    if (incErr) {
      console.error("Inbox load error:", incErr);
      setRejectedIncidents([]);
      setAppealsByIncident({});
      return;
    }

    const allMine = Array.isArray(inc) ? inc : [];
    const rejectedOnly = allMine.filter(
      (r) => normStatus(r.status) === "rejected"
    );
    setRejectedIncidents(rejectedOnly);

    // 2) Latest appeals for those incidents (ANY author)
    const ids = rejectedOnly.map((r) => r.id).filter((x) => x != null);
    if (!ids.length) {
      setAppealsByIncident({});
      return;
    }

    const { data: aps, error: apErr } = await supabase
      .from("appeals")
      .select(
        "appeals_id, incident_id, user_id, status, message, appeal_type, created_at"
      )
      .in("incident_id", ids)
      .order("created_at", { ascending: false });

    if (apErr) {
      console.error("Appeals load error:", apErr);
      setAppealsByIncident({});
      return;
    }

    const latestMap = {};
    (aps || []).forEach((a) => {
      const ks = keyS(a.incident_id);
      if (!latestMap[ks]) {
        latestMap[ks] = a; // newest first due to order()
        const kn = keyN(a.incident_id);
        if (kn !== null) latestMap[kn] = a;
      }
    });
    setAppealsByIncident(latestMap);
  }

  useEffect(() => {
    if (!open || !userId) return;
    loadRejectedAndAppeals();
  }, [open, userId]);

  useEffect(() => {
    if (!inboxOpen || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingInbox(true);
        await loadRejectedAndAppeals();
      } finally {
        if (!cancelled) setLoadingInbox(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inboxOpen, userId]);

  const [appealFor, setAppealFor] = useState(null);
  const [appealMsg, setAppealMsg] = useState("");
  const [appealSubmitting, setAppealSubmitting] = useState(false);

  async function submitIncidentAppeal() {
    if (!appealFor || !userId) return;
    const body = (appealMsg || "").trim();
    if (!body) return alert("Please write your appeal message.");

    try {
      setAppealSubmitting(true);
      const { error } = await supabase.from("appeals").insert([
        {
          user_id: Number(userId),
          incident_id: appealFor.id,
          appeal_type: "incident_rejection_appeal",
          message: body,
          status: "pending",
          responded_by: null,
        },
      ]);
      if (error) {
        console.error("Appeal insert error:", error);
        alert(error.message || "Failed to submit appeal.");
        return;
      }
      alert("Your appeal has been submitted.");
      setAppealFor(null);
      setAppealMsg("");
      await loadRejectedAndAppeals();
    } finally {
      setAppealSubmitting(false);
    }
  }

  // Build display list:
  // Case 1: rejected incident with NO appeal
  // Case 2: rejected incident with latest appeal.status == 'rejected'
  const displayItems = useMemo(() => {
    const latestFor = (row) =>
      appealsByIncident[row.id] ?? appealsByIncident[keyS(row.id)];
    const hasNoAppeal = (row) => !latestFor(row);
    const isLatestRejected = (row) =>
      !!latestFor(row) && normStatus(latestFor(row).status) === "rejected";

    return (rejectedIncidents || [])
      .filter((row) => hasNoAppeal(row) || isLatestRejected(row))
      .sort(
        (a, b) =>
          new Date(b?.createdAt || 0).getTime() -
          new Date(a?.createdAt || 0).getTime()
      );
  }, [rejectedIncidents, appealsByIncident]);

  const inboxCount = displayItems.length;

  const incidentTitle = (row) =>
    row?.incidentType
      ? `${row.incidentType}${row.location ? " · " + row.location : ""}`
      : `Incident #${row?.id ?? "?"}`;
  const incidentWhen = (row) =>
    row?.createdAt ? new Date(row.createdAt).toLocaleString() : "";

  return (
    <div
      className="sm-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label="Side menu"
    >
      <aside className="sm-panel sm-panel--new" onClick={(e) => e.stopPropagation()}>
        <button className="sm-close" aria-label="Close" title="Close" onClick={onClose}>
          ✕
        </button>

        <div className="sm-brand sm-brand--compact" aria-hidden />

        {isGuest ? (
          <>
            <div className="sm-user-row">
              <div className="sm-avatar">👤</div>
              <div className="sm-user-main">
                <div className="sm-user-name">Guest User</div>
                <button className="sm-user-pill" onClick={() => onSignIn?.()}>Log In</button>
              </div>
            </div>

            <nav className="sm-nav" aria-label="Navigation">
              <button className={"sm-nav-item " + (activePage === "live" ? "is-active" : "")} onClick={() => go("live")}>
                <span className="sm-nav-ico">🧭</span> Plan Route
              </button>
              <button className="sm-nav-item is-locked" onClick={nudgeToAuth} title="Register to unlock">
                <span className="sm-nav-ico">⭐</span> Saved Route &amp; Favourites <span className="sm-lock">🔒</span>
              </button>
              <button className="sm-nav-item is-locked" onClick={nudgeToAuth} title="Register to unlock">
                <span className="sm-nav-ico">⚙️</span> Settings <span className="sm-lock">🔒</span>
              </button>
              <button className="sm-nav-item is-locked" onClick={nudgeToAuth} title="Register to unlock">
                <span className="sm-nav-ico">✉️</span> Inbox <span className="sm-lock">🔒</span>
              </button>
            </nav>
          </>
        ) : (
          <>
            <div className="sm-user-row">
              <div className="sm-avatar" aria-hidden>🟣</div>
              <div className="sm-user-main">
                <div className="sm-user-name">Hello {userName}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="sm-user-pill" onClick={() => go("profile")}>View Profile</button>
                  <button className="sm-user-pill" onClick={() => onLogout?.()} title="Log out">Log out</button>
                </div>
              </div>
            </div>

            <nav className="sm-nav" aria-label="Navigation">
              <button className={"sm-nav-item " + (activePage === "live" ? "is-active" : "")} onClick={() => go("live")} title="Plan Route">
                <span className="sm-nav-ico">📡</span> Plan Route
              </button>
              <button className={"sm-nav-item " + (activePage === "saved" ? "is-active" : "")} onClick={() => go("saved")}>
                <span className="sm-nav-ico">⭐</span> Saved Route &amp; Favourites
              </button>
              <button className={"sm-nav-item " + (activePage === "profile" ? "is-active" : "")} onClick={() => go("profile")}>
                <span className="sm-nav-ico">⚙️</span> Settings
              </button>
              <button className={"sm-nav-item " + (inboxOpen ? "is-active" : "")} onClick={() => setInboxOpen((v) => !v)} title="Inbox">
                <span className="sm-nav-ico">✉️</span>
                Inbox
                {!!inboxCount && <span className="sm-badge" aria-label={`${inboxCount} items`}>{inboxCount}</span>}
              </button>
            </nav>

            {inboxOpen && (
              <section className="sm-cards" aria-live="polite">
                <div className="sm-card">
                  <div className="sm-card-head">
                    <span className="sm-card-ico">📥</span>
                    <h4 className="sm-card-title">Inbox</h4>
                  </div>

                  {loadingInbox ? (
                    <p className="sm-card-text">Loading…</p>
                  ) : displayItems.length === 0 ? (
                    <p className="sm-card-text">No new items.</p>
                  ) : (
                    <ul className="sm-list" style={{ marginTop: 8 }}>
                      {displayItems.map((row) => {
                        const latest =
                          appealsByIncident[row.id] ??
                          appealsByIncident[keyS(row.id)];
                        const appealRejected =
                          !!latest && normStatus(latest.status) === "rejected";

                        return (
                          <li className="sm-list-item" key={row.id}>
                            <div className="sm-list-main">
                              <div className="sm-list-title">{incidentTitle(row)}</div>
                              <div className="sm-list-sub">
                                {appealRejected
                                  ? "⚠️ Your appeal was rejected."
                                  : row?.reason || "Your incident report was rejected."}
                              </div>
                              {row.createdAt && (
                                <div className="sm-list-when">
                                  {incidentWhen(row)}
                                </div>
                              )}
                            </div>
                            <div className="sm-list-cta">
                              {/* Case 1 only: show Appeal button when no appeal exists */}
                              {!appealRejected && !latest && (
                                <button
                                  className="sm-user-pill"
                                  onClick={() => {
                                    setAppealFor(row);
                                    setAppealMsg("");
                                  }}
                                  title="Submit an appeal"
                                >
                                  Appeal
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {Boolean(appealFor) && (
          <div
            className="gate-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAppealFor(null);
            }}
          >
            {(() => {
              const item = appealFor || {};
              const title = item?.incidentType
                ? `${item.incidentType}${item?.location ? " · " + item.location : ""}`
                : `Incident #${item?.id ?? "?"}`;

              return (
                <div className="gate-card" onClick={(e) => e.stopPropagation()} draggable={false}>
                  <button type="button" className="gate-close" aria-label="Close" onClick={() => setAppealFor(null)}>
                    ✕
                  </button>

                  <div className="gate-logo" aria-hidden>📝</div>
                  <h2 className="gate-title">Appeal Incident Rejection</h2>
                  <p className="gate-sub" style={{ marginBottom: 8 }}>{title}</p>

                  <label className="usf-label" htmlFor="inb-appeal-msg">Message</label>
                  <textarea
                    id="inb-appeal-msg"
                    className="usf-input"
                    rows={6}
                    placeholder="Explain why this incident should be reconsidered…"
                    value={appealMsg}
                    onChange={(e) => setAppealMsg(e.target.value)}
                  />

                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button type="button" className="sm-user-pill" onClick={() => setAppealFor(null)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="sm-user-pill"
                      disabled={appealSubmitting}
                      onClick={submitIncidentAppeal}
                    >
                      {appealSubmitting ? "Submitting…" : "Submit Appeal"}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </aside>
    </div>
  );
}
