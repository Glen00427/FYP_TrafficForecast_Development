// components/UserSignInForm.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function UserSignInForm({ open, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setPassword("");
    setErr("");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setSubmitting(true);

    const emailNorm = (email || "").trim().toLowerCase();
    const pass = (password || "").trim();

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .ilike("email", emailNorm)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("UserSignInForm SELECT error:", error);
        setErr("Sign in failed. Please try again.");
        return;
      }
      if (!data) {
        setErr("No account found for that email.");
        return;
      }
      if (String(data.password ?? "").trim() !== pass) {
        setErr("Incorrect email or password.");
        return;
      }

      const uid = data.id ?? data.userid ?? data.user_id ?? "local";

      onSuccess?.({
        id: uid,
        name: data.name ?? "",
        email: data.email ?? emailNorm,
        role: "user",
        phone: data.phone ?? "",
      });
    } catch (err) {
      console.error("UserSignInForm exception:", err);
      setErr("Sign in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="usf-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="usf-card" onClick={(e) => e.stopPropagation()}>
        <button className="usf-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <div className="usf-header">
          <span className="usf-ico">🔐</span>
          <h3 className="usf-title">Sign In</h3>
        </div>

        <form className="usf-form" onSubmit={handleSubmit}>
          <label className="usf-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="usf-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="usf-label" htmlFor="login-pass">
            Password
          </label>
          <input
            id="login-pass"
            className="usf-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {err && <div className="usf-error">{err}</div>}

          <button className="usf-btn usf-btn-primary" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
