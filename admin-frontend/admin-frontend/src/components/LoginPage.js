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

      console.log("🔐 Attempting login for:", email);

      // Direct database authentication (bypass Supabase Auth)
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("userid, name, email, password, role, status")
        .eq("email", email.trim().toLowerCase())
        .single();

      console.log("👤 User lookup result:", { userData, userError });

      if (userError || !userData) {
        setError("User not found");
        return;
      }

      // Simple password check - in production, use proper hashing!
      // For now, we'll assume the password in database is plain text
      if (userData.password !== password) {
        setError("Invalid password");
        return;
      }

      // Check if user has admin privileges
      if (userData.role !== "admin" && userData.role !== "moderator") {
        setError("Access denied. Admin privileges required.");
        return;
      }

      // Check if user is active
      if (userData.status !== "active") {
        setError("Account is inactive. Please contact administrator.");
        return;
      }

      console.log("✅ Login successful:", userData);

      // Remove password from user data before passing it around
      const { password: _, ...userWithoutPassword } = userData;
      onLogin(userWithoutPassword);
    } catch (error) {
      console.error("❌ Unexpected login error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role) => {
    // Use actual users from your database
    const demoAccounts = {
      admin: {
        email: "test2@gmail.com", // Use your actual user email
        password: "password123", // Use the actual password from your database
      },
    };

    const account = demoAccounts[role];
    if (account) {
      setEmail(account.email);
      setPassword(account.password);
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

        {/* Demo Login Button */}
        <div className="demo-section">
          <p className="demo-label">Quick Login:</p>
          <div className="demo-buttons">
            <button
              type="button"
              className="demo-btn admin-demo"
              onClick={() => handleDemoLogin("admin")}
              disabled={loading}
            >
              Use test2@gmail.com
            </button>
          </div>
        </div>

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
