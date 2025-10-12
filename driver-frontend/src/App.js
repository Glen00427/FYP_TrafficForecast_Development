import AuthGate from "./components/AuthGate";
import React, { useState, useEffect } from "react";
import TrafficAlerts from "./components/TrafficAlerts";
import TrafficMap from "./components/TrafficMap";
import SideMenu from "./components/SideMenu";
import SavedRoutes from "./components/SavedRoutes";
import NotificationsSettings from "./components/UserNotifications";
import CreateUserAccount from "./components/CreateUserAccount";
import CreateAccountSuccess from "./components/CreateAccountSuccess";
import CreateUserLearnMore from "./components/CreateUserLearnMore";
import UserSignInForm from "./components/UserSignInForm";
import UserSignInSuccess from "./components/UserSignInSuccess";
import { supabase } from "./lib/supabaseClient";
import FloatingThemeToggle from "./components/FloatingThemeToggle";
import FloatingMenuButton from "./components/FloatingMenuButton";
import RoutePreviewSheet from "./components/RoutePreviewSheet";
import FloatingReportButton from "./components/FloatingReportButton";
import IncidentReportForm from "./components/IncidentReportForm";
import { saveIncidentReport } from "./components/saveIncident";
import NotificationIcon from "./components/NotificationIcon";
import LiveNotifications from "./components/LiveNotifications";
import ReportIncidentSubmit from "./components/ReportIncidentSubmit";
import { predictRoutes } from './api/predict';

export default function App() {
  const [route, setRoute] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // auth & gate
  const [user, setUser] = useState(null);
  const [guestAccess, setGuestAccess] = useState(false);

  // sign-up flow
  const [accountOpen, setAccountOpen] = useState(false);
  const [createAccountSuccess, setCreateAccountSuccess] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);

  // sign-in flow
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInSuccessOpen, setSignInSuccessOpen] = useState(false);

  // nav
  const [activePage, setActivePage] = useState("live");

  // 🆕 incident form + success modal
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // theme
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

  // map remount
  const [mapEpoch, setMapEpoch] = useState(0);
  const bumpMap = () => {
    setMapEpoch((e) => e + 1);
    setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
  };

  const openMenu = () => setMenuOpen(true);
  const closeMenu = () => setMenuOpen(false);

  const isGuest = !user;
  const gateBlocking = !user && !guestAccess;
  const signupFlowOpen = accountOpen || learnOpen || createAccountSuccess;
  const gateOpen = gateBlocking && !signupFlowOpen;

  useEffect(() => {
    if (isGuest && (activePage === "saved" || activePage === "profile")) {
      setActivePage("live");
    }
  }, [isGuest, activePage]);

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

  async function handleCreateAccount({ name, email, phone, password }) {
    const emailNorm = (email ?? "").trim().toLowerCase();

    const { error } = await supabase
      .from("users")
      .insert([{ name, email: emailNorm, phone, password }])
      .select()
      .single();

    if (error) {
      console.error(error);
      alert(`Create failed: ${error.message}`);
      return;
    }

    setAccountOpen(false);
    setCreateAccountSuccess(true);
  }

  function openLearnPage() {
    setAccountOpen(false);
    setLearnOpen(true);
    try {
      window.history.pushState({ view: "learn" }, "");
      const onPop = () => {
        setLearnOpen(false);
        setAccountOpen(true);
        window.removeEventListener("popstate", onPop);
      };
      window.addEventListener("popstate", onPop, { once: true });
    } catch {}
  }

  function closeLearnGoBack() {
    setLearnOpen(false);
    setAccountOpen(true);
    try {
      if (window.history.state?.view === "learn") window.history.back();
    } catch {}
  }

  async function handleLogout() {
    try {
      const { doLogout } = await import("./components/logout");
      await doLogout();
    } catch (_) {}

    setUser(null);
    setActivePage("live");
    setMenuOpen(false);
    try {
      localStorage.removeItem("role");
    } catch {}
    bumpMap();
  }

  // ===== EARLY RETURNS =====
  if (gateBlocking && signupFlowOpen) {
    return (
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
    <div className="app" data-theme={theme}>
      {<SideMenu
          open={menuOpen}
          onClose={closeMenu}
          activePage={activePage}
          onNavigate={setActivePage}
          isGuest={!user}
          onCreateAccount={() => setAccountOpen(true)}
          onSignIn={() => setSignInOpen(true)}
          onLogout={handleLogout}
        />
      }

      {/* LIVE MAP PAGE */}
      <section
        className={`page page-live ${activePage === "live" ? "is-active" : ""}`}
        aria-hidden={activePage !== "live"}
      >
        <div className="map-wrapper">
          <TrafficMap
            key={mapEpoch}
            route={route}
            origin={origin}
            destination={destination}
            theme={theme}
          />
          <div className="map-overlays-tl">
            <FloatingMenuButton onOpenMenu={openMenu} />
            {!!user && (
              <NotificationIcon onClick={() => setActivePage("profile")} />
            )}
            {!!user && <NotificationIcon onClick={() => setNotifOpen(true)} />}
          </div>

          <FloatingThemeToggle theme={theme} onToggle={toggleTheme} />
          {!!user && (
            <FloatingReportButton onClick={() => setIncidentOpen(true)} />
          )}

          {/* Incident Form modal */}
          <IncidentReportForm
            open={incidentOpen}
            onCancel={() => setIncidentOpen(false)}
            onSubmit={async (form) => {
              try {
                await saveIncidentReport({ form, user });
                setIncidentOpen(false);
                setSubmitOpen(true); // 🆕 show success modal
              } catch (e) {
                console.error(e);
                alert(e.message || "Failed to save incident");
              }
            }}
          />

          {/* 🆕 Success modal */}
          <ReportIncidentSubmit
            open={submitOpen}
            onClose={() => setSubmitOpen(false)}
            autoCloseMs={1800}
          />

          <LiveNotifications
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            items={[
              {
                id: "n1",
                when: "10 min ago",
                title: "Severe Traffic incident on KPE",
                desc: "Severe traffic collision on KPE involving 5 vehicles.",
              },
              {
                id: "n2",
                when: "2 hours ago",
                title: "Road closure along PIE",
                desc: "Road closure along PIE Exit 2 from 12am - 5am on 21 Sep 2025",
              },
            ]}
          />
        </div>

        <RoutePreviewSheet
          isGuest={!user}
          onSubmit={async (from, to, options) => {
            console.log("Preview requested:", { from, to, options });
          // ADD THIS PREDICTION CALL
      try {
        const result = await predictRoutes({ 
          from, 
          to, 
          departTime: options?.departAt 
        });
        
        console.log('🔍 FULL RESULT:', JSON.stringify(result, null, 2)); // ADD THIS
        console.log('🔍 Best congestionProb:', result.best.congestionProb); // AND THIS
        
        setPredictions(result);
        console.log('ML Predictions received:', result);
        
        // Show results to user
        alert(`Best route: ${result.best.name}\nCongestion: ${Math.round(result.best.congestionProb * 100)}%`);
        
      } catch (error) {
        console.error('Prediction failed:', error);
        alert('Could not get predictions. Check console.');
      }
    }}
        />
      </section>

      {/* SAVED ROUTES PAGE */}
      <section
        className={`page page-saved ${
          activePage === "saved" ? "is-active" : ""
        }`}
        aria-hidden={activePage !== "saved"}
      >
        <SavedRoutes onClose={() => setActivePage("live")} />
      </section>

      {/* PROFILE / NOTIFICATIONS PAGE */}
      <section
        className={`page page-profile ${
          activePage === "profile" ? "is-active" : ""
        }`}
        aria-hidden={activePage !== "profile"}
      >
        <NotificationsSettings
          theme={theme}
          onToggleTheme={toggleTheme}
          onClose={() => setActivePage("live")}
        />
      </section>

      {/* Modals */}
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
      <CreateAccountSuccess
        open={createAccountSuccess}
        onClose={() => setCreateAccountSuccess(false)}
        onLogin={() => {
          setCreateAccountSuccess(false);
          handleAuthed({ id: "demo", fname: "New", role: "user" });
        }}
      />
      <CreateUserLearnMore
        open={learnOpen}
        onClose={() => setLearnOpen(false)}
        onGoBack={() => {
          setLearnOpen(false);
          setAccountOpen(true);
        }}
        fullScreen
      />
      <UserSignInForm
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSuccess={(payload) => {
          const src = payload?.user ?? payload;
          handleAuthed(src);
          setSignInOpen(false);
          setSignInSuccessOpen(true);
          setActivePage("live");
        }}
      />
      <UserSignInSuccess
        open={signInSuccessOpen}
        onClose={() => setSignInSuccessOpen(false)}
        onContinue={() => setSignInSuccessOpen(false)}
        autoCloseMs={1800}
      />
    </div>
  );
}
