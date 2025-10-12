import React, { useState } from "react";
import ReportIncidentForm from "./ReportIncidentForm";
import ReportIncidentSubmit from "./ReportIncidentSubmit";
import LogoutButton from "./logout";

export default function NavigationHeader({
  onOpenMenu,
  onLogout,
  onToggleTheme,
  firstName,
  theme = "light",
  isGuest = false,
  isAdmin = false, // kept for future use
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [submittedOpen, setSubmittedOpen] = useState(false);
  const isDark = theme === "dark";

  function handleReportSubmit() {
    setReportOpen(false);
    setSubmittedOpen(true);
  }

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button onClick={onOpenMenu} aria-label="Open menu">
            ☰
          </button>
          <div className="title">SG Traffic Forecast</div>

          {/* Greet logged-in users */}
          {!isGuest && firstName && (
            <span
              style={{
                marginLeft: 8,
                fontWeight: 800,
                color: "#fff",
                whiteSpace: "nowrap",
              }}
            >
              Hello {firstName}
            </span>
          )}

          {isGuest && (
            <span
              className="hello-guest-chip"
              style={{
                padding: "6px 10px",
                borderRadius: 9999,
                border: "1px solid rgba(255,255,255,0.75)",
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                fontWeight: 800,
              }}
            >
              Hello Guest
            </span>
          )}
        </div>

        {/* Right: actions (Report hidden for guests) */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!isGuest && (
            <button
              onClick={() => setReportOpen(true)}
              aria-label="Report"
              style={{
                border: "1px solid #ffffff",
                padding: "6px 10px",
                borderRadius: 8,
                background: "transparent",
                color: "inherit",
              }}
            >
              Report
            </button>
          )}

          {/* Removed Log In button for guests per Step 1 */}
          {!isGuest && <LogoutButton label="Log out" onLoggedOut={onLogout} />}
        </div>
      </div>

      {/* Modals only for logged-in users */}
      {!isGuest && (
        <>
          <ReportIncidentForm
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            onSubmit={handleReportSubmit}
          />
          <ReportIncidentSubmit
            open={submittedOpen}
            onClose={() => setSubmittedOpen(false)}
            autoCloseMs={2500}
          />
        </>
      )}
    </>
  );
}
