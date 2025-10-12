import React from "react";

export default function AdminSideMenu({
  open,
  onClose,
  active = "dashboard", // 'dashboard' | 'users' | 'flagged'
  onNavigate, // (page) => void
}) {
  const go = (page) => {
    onNavigate?.(page);
    onClose?.();
  };

  const pillClass = (page, primary = false) =>
    `adm-pill ${primary && active === page ? "is-primary" : "is-outline"} ${
      active === page ? "is-active" : ""
    }`;

  return (
    <>
      {open && <div className="adm-backdrop" onClick={onClose} />}

      <aside
        className={`adm-drawer ${open ? "open" : ""}`}
        role="dialog"
        aria-label="Admin controls"
        onClick={(e) => e.stopPropagation()}
      >
        <section className="adm-section">
          <div className="adm-title">ADMIN CONTROLS</div>

          <div className="adm-pill-row">
            <button
              className={pillClass("dashboard", true)}
              aria-current={active === "dashboard" ? "page" : undefined}
              onClick={() => go("dashboard")}
            >
              <span className="adm-ico">📊</span>
              <span>Admin Dashboard</span>
            </button>

            <button
              className={pillClass("users")}
              aria-current={active === "users" ? "page" : undefined}
              onClick={() => go("users")}
            >
              <span className="adm-ico">🛡️</span>
              <span>User Management</span>
            </button>

            <button
              className={pillClass("flagged")}
              aria-current={active === "flagged" ? "page" : undefined}
              onClick={() => go("flagged")}
            >
              <span className="adm-ico">❎</span>
              <span>Flagged Users</span>
            </button>
          </div>
        </section>
      </aside>
    </>
  );
}
