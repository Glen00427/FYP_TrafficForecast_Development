import React, { useState, useEffect } from "react";
import "./AdminDashboard.css";
import HomeTab from "./HomeTab";
import IncidentsTab from "./IncidentsTab";
import UsersTab from "./UsersTab";
import AnalyticsTab from "./AnalyticsTab";
import AppealsTab from "./AppealsTab";
import BulkActionsTab from "./BulkActionsTab";
import AuditLogsTab from "./AuditLogsTab";
import ExportTab from "./ExportTab";
import { supabase } from "../lib/supabaseClient";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("home");
  const [selectedIncidents, setSelectedIncidents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingReviews: 0,
    pendingAppeals: 0,
    todaysReports: 0,
    bannedUsers: 0,
    verifiedReports: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [debugInfo, setDebugInfo] = useState("");

  const tabs = [
    "Home",
    "Incidents",
    "Users",
    "Analytics",
    "Appeals",
    "Bulk Actions",
    "Audit Logs",
    "Export",
  ];

  // Fetch initial data from Supabase
  useEffect(() => {
    fetchData();
  }, []);

  // Set up periodic refreshing every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching data from Supabase...");

      // In AdminDashboard.js fetchData function
      const { data: incidentsData, error: incidentsError } =
        await supabase.from("incident_report").select(`
    id, user_id, incidentType, severity, location, fullAddress, 
    description, photo_url, createdAt, status, tags
  `);

      if (incidentsError) {
        console.error("❌ Error fetching incidents:", incidentsError);
        setDebugInfo(`Incidents Error: ${incidentsError.message}`);
      } else {
        console.log(`📊 Fetched ${incidentsData?.length || 0} incidents`);
        setIncidents(incidentsData || []);
      }

      // Fetch users from users table - only columns that exist
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(
          "userid, name, email, password, phone, status, role, last_active, ban_reason"
        );

      if (usersError) {
        console.error("❌ Error fetching users:", usersError);
        setDebugInfo(`Users Error: ${usersError.message}`);
        return;
      }

      console.log(`👥 Fetched ${usersData?.length || 0} users`);
      setUsers(usersData || []);

      // Calculate stats from real data
      calculateStats(incidentsData || [], usersData || []);

      // Update last updated timestamp
      setLastUpdated(new Date());
      setDebugInfo(
        `✅ Success: ${usersData?.length || 0} users, ${
          incidentsData?.length || 0
        } incidents`
      );
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      setDebugInfo(`Fetch Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (incidentsData, usersData) => {
    const today = new Date().toISOString().split("T")[0];

    // Calculate today's reports
    let todaysReports = 0;
    if (incidentsData.length > 0) {
      const firstIncident = incidentsData[0];
      const dateFields = Object.keys(firstIncident).filter(
        (key) =>
          key.includes("date") ||
          key.includes("Date") ||
          key.includes("created") ||
          key.includes("Created") ||
          key.includes("time")
      );

      if (dateFields.length > 0) {
        const dateField = dateFields[0];
        todaysReports = incidentsData.filter(
          (incident) =>
            incident[dateField] && incident[dateField].startsWith(today)
        ).length;
      } else {
        todaysReports = incidentsData.length;
      }
    }

    const pendingReviews = incidentsData.filter(
      (incident) => incident.status === "pending"
    ).length;

    // Count banned users
    const bannedUsers = usersData.filter(
      (user) => user.status === "banned"
    ).length;

    const verifiedReports = incidentsData.filter(
      (incident) => incident.tags && incident.tags.includes("verified")
    ).length;

    const pendingAppeals = incidentsData.filter(
      (incident) =>
        incident.status === "appeal" || incident.appeal_status === "pending"
    ).length;

    const newStats = {
      totalUsers: usersData.length,
      pendingReviews,
      pendingAppeals,
      todaysReports,
      bannedUsers,
      verifiedReports,
    };

    console.log("🎯 Final stats:", newStats);
    setStats(newStats);
  };

  const toggleIncidentSelection = (id) => {
    setSelectedIncidents((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllIncidents = () => {
    setSelectedIncidents(incidents.map((i) => i.id));
  };

  const clearSelection = () => {
    setSelectedIncidents([]);
  };

  // Function to update incident status in Supabase
  // Function to update incident status in Supabase
  const updateIncidentStatus = async (incidentId, status, tags = []) => {
    try {
      // If tags is an array, convert to text
      const tagsValue = Array.isArray(tags) ? tags.join(", ") : tags;

      const { data, error } = await supabase
        .from("incident_report")
        .update({
          status,
          tags: tagsValue, // Store as text
        })
        .eq("id", incidentId)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error("Error updating incident:", error);
      return null;
    }
  };

  // Function to update user status in Supabase
  const updateUserStatus = async (
    userId,
    status = null,
    reason = null,
    newRole = null
  ) => {
    try {
      console.log("🔄 Updating user status:", {
        userId,
        status,
        reason,
        newRole,
      });

      const updateData = {};

      // Update status if provided (not null)
      if (status !== null) {
        updateData.status = status;
      }

      // Update role if provided (not null)
      if (newRole !== null) {
        updateData.role = newRole;
      }

      // Add ban reason if provided and not null
      if (reason !== null) {
        updateData.ban_reason = reason;
      }

      // If unbanning (status explicitly set to 'active'), clear ban reason
      if (status === "active") {
        updateData.ban_reason = null;
      }

      console.log("📝 Update data:", updateData);

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("userid", userId);

      if (error) {
        console.error("❌ Supabase error:", error);
        throw error;
      }

      console.log("✅ User updated successfully");

      // Refresh data after successful update
      await fetchData();
      return true;
    } catch (error) {
      console.error("❌ Error updating user:", error);
      return false;
    }
  };

  // Function for updating user role only
  const updateUserRole = async (userId, newRole) => {
    try {
      console.log("🔄 Updating user role:", { userId, newRole });

      const { error } = await supabase
        .from("users")
        .update({
          role: newRole,
        })
        .eq("userid", userId);

      if (error) {
        console.error("❌ Supabase error updating role:", error);
        throw error;
      }

      console.log("✅ User role updated successfully");

      // Refresh data after successful update
      await fetchData();
      return true;
    } catch (error) {
      console.error("❌ Error updating user role:", error);
      return false;
    }
  };

  // Soft delete function - mark user as inactive
  const deleteUser = async (userId, reason = "") => {
    try {
      console.log("🔄 Soft deleting user:", { userId, reason });

      const { error } = await supabase
        .from("users")
        .update({
          status: "inactive",
          ban_reason: reason || "User deactivated by admin",
        })
        .eq("userid", userId);

      if (error) {
        console.error("❌ Supabase error soft deleting:", error);
        throw error;
      }

      console.log("✅ User soft deleted successfully");

      // Refresh data after successful update
      await fetchData();
      return true;
    } catch (error) {
      console.error("❌ Error soft deleting user:", error);
      return false;
    }
  };

  // Manual refresh function
  const handleManualRefresh = () => {
    fetchData();
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="header-info">
          <button onClick={handleManualRefresh} className="btn-outline">
            Refresh Data
          </button>
          <div className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          {loading && <span className="loading">Loading...</span>}
          {debugInfo && <div className="debug-info">{debugInfo}</div>}
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="admin-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab.toLowerCase() ? "active" : ""}`}
            onClick={() => setActiveTab(tab.toLowerCase())}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "home" && (
          <HomeTab stats={stats} users={users} incidents={incidents} />
        )}
        {activeTab === "incidents" && (
          <IncidentsTab
            incidents={incidents}
            onUpdateIncident={updateIncidentStatus}
          />
        )}
        {activeTab === "users" && (
          <UsersTab
            users={users}
            onUpdateUser={updateUserStatus}
            onUpdateRole={updateUserRole}
            onDeleteUser={deleteUser}
          />
        )}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "appeals" && <AppealsTab />}
        {activeTab === "bulk actions" && (
          <BulkActionsTab
            incidents={incidents}
            selectedIncidents={selectedIncidents}
            toggleIncidentSelection={toggleIncidentSelection}
            selectAllIncidents={selectAllIncidents}
            clearSelection={clearSelection}
            onUpdateIncidents={updateIncidentStatus}
          />
        )}
        {activeTab === "audit logs" && <AuditLogsTab />}
        {activeTab === "export" && <ExportTab />}
      </div>
    </div>
  );
}
