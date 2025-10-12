import React, { useEffect, useMemo, useRef, useState } from "react";

export default function CreateUserAccount({
  open,
  onClose,
  onSubmit,
  onLearnMore,
  fullScreen = false,
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // NEW
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const firstRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setSubmitted(false);

    setTimeout(() => firstRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const errs = useMemo(() => {
    const e = {};
    if (!name.trim()) e.name = "Name must be entered";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Valid email must be entered";
    if (!password) {
      e.password = "Password must be entered";
    } else if (password.length < 8) {
      e.password = "Password must be at least 8 characters";
    }
    // Optional phone validation (if provided, lightly check digits/spaces)
    if (phone && !/^[\d\s()+-]{6,}$/.test(phone))
      e.phone = "Enter a valid phone number";
    return e;
  }, [name, email, phone, password]);

  function handleSubmit(ev) {
    ev.preventDefault();
    setSubmitted(true);
    if (Object.keys(errs).length) return;

    // only name now
    onSubmit?.({
      name,
      email,
      phone,
      password,
    });
    onClose?.();
  }

  if (!open) return null;

  const backdropClass = `cam-backdrop${
    fullScreen ? " cam-backdrop--full" : ""
  }`;
  const cardClass = `cam-card${fullScreen ? " cam-card--full" : ""}`;

  return (
    <div
      className={backdropClass}
      role="dialog"
      aria-modal="true"
      aria-label="Create account"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className={cardClass} onClick={(e) => e.stopPropagation()}>
        <button className="cam-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <div className="cam-header">
          <span className="cam-h-ico">👤➕</span>
          <h3 className="cam-title">Create Your Account</h3>
        </div>

        <form className="cam-form" onSubmit={handleSubmit}>
          {/* Name */}
          <label className="cam-label" htmlFor="acc-name">
            Name
          </label>
          <input
            id="acc-name"
            ref={firstRef}
            className="cam-input"
            placeholder="Test User"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          {submitted && errs.name && (
            <div className="cam-error">{errs.name}</div>
          )}

          {/* Email */}
          <label className="cam-label" htmlFor="acc-email">
            Email
          </label>
          <input
            id="acc-email"
            className="cam-input"
            type="email"
            placeholder="testuser123@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            autoComplete="email"
          />
          {submitted && errs.email && (
            <div className="cam-error">{errs.email}</div>
          )}

          {/* Phone Number */}
          <label className="cam-label" htmlFor="acc-phone">
            Phone Number
          </label>
          <input
            id="acc-phone"
            className="cam-input"
            type="tel"
            placeholder="9876 5432"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
          />
          {submitted && errs.phone && (
            <div className="cam-error">{errs.phone}</div>
          )}

          {/* Password */}
          <label className="cam-label" htmlFor="acc-password">
            Password
          </label>
          <input
            id="acc-password"
            className="cam-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          {submitted && errs.password && (
            <div className="cam-error">{errs.password}</div>
          )}

          <button type="submit" className="cam-btn cam-btn-primary">
            Create Account
          </button>

          <button
            type="button"
            className="cam-btn cam-btn-ghost cam-learn-btn"
            onClick={() => onLearnMore?.()}
          >
            <span className="cam-learn-ico-badge">❓</span>
            <span>Learn More</span>
          </button>
        </form>
      </div>
    </div>
  );
}
