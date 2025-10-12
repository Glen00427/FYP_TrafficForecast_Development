import React from "react";

// NOTE: no LogoutButton import here; we call onLogout from props

export default function SideMenu({
  open,
  onClose,
  activePage = "live",
  onNavigate,
  isGuest = false,
  onCreateAccount,
  onSignIn,
  onLogout, // <-- provided by App.handleLogout
  userName = "User",
}) {
  if (!open) return null;

  const go = (page) => {
    onNavigate?.(page);
    onClose?.();
  };

  const nudgeToAuth = () => (onSignIn ? onSignIn() : onCreateAccount?.());

  return (
    <div
      className="sm-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label="Side menu"
    >
      <aside
        className="sm-panel sm-panel--new"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="sm-close"
          aria-label="Close"
          title="Close"
          onClick={onClose}
        >
          ✕
        </button>

        {/* ===== Header (brand is minimal now) ===== */}
        <div className="sm-brand sm-brand--compact" aria-hidden />

        {isGuest ? (
          <>
            {/* ===== Guest header ===== */}
            <div className="sm-user-row">
              <div className="sm-avatar">👤</div>
              <div className="sm-user-main">
                <div className="sm-user-name">Guest User</div>
                <button className="sm-user-pill" onClick={() => onSignIn?.()}>
                  Log In
                </button>
              </div>
            </div>

            {/* ===== Guest nav (same items, locked) ===== */}
            <nav className="sm-nav" aria-label="Navigation">
              <button
                className={
                  "sm-nav-item " + (activePage === "live" ? "is-active" : "")
                }
                onClick={() => go("live")}
              >
                <span className="sm-nav-ico">🧭</span> Plan Route
              </button>

              <button
                className="sm-nav-item is-locked"
                onClick={nudgeToAuth}
                title="Register to unlock"
              >
                <span className="sm-nav-ico">⭐</span> Saved Route &amp;
                Favourites <span className="sm-lock">🔒</span>
              </button>

              <button
                className="sm-nav-item is-locked"
                onClick={nudgeToAuth}
                title="Register to unlock"
              >
                <span className="sm-nav-ico">⚙️</span> Settings{" "}
                <span className="sm-lock">🔒</span>
              </button>

              <button
                className="sm-nav-item is-locked"
                onClick={nudgeToAuth}
                title="Register to unlock"
              >
                <span className="sm-nav-ico">✉️</span> Inbox{" "}
                <span className="sm-lock">🔒</span>
              </button>
            </nav>

            {/* Gentle upgrade prompt */}
            <div className="sm-card sm-card--ghost">
              <div className="sm-card-title">Unlock all features</div>
              <button
                className="sm-card-cta"
                onClick={() => onCreateAccount?.()}
              >
                Get Started
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ===== Signed-in header ===== */}
            <div className="sm-user-row">
              <div className="sm-avatar" aria-hidden>
                🟣
              </div>
              <div className="sm-user-main">
                <div className="sm-user-name">{userName}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="sm-user-pill"
                    onClick={() => go("profile")}
                  >
                    View Profile
                  </button>

                  {/* Logout pill beside View Profile — calls App.handleLogout */}
                  <button
                    className="sm-user-pill"
                    onClick={() => onLogout?.()}
                    title="Log out"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </div>

            {/* ===== Navigation ===== */}
            <nav className="sm-nav" aria-label="Navigation">
              <button
                className={
                  "sm-nav-item " + (activePage === "live" ? "is-active" : "")
                }
                onClick={() => go("live")}
                title="Plan Route"
              >
                <span className="sm-nav-ico">📡</span> Plan Route
              </button>

              <button
                className={
                  "sm-nav-item " + (activePage === "saved" ? "is-active" : "")
                }
                onClick={() => go("saved")}
              >
                <span className="sm-nav-ico">⭐</span> Saved Route &amp;
                Favourites
              </button>

              <button
                className={
                  "sm-nav-item " + (activePage === "profile" ? "is-active" : "")
                }
                onClick={() => go("profile")}
              >
                <span className="sm-nav-ico">⚙️</span> Settings
              </button>

              <button
                className={
                  "sm-nav-item " + (activePage === "profile" ? "is-active" : "")
                }
                onClick={() => go("profile")}
              >
                <span className="sm-nav-ico">✉️</span> Inbox
              </button>
            </nav>

            {/* ===== Info cards ===== */}
            <section className="sm-cards">
              <div className="sm-card">
                <div className="sm-card-head">
                  <span className="sm-card-ico">🔔</span>
                  <h4 className="sm-card-title">Live Updates</h4>
                </div>
                <p className="sm-card-text">
                  Severe traffic collision on KPE involving 5 vehicles. Medical
                  services on the way.
                </p>
                <button className="sm-card-cta" onClick={() => go("profile")}>
                  View All Notifications
                </button>
              </div>

              <div className="sm-card">
                <div className="sm-card-head">
                  <span className="sm-card-ico">📈</span>
                  <h4 className="sm-card-title">Traffic Forecasts</h4>
                </div>
                <button className="sm-card-cta" onClick={() => go("live")}>
                  View Traffic Forecasts
                </button>
              </div>
            </section>
          </>
        )}
      </aside>
    </div>
  );
}
