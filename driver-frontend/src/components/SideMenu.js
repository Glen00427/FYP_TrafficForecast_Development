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

  const appUser = useMemo(
    () => (typeof window !== "undefined" && window.__APP_USER) || null,
    []
  );
  const userId = appUser?.id ?? appUser?.userid ?? null;

  // Inbox (rejected incident reports)
  const [inboxOpen, setInboxOpen] = useState(false);
  const [loadingInbox, setLoadingInbox] = useState(false);

  const [rejected, setRejected] = useState([]);

  const [appealFor, setAppealFor] = useState(null); // incident_report row
  const [appealMsg, setAppealMsg] = useState("");
  const [appealSubmitting, setAppealSubmitting] = useState(false);

  const norm = (s) => (s ?? "").toString().trim().toLowerCase();

  async function loadRejected() {
    if (!userId) return;

    // 1) All rejected incidents for this user
    const { data: incs, error: incErr } = await supabase
      .from("incident_report")
      .select("id, user_id, status, incidentType, location, createdAt, reason")
      .eq("user_id", Number(userId))
      .eq("status", "rejected")
      .order("createdAt", { ascending: false })
      .limit(50);

    if (incErr) {
      console.error("Inbox load error:", incErr);
      setRejected([]);
      return;
    }
    const incidents = Array.isArray(incs) ? incs : [];
    if (!incidents.length) {
      setRejected([]);
      return;
    }

    // 2) All appeals for those incidents by this user (latest first)
    const ids = incidents.map((r) => r.id);
    const { data: aps, error: apErr } = await supabase
      .from("appeals")
      .select("appeals_id, incident_id, user_id, status, created_at")
      .eq("user_id", Number(userId))
      .in("incident_id", ids)
      .order("created_at", { ascending: false });

    if (apErr) console.error("Appeals fetch error:", apErr);

    // 3) Latest appeal per-incident
    const latestByIncident = new Map();
    if (Array.isArray(aps)) {
      for (const a of aps) {
        if (!latestByIncident.has(a.incident_id)) latestByIncident.set(a.incident_id, a);
      }
    }

    // 4) Apply rules:
    // - no appeal => ctaType "appeal"
    // - latest appeal rejected => ctaType "rejected"
    // - else (pending/approved/other) => hide
    const out = [];
    for (const inc of incidents) {
      const latest = latestByIncident.get(inc.id);
      if (!latest) {
        out.push({ ...inc, ctaType: "appeal" });
        continue;
      }
      if (norm(latest.status) === "rejected") out.push({ ...inc, ctaType: "rejected" });
    }
    setRejected(out);
  }

  // 1) Load on menu open so badge shows immediately
  useEffect(() => {
    if (!open || !userId) return;
    loadRejected();
  }, [open, userId]);

  // 2) Refresh when inbox panel is opened
  useEffect(() => {
    if (!inboxOpen || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingInbox(true);
        await loadRejected();
      } finally {
        if (!cancelled) setLoadingInbox(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inboxOpen, userId]);

  async function submitIncidentAppeal() {
    if (!appealFor || !userId) return;
    const body = (appealMsg || "").trim();
    if (!body) return alert("Please write your appeal message.");

    // Block if any appeal already exists for this incident (no second appeals)
    const { data: existing, error: exErr } = await supabase
      .from("appeals")
      .select("status, created_at")
      .eq("user_id", Number(userId))
      .eq("incident_id", appealFor.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!exErr && existing?.length) {
      const latestStatus = norm(existing[0].status);
      alert(
        latestStatus === "rejected"
          ? "Your appeal was rejected. You can't appeal this incident again."
          : "You already submitted an appeal for this incident."
      );
      return;
    }

    try {
      setAppealSubmitting(true);
      const { error } = await supabase.from("appeals").insert([
        {
          user_id: Number(userId),
          incident_id: appealFor.id, // link to incident_report.id
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
      await loadRejected(); // update badge/list
    } finally {
      setAppealSubmitting(false);
    }
  }

  const incidentTitle = (row) =>
    row?.incidentType
      ? `${row.incidentType}${row.location ? ", " + row.location : ""}`
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
                <button className="sm-user-pill" onClick={() => onSignIn?.()}>
                  Log In
                </button>
              </div>
            </div>

            <nav className="sm-nav" aria-label="Navigation">
              <button
                className={"sm-nav-item " + (activePage === "live" ? "is-active" : "")}
                onClick={() => go("live")}
              >
                <span className="sm-nav-ico">🧭</span> Plan Route
              </button>

              <button className="sm-nav-item is-locked" onClick={nudgeToAuth} title="Register to unlock">
                <span className="sm-nav-ico">⭐</span> Saved Route &amp; Favourites <span className="sm-lock">🔒</span>
              </button>

              <button className="sm-nav-item is-locked" onClick={nudgeToAuth} title="Register to unlock">
                <span className="sm-nav-ico">⚙️</span> Settings <span className="sm-lock">��</span>
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
                  <button className="sm-user-pill" onClick={() => go("profile")}>
                    View Profile
                  </button>
                  <button className="sm-user-pill" onClick={() => onLogout?.()} title="Log out">
                    Log out
                  </button>
                </div>
              </div>
            </div>

            <nav className="sm-nav" aria-label="Navigation">
              <button
                className={"sm-nav-item " + (activePage === "live" ? "is-active" : "")}
                onClick={() => go("live")}
                title="Plan Route"
              >
                <span className="sm-nav-ico">📡</span> Plan Route
              </button>

              <button
                className={"sm-nav-item " + (activePage === "saved" ? "is-active" : "")}
                onClick={() => go("saved")}
              >
                <span className="sm-nav-ico">⭐</span> Saved Route &amp; Favourites
              </button>

              <button
                className={"sm-nav-item " + (activePage === "profile" ? "is-active" : "")}
                onClick={() => go("profile")}
              >
                <span className="sm-nav-ico">⚙️</span> Settings
              </button>

              <button
                className={"sm-nav-item " + (inboxOpen ? "is-active" : "")}
                onClick={() => setInboxOpen((v) => !v)}
                title="Inbox"
              >
                <span className="sm-nav-ico">✉️</span>
                Inbox
                {!!rejected.length && (
                  <span className="sm-badge" aria-label={`${rejected.length} items`}>
                    {rejected.length}
                  </span>
                )}
              </button>
            </nav>

            {/* Inbox panel */}
            {inboxOpen && (
              <section className="sm-cards" aria-live="polite">
                <div className="sm-card">
                  <div className="sm-card-head">
                    <span className="sm-card-ico">📥</span>
                    <h4 className="sm-card-title">Inbox</h4>
                  </div>

                  {loadingInbox ? (
                    <p className="sm-card-text">Loading…</p>
                  ) : rejected.length === 0 ? (
                    <p className="sm-card-text">No rejected incident reports.</p>
                  ) : (
                    <ul className="sm-list" style={{ marginTop: 8 }}>
                      {rejected.map((row) => (
                        <li className="sm-list-item" key={row.id}>
                          <div className="sm-list-main" style={{ width: "100%" }}>
                            {/* 1) Incident type, Location */}
                            <div className="sm-list-title">{incidentTitle(row)}</div>

                            {/* 2) Time */}
                            {row.createdAt && (
                              <div className="sm-list-when">{incidentWhen(row)}</div>
                            )}

                            {/* 3) Reason for rejection (now *above* CTA) */}
                            <div className="sm-list-sub" style={{ marginTop: 4 }}>
                              <strong>Reason for rejection:</strong>{" "}
                              {row?.reason && row.reason.trim()
                                ? row.reason
                                : "No reason provided."}
                            </div>

                            {/* 4) CTA */}
                            <div className="sm-list-cta" style={{ marginTop: 8 }}>
                              {row.ctaType === "appeal" ? (
                                <button
                                  className="sm-user-pill"
                                  onClick={() => {
                                    setAppealFor(row);
                                    setAppealMsg("");
                                  }}
                                >
                                  Appeal
                                </button>
                              ) : (
                                <span
                                  className="sm-user-pill"
                                  aria-label="Appeal rejected"
                                  style={{
                                    cursor: "default",
                                    background: "#ffebee",
                                    color: "#c62828",
                                    border: "1px solid #ef9a9a",
                                    fontWeight: 700,
                                  }}
                                >
                                  Rejected
                                </span>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {/* Appeal modal (message only) */}
        {appealFor && (
          <div
            className="gate-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.target === e.currentTarget && setAppealFor(null)}
          >
            <div className="gate-card" onClick={(e) => e.stopPropagation()}>
              <button className="gate-close" aria-label="Close" onClick={() => setAppealFor(null)}>
                ✕
              </button>

              <div className="gate-logo" aria-hidden>📝</div>
              <h2 className="gate-title">Appeal Incident Rejection</h2>
              <p className="gate-sub" style={{ marginBottom: 8 }}>
                {appealFor?.incidentType
                  ? `${appealFor.incidentType}${appealFor.location ? ", " + appealFor.location : ""}`
                  : `Incident #${appealFor?.id ?? "?"}`}
              </p>

              <label className="usf-label" htmlFor="inb-appeal-msg">Message</label>
              <textarea
                id="inb-appeal-msg"
                className="usf-input"
                rows={6}
                placeholder="Appeal incident."
                value={appealMsg}
                onChange={(e) => setAppealMsg(e.target.value)}
              />

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="usf-btn" onClick={() => setAppealFor(null)}>Cancel</button>
                <button
                  className="usf-btn usf-btn-primary"
                  disabled={appealSubmitting}
                  onClick={submitIncidentAppeal}
                >
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
