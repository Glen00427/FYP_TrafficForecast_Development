import React, { useState, useEffect } from "react";
import AuthGate from "./components/AuthGate";
import TrafficMap from "./components/TrafficMap";
import SideMenu from "./components/SideMenu";
import SavedRoutes from "./components/SavedRoutes";
import NotificationsSettings from "./components/UserNotifications";
import CreateUserAccount from "./components/CreateUserAccount";
import CreateAccountSuccess from "./components/CreateAccountSuccess";
import CreateUserLearnMore from "./components/CreateUserLearnMore";
import UserSignInForm from "./components/UserSignInForm";
import UserSignInSuccess from "./components/UserSignInSuccess";
import FloatingThemeToggle from "./components/FloatingThemeToggle";
import FloatingMenuButton from "./components/FloatingMenuButton";
import FloatingReportButton from "./components/FloatingReportButton";
import NotificationIcon from "./components/NotificationIcon";
import LiveNotifications from "./components/LiveNotifications";
import RoutePreviewSheet from "./components/RoutePreviewSheet";
import PredictionDialog from "./components/PredictionDialog";
import ReportIncidentSubmit from "./components/ReportIncidentSubmit";
import IncidentReportForm from "./components/IncidentReportForm";

import { saveIncidentReport } from "./components/saveIncident";
import { fetchIncidents } from "./fetchIncidents";
import { predictRoutes } from "./api/predict";
import { supabase } from "./lib/supabaseClient";

export default function App() {
  // Routing & data
  const [route, setRoute] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [incidents, setIncidents] = useState([]);

  // UI State
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [mapEpoch, setMapEpoch] = useState(0);

  // Auth
  const [user, setUser] = useState(null);
  const [guestAccess, setGuestAccess] = useState(false);

  // Sign-up flow
  const [accountOpen, setAccountOpen] = useState(false);
  const [createAccountSuccess, setCreateAccountSuccess] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);

  // Sign-in flow
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInSuccessOpen, setSignInSuccessOpen] = useState(false);

  // Page navigation
  const [activePage, setActivePage] = useState("live");

  // Predictions
  const [predictionResult, setPredictionResult] = useState(null);
  const [showingRoute, setShowingRoute] = useState(false);
  const [displayedPrediction, setDisplayedPrediction] = useState(null);
  const [routePrefill, setRoutePrefill] = useState(null);

  // Theme
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );
  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      localStorage.setItem("theme", next);
      return next;
    });
  };

  // Derived flags
  const isGuest = !user;
  const gateBlocking = !user && !guestAccess;
  const signupFlowOpen = accountOpen || learnOpen || createAccountSuccess;
  const gateOpen = gateBlocking && !signupFlowOpen;

  // 🧭 Utility: refresh map & re-trigger Google Map resize
  const bumpMap = () => {
    setMapEpoch((e) => e + 1);
    setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
  };

  // 🧱 Menu controls
  const openMenu = () => setMenuOpen(true);
  const closeMenu = () => setMenuOpen(false);

  // Fetch incidents from DB
  useEffect(() => {
    async function loadData() {
      const rows = await fetchIncidents();
      setIncidents(rows);
    }
    loadData();
  }, []);

  // Mirror current user globally
  useEffect(() => {
    window.__APP_USER = user || null;
  }, [user]);

  // 🧍 Auth success
  function handleAuthed(u) {
    const appUser = {
      id: u?.id ?? u?.userid ?? "local",
      name: u?.name ?? "",
      email: u?.email ?? "",
      phone: u?.phone ?? "",
      role: u?.role ?? "user",
    };
    setUser(appUser);
    setActivePage("live");
    setSignInSuccessOpen(true);
    setSignInOpen(false);
    setMenuOpen(false);
    bumpMap();
  }

  // 🗺️ OSRM route planner
  async function geocode(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) {
      throw new Error(`Location not found: ${query}`);
    }
    return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
  }

  async function planRoute(from, to) {
    if (!from || !to) {
      alert("Please enter both origin and destination.");
      return;
    }
    try {
      const [fromCoord, toCoord] = await Promise.all([
        geocode(from),
        geocode(to),
      ]);
      setOrigin(fromCoord);
      setDestination(toCoord);

      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${fromCoord[0]},${fromCoord[1]};${toCoord[0]},${toCoord[1]}?overview=full&geometries=geojson`
      );
      const json = await res.json();
      const r = json?.routes?.[0];
      if (!r) throw new Error("Route not found");

      setRoute(r.geometry);

      const mins = Math.round(r.duration / 60);
      const km = (r.distance / 1000).toFixed(1);
      alert(`Route ready: ${mins} min, ${km} km`);
    } catch (err) {
      console.error(err);
      alert(err.message || "Could not plan route.");
    }
  }

  // 🧾 Logout
  async function handleLogout() {
    try {
      const { doLogout } = await import("./components/logout");
      await doLogout();
    } catch (_) { }
    setUser(null);
    setActivePage("live");
    setMenuOpen(false);
    localStorage.removeItem("role");
    bumpMap();
  }

  // ===== EARLY RETURNS =====
  if (gateBlocking && signupFlowOpen) {
    return (
      <div className="phone-wrapper">
        <div className="app" data-theme={theme}>
          {accountOpen && (
            <CreateUserAccount
              open={accountOpen}
              onClose={() => setAccountOpen(false)}
              onLearnMore={() => {
                setAccountOpen(false);
                setLearnOpen(true);
              }}
              onSubmit={handleCreateAccount}
              fullScreen
            />
          )}
          {learnOpen && (
            <CreateUserLearnMore
              open={learnOpen}
              onClose={() => setLearnOpen(false)}
              onGoBack={() => {
                setLearnOpen(false);
                setAccountOpen(true);
              }}
              fullScreen
            />
          )}
          {createAccountSuccess && (
            <CreateAccountSuccess
              open
              onClose={() => setCreateAccountSuccess(false)}
              onLogin={() => {
                setCreateAccountSuccess(false);
              }}
            />
          )}
        </div>
      </div>
    );
  }

  if (gateOpen) {
    return (
      <div className="app" data-theme={theme}>
        <AuthGate
          appName="SG Traffic Forecast"
          onAuthed={handleAuthed}
          onGuest={() => {
            setGuestAccess(true);
            bumpMap();
          }}
          onSignUp={() => setAccountOpen(true)}
        />
      </div>
    );
  }

  // ===== NORMAL APP =====
  return (
    <div className="phone-wrapper">
      <div className="app" data-theme={theme}>
        <SideMenu
          open={menuOpen}
          onClose={closeMenu}
          activePage={activePage}
          onNavigate={setActivePage}
          isGuest={!user}
          onCreateAccount={() => setAccountOpen(true)}
          onSignIn={() => setSignInOpen(true)}
          onLogout={handleLogout}
        />

      {/* 🧩 Sign In modal */}
        <UserSignInForm
          open={signInOpen}
          onClose={() => setSignInOpen(false)}
          onSuccess={(userInfo) => {
            setUser(userInfo);
            setSignInOpen(false);
          }}
        />

        {/* LIVE MAP PAGE */}
        <section
          className={`page page-live ${activePage === "live" ? "is-active" : ""}`}
          aria-hidden={activePage !== "live"}
        >
          <div className="map-wrapper">
            <TrafficMap
              key={mapEpoch}
              selectedRoute={route}
              origin={origin}
              destination={destination}
              theme={theme}
              incidents={incidents}
              isGuest={!user}
            />

            <div className="map-overlays-tl">
              <FloatingMenuButton onOpenMenu={openMenu} />
            </div>

            <FloatingThemeToggle theme={theme} onToggle={toggleTheme} />
            {!!user && (
              <FloatingReportButton onClick={() => setIncidentOpen(true)} />
            )}

            {/* Incident Report Modal */}
            <IncidentReportForm
              open={incidentOpen}
              onCancel={() => setIncidentOpen(false)}
              onSubmit={async (form) => {
                try {
                  const newIncident = await saveIncidentReport({ form, user });
                  setIncidents((prev) => [...prev, newIncident]);
                  setIncidentOpen(false);
                  setSubmitOpen(true);
                } catch (e) {
                  console.error(e);
                  alert(e.message || "Failed to save incident");
                }
              }}
            />

            {/* Success Confirmation */}
            <ReportIncidentSubmit
              open={submitOpen}
              onClose={() => setSubmitOpen(false)}
              autoCloseMs={1800}
            />


            {/* Route Preview + Prediction */}
            <RoutePreviewSheet
              isGuest={!user}
              predictionData={showingRoute ? displayedPrediction : null}
              prefillValues={routePrefill}
              onPrefillConsumed={() => setRoutePrefill(null)}
              onSubmit={async (from, to, options) => {
                if (!from || !from.trim()) {
                  alert("Please enter a starting location");
                  return;
                }
                if (!to || !to.trim()) {
                  alert("Please enter a destination");
                  return;
                }
                if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
                  alert("Origin and destination cannot be the same");
                  return;
                }
                try {
                  const result = await predictRoutes({
                    from,
                    to,
                    departTime: options?.departAt,
                  });
                  console.log("Prediction:", result);
                  result.from = from;
                  result.to = to;
                  setPredictionResult(result);
                  setShowingRoute(false);
                  setDisplayedPrediction(null);
                } catch (error) {
                  console.error("Prediction failed:", error);
                  alert("Could not get predictions. Check console.");
                }
              }}
              onNavigate={async (originLabel, destinationLabel, options) => {
                const from = String(originLabel || "").trim();
                const to = String(destinationLabel || "").trim();
                if (!from) {
                  alert("Current location unavailable. Please allow access and try again.");
                  return;
                }
                if (!to) {
                  alert("Please enter a destination");
                  return;
                }
                try {
                  const result = await predictRoutes({
                    from,
                    to,
                    departTime: options?.departAt,
                  });
                  console.log("Navigation predictions received:", result);
                  result.from = from;
                  result.to = to;
                  if (options?.originCoords) result.originCoords = options.originCoords;
                  setPredictionResult(result);
                  setShowingRoute(false);
                  setDisplayedPrediction(null);
                } catch (error) {
                  console.error("Navigation prediction failed:", error);
                  alert("Could not start navigation. Check console.");
                }
              }}
            />
          </div>
        </section>

        {/* SAVED ROUTES PAGE */}
        <section
          className={`page page-saved ${activePage === "saved" ? "is-active" : ""}`}
          aria-hidden={activePage !== "saved"}
        >
          <SavedRoutes
            key={user ? String(user.id ?? user.userid) : "guest"}
            userId={user ? Number(user.id ?? user.userid) : 0}
            active={activePage === "saved"}
            onNavigate={(route) => {
              if (!route) return;
              setRoutePrefill({
                from: route.from ?? "",
                to: route.to ?? "",
              });
              setActivePage("live");
            }}
            onClose={() => setActivePage("live")}
          />
        </section>

        {/* PROFILE PAGE */}
        <section
          className={`page page-profile ${activePage === "profile" ? "is-active" : ""}`}
          aria-hidden={activePage !== "profile"}
        >
          <NotificationsSettings
            theme={theme}
            onToggleTheme={toggleTheme}
            onClose={() => setActivePage("live")}
          />
        </section>

        {/* ✅ Prediction Dialog (restored) */}
        {predictionResult && (
          <PredictionDialog
            result={predictionResult}
            onClose={() => {
              setPredictionResult(null);
              setShowingRoute(false);
              setDisplayedPrediction(null);
            }}
            onShowRoute={() => {
              if (predictionResult?.best?.route_coordinates) {
                setRoute({ geometry: predictionResult.best.route_coordinates });
                setShowingRoute(true);
                setDisplayedPrediction(predictionResult);
                setPredictionResult(null);
                setActivePage("live");
                const closeButton = document.querySelector(".rps-close");
                if (closeButton) closeButton.click();
              } else {
                alert("Route coordinates not available");
              }
            }}
            user={user}
          />
        )}
      </div>
    </div>
  );
}
