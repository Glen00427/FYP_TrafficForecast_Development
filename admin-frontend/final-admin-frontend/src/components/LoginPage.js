import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./LoginPage.css";

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("userid, name, email, password, role, status")
        .eq("email", email.trim().toLowerCase())
        .single();

      if (userError || !userData) {
        setError("User not found");
        return;
      }

      if (userData.password !== password) {
        setError("Invalid password");
        return;
      }

      if (userData.role !== "admin" && userData.role !== "moderator") {
        setError("Access denied. Admin privileges required.");
        return;
      }

      if (userData.status !== "active") {
        setError("Account is inactive. Please contact administrator.");
        return;
      }

      const { password: _, ...userWithoutPassword } = userData;
      onLogin(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Admin Dashboard</h1>
          <p>Sign in to access the administration panel</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <div className="spinner"></div>
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            <strong>Note:</strong> Using direct database authentication. Make
            sure your password in the database matches what you enter.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
