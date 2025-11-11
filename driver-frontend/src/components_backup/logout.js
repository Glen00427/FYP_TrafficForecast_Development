// components/logout.js (or wherever yours lives)
import React, { useState } from "react";

let supabase = null;
try {
  supabase = require("../lib/supabaseClient").supabase;
} catch (_) {}

export async function doLogout() {
  try {
    if (supabase?.auth?.signOut) {
      await supabase.auth.signOut();
    }
  } catch (_) {}
  try {
    localStorage.removeItem("role");
  } catch (_) {}
}

export default function LogoutButton({
  onLoggedOut,
  label = "Log out",
  className = "",
}) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await doLogout();
      onLoggedOut?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      title="Log out"
      className={className}
    >
      {loading ? "Logging out..." : label}
    </button>
  );
}
