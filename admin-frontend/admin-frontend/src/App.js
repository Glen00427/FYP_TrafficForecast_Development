import React, { useState, useEffect } from "react";
import LoginPage from "./component/LoginPage";
import AdminDashboard from "./component/AdminDashboard";
import { supabase } from "./lib/supabaseClient";
import "./App.css"; // Now this file exists

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Fetch user data from users table
          const { data: userData } = await supabase
            .from("users")
            .select("userid, name, email, role, status")
            .eq("email", session.user.email)
            .single();

          if (userData && (userData.role === "admin" || userData.role === "moderator") && userData.status === "active") {
            setUser(userData);
          } else {
            await supabase.auth.signOut();
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userData } = await supabase
          .from("users")
          .select("userid, name, email, role, status")
          .eq("email", session.user.email)
          .single();

        if (userData && (userData.role === "admin" || userData.role === "moderator") && userData.status === "active") {
          setUser(userData);
        } else {
          await supabase.auth.signOut();
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner-large"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {user ? (
        <AdminDashboard user={user} onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;