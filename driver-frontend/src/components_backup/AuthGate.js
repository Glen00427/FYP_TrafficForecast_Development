import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthGate({
  appName = "SG Traffic Forecast",
  onAuthed,
  onGuest,
  onSignUp,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const emailRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => emailRef.current?.focus(), 0);
    return () => (document.body.style.overflow = prev);
  }, []);

  const errs = useMemo(() => {
    const e = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Valid email required";
    if (!password) e.password = "Password required";
    return e;
  }, [email, password]);

  async function handleSignIn(ev) {
    ev.preventDefault();
    setSubmitted(true);
    setAuthErr("");
    if (Object.keys(errs).length) return;

    const emailNorm = (email || "").trim().toLowerCase();
    const pass = (password || "").trim();

    try {
      setLoading(true);

      // emails are normalized, so direct equality is fine
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", emailNorm)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("AuthGate SELECT error:", error);
        setAuthErr("Something went wrong. Please try again.");
        return;
      }
      if (!data || String(data.password ?? "").trim() !== pass) {
        setAuthErr("Incorrect email or password.");
        return;
      }

      const uid = data.id ?? data.userid ?? data.user_id ?? "local";

      onAuthed?.({
        id: uid,
        userid: data.userid ?? null, // ← missing comma fixed
        name: data.name ?? "",
        email: data.email ?? emailNorm,
        phone: data.phone ?? "",
        role: "user",
      });
    } catch (e) {
      console.error("AuthGate exception:", e);
      setAuthErr("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gate-backdrop">
      <div className="gate-card">
        <button className="gate-close" aria-label="Close" disabled>
          ✕
        </button>
        <div className="gate-logo" aria-hidden>
          🚗
        </div>
        <h1 className="gate-title">Welcome to {appName}</h1>
        <p className="gate-sub">Sign in to continue</p>

        <form className="gate-form" onSubmit={handleSignIn}>
          <label className="usf-label" htmlFor="gate-email">
            Email
          </label>
          <input
            id="gate-email"
            ref={emailRef}
            className="usf-input"
            type="email"
            placeholder="Enter email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          {submitted && errs.email && (
            <div className="usf-error">{errs.email}</div>
          )}

          <label className="usf-label" htmlFor="gate-password">
            Password
          </label>
          <input
            id="gate-password"
            className="usf-input"
            type="password"
            placeholder="Enter password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {submitted && errs.password && (
            <div className="usf-error">{errs.password}</div>
          )}

          {authErr && <div className="usf-error">{authErr}</div>}

          <button
            type="submit"
            className="usf-btn usf-btn-primary"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="gate-signup">
          Need an account?{" "}
          <button className="gate-link" onClick={onSignUp}>
            Sign up
          </button>
        </div>

        <div className="gate-divider">
          <span>OR</span>
        </div>

        <button className="gate-guest-btn" onClick={onGuest}>
          <span className="gate-guest-ico" aria-hidden>
            👤
          </span>
          Continue as Guest User
        </button>
      </div>
    </div>
  );
}
