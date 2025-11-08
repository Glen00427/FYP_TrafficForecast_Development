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
  userIdProp = null,       // <-- new
  userEmailProp = "",      // <-- new
}) {
  if (!open) return null;

  const go = (page) => {
    onNavigate?.(page);
    onClose?.();
  };
  const nudgeToAuth = () => (onSignIn ? onSignIn() : onCreateAccount?.());

  // ---------- helpers ----------
  const keyS = (v) => String(v ?? "");
  const keyN = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const normStatus = (s) => String(s ?? "").trim().toLowerCase();

  // Resolve the numeric users.id we store in incident_report.user_id
  async function resolveDbUserId() {
    // 1) Prefer explicit prop from App
    if (typeof userIdProp === "number") return userIdProp;
    if (typeof userIdProp === "string" && /^\d+$/.test(userIdProp)) {
      return parseInt(userIdProp, 10);
    }

    // 2) Fall back to lookup by email
    const email = (userEmailProp || "").trim().toLowerCase();
    if (email) {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (!error && data?.id) return data.id;
    }

    return null; // we can't resolve
  }

  // ---------- state ----------
  const [resolvedUserId, setResolvedUserId] = useState(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [loadingInbox, setLoadingInbox] = useState(false);

  const [rejectedIncidents, setRejectedIncidents] = useState([]);
  const [appealsByIncident, setAppealsByIncident] = useState({});

  // resolve numeric id when menu opens
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!open || isGuest) return;
      const id = await resolveDbUserId();
      if (alive) {
        setResolvedUserId(id);
        console.log("[Inbox] using user_id =", id); // debug
      }
    })();
    return () => { alive = false; };
  }, [open, isGuest, userIdProp, userEmailProp]);

  // core loader
  async function loadRejectedAndAppeals(userIdForQuery) {
    if (!userIdForQuery) {
      console.warn("[Inbox] No resolved user id; skipping query.");
      setRejectedIncidents([]);
      setAppealsByIncident({});
      return;
    }

    // 1) rejected incidents for this user
    const { data: inc, error: incErr } = await supabase
      .from("incident_report")
      .select("id, user_id, status, incidentType, location, createdAt, reason")
      .eq("user_id", userIdForQuery)
      .eq("status", "rejected")
      .order("createdAt", { ascending: false })
      .limit(200);

    if (incErr) {
      console.error("Inbox load error (incidents):", incErr);
      setRejectedIncidents([]);
      setAppealsByIncident({});
      return;
    }
    const rejectedOnly = Array.isArray(inc) ? inc : [];
    console.log("[Inbox] rejected incidents count =", rejectedOnly.length); // debug
    setRejectedIncidents(rejectedOnly);

    // 2) latest appeal per incident
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
      console.error("Inbox load error (appeals):", apErr);
      setAppealsByIncident({});
      return;
    }

    console.log("[Inbox] appeals rows =", Array.isArray(aps) ? aps.length : 0); // debug
    const latestMap = {};
    (aps || []).forEach((a) => {
      const ks = keyS(a.incident_id);
      if (!latestMap[ks]) {
        latestMap[ks] = a; // newest-first
        const kn = keyN(a.incident_id);
        if (kn !== null) latestMap[kn] = a;
      }
    });
    setAppealsByIncident(latestMap);
  }

  // load once on open (badge immediately)
  useEffect(() => {
    if (!open || !resolvedUserId || isGuest) return;
    loadRejectedAndAppeals(resolvedUserId);
  }, [open, resolvedUserId, isGuest]);

  // refresh when Inbox expands
  useEffect(() => {
    if (!inboxOpen || !resolvedUserId || isGuest) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingInbox(true);
        await loadRejectedAndAppeals(resolvedUserId);
      } finally {
        if (!cancelled) setLoadingInbox(false);
      }
    })();
    return () => { cancelled = true; };
  }, [inboxOpen, resolvedUserId, isGuest]);

  // appeal compose
  const [appealFor, setAppealFor] = useState(null);
  const [appealMsg, setAppealMsg] = useState("");
  const [appealSubmitting, setAppealSubmitting] = useState(false);

  async function submitIncidentAppeal() {
    if (!appealFor || !resolvedUserId) return;
    const body = (appealMsg || "").trim();
    if (!body) return alert("Please write your appeal message.");

    try {
      setAppealSubmitting(true);
      const { error } = await supabase.from("appeals").insert([
        {
          user_id: resolvedUserId,
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
      await loadRejectedAndAppeals(resolvedUserId);
    } finally {
      setAppealSubmitting(false);
    }
  }

  // two-case display
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

  // ---------- UI ----------
  return (
    <div
      className="sm-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label="Side menu"
    >
      <aside className="sm-panel sm-panel--new" onClick={(e) => e.stopPropagation()}>
        <button className="sm-close" aria-label="Close" title="Close" onClick={onClose} type="button">
          ✕
        </button>

        <div className="sm-brand sm-brand--compact" aria-hidden />

        {isGuest ? (
          <>
            <div className="sm-user-row">
              <div className="sm-avatar">👤</div>
              <div className="sm-user-main">
                <div className="sm-user-name">Guest User</div>
                <button className="sm-user-pill" onClick={() => onSignIn?.()} type="button">
                  Log In
                </button>
              </div>
            </div>

            <nav className="sm-nav" aria-label="Navigation">
              <button className={"sm-nav-item " + (activePage === "live" ? "is-active" : "")} onClick={() => go("live")} type="button">
                <span className="sm-nav-ico">🧭</span> Plan Route
              </button>
              <button className="sm-nav-item is-locked" onClick={nudgeToAuth} title="Register to unlock" type="button">
                <span className="sm-nav-ico">⭐</span> Saved Route &amp; Favourites <span className="sm-lock">🔒</span>
              </button>
              <button className="sm-nav-item is-locked" onClick={nudgeToAuth} title="Register to unlock" type="button">
                <span className="sm-nav-ico">⚙️</span> Settings <span className="sm-lock">🔒</span>
              </button>
              <button className="sm-nav-item is-locked" onClick={nudgeToAuth} title="Register to unlock" type="button">
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
                  <button className="sm-user-pill" onClick={() => go("profile")} type="button">View Profile</button>
                  <button className="sm-user-pill" onClick={() => onLogout?.()} title="Log out" type="button">Log out</button>
                </div>
              </div>
            </div>

            <nav className="sm-nav" aria-label="Navigation">
              <button className={"sm-nav-item " + (activePage === "live" ? "is-active" : "")} onClick={() => go("live")} title="Plan Route" type="button">
                <span className="sm-nav-ico">📡</span> Plan Route
              </button>
              <button className={"sm-nav-item " + (activePage === "saved" ? "is-active" : "")} onClick={() => go("saved")} type="button">
                <span className="sm-nav-ico">⭐</span> Saved Route &amp; Favourites
              </button>
              <button className={"sm-nav-item " + (activePage === "profile" ? "is-active" : "")} onClick={() => go("profile")} type="button">
                <span className="sm-nav-ico">⚙️</span> Settings
              </button>
              <button
                className={"sm-nav-item " + (inboxOpen ? "is-active" : "")}
                onClick={() => setInboxOpen((v) => !v)}
                title="Inbox"
                type="button"
              >
                <span className="sm-nav-ico">✉️</span>
                Inbox
                {!!inboxCount && (
                  <span className="sm-badge" aria-label={`${inboxCount} items`}>{inboxCount}</span>
                )}
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
                          appealsByIncident[row.id] ?? appealsByIncident[keyS(row.id)];
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
                                <div className="sm-list-when">{new Date(row.createdAt).toLocaleString()}</div>
                              )}
                            </div>
                            <div className="sm-list-cta">
                              {!appealRejected && !latest && (
                                <button
                                  className="sm-user-pill"
                                  onClick={() => { setAppealFor(row); setAppealMsg(""); }}
                                  title="Submit an appeal"
                                  type="button"
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

        {/* Appeal modal */}
        {Boolean(appealFor) && (
          <div
            className="gate-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAppealFor(null);
            }}
          >
            <div className="gate-card" onClick={(e) => e.stopPropagation()} draggable={false}>
              <button type="button" className="gate-close" aria-label="Close" onClick={() => setAppealFor(null)}>✕</button>
              <div className="gate-logo" aria-hidden>📝</div>
              <h2 className="gate-title">Appeal Incident Rejection</h2>
              <p className="gate-sub" style={{ marginBottom: 8 }}>
                {appealFor?.incidentType
                  ? `${appealFor.incidentType}${appealFor?.location ? " · " + appealFor.location : ""}`
                  : `Incident #${appealFor?.id ?? "?"}`}
              </p>

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
                <button type="button" className="sm-user-pill" onClick={() => setAppealFor(null)}>Cancel</button>
                <button type="button" className="sm-user-pill" disabled={appealSubmitting} onClick={submitIncidentAppeal}>
                  {appealSubmitting ? "Submitting…" : "Submit Appeal"}
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
