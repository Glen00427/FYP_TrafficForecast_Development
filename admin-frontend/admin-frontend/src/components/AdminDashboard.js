import React, { useState, useEffect } from "react";
import "./AdminDashboard.css";
import HomeTab from "./HomeTab";
import IncidentsTab from "./IncidentsTab";
import UsersTab from "./UsersTab";
import AnalyticsTab from "./AnalyticsTab";
import AppealsTab from "./AppealsTab";
import AuditLogsTab from "./AuditLogsTab";
import ExportTab from "./ExportTab";
import { supabase } from "../lib/supabaseClient";

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("home");
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

  // Use the actual logged-in admin ID
  const currentAdminId = user?.userid;

  // Tabs without Bulk Actions
  const tabs = [
    "Home",
    "Incidents",
    "Users",
    "Analytics",
    "Appeals",
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

      // Fetch incidents with user information AND admin verifier information
      const { data: incidentsData, error: incidentsError } = await supabase
        .from("incident_report")
        .select(
          `
          id, user_id, incidentType, severity, location, fullAddress, 
          description, photo_url, createdAt, status, tags, reason,
          verified_at, verified_by,
          users:user_id (name, email),
          admin_verifier:verified_by (name)
        `
        )
        .order("createdAt", { ascending: false });

      if (incidentsError) {
        console.error("❌ Error fetching incidents:", incidentsError);
        setDebugInfo(`Incidents Error: ${incidentsError.message}`);
      } else {
        const processedIncidents = (incidentsData || []).map((incident) => {
          const rawStatus = incident.status?.toLowerCase();
          let normalizedStatus = "pending";

          if (rawStatus === "approved" || rawStatus === "rejected") {
            normalizedStatus = rawStatus;
          }

          return {
            ...incident,
            status: normalizedStatus,
          };
        });

        console.log(`📊 Fetched ${processedIncidents.length} incidents`);
        setIncidents(processedIncidents);
      }

      // Fetch users from users table
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

    let todaysReports = 0;
    if (incidentsData.length > 0) {
      todaysReports = incidentsData.filter(
        (incident) => incident.createdAt && incident.createdAt.startsWith(today)
      ).length;
    }

    const pendingReviews = incidentsData.filter(
      (incident) =>
        !incident.status ||
        incident.status === "pending" ||
        !["approved", "rejected"].includes(incident.status)
    ).length;

    const bannedUsers = usersData.filter(
      (user) => user.status === "banned"
    ).length;

    const verifiedReports = incidentsData.filter(
      (incident) => incident.verified_at !== null
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

  // Function to update incident status in Supabase with verification tracking
  const updateIncidentStatus = async (
    incidentId,
    status,
    tags = [],
    reason = null
  ) => {
    try {
      console.log("🔄 Updating incident:", {
        incidentId,
        status,
        tags,
        reason,
      });

      const normalizedStatus = status?.toLowerCase();
      const validStatus =
        normalizedStatus === "approved" || normalizedStatus === "rejected"
          ? normalizedStatus
          : "pending";

      const tagsValue = Array.isArray(tags) ? tags.join(", ") : tags;

      const updateData = {
        status: validStatus,
        tags: tagsValue,
        verified_at: new Date().toISOString(),
        verified_by: currentAdminId,
      };

      if (reason) {
        updateData.reason = reason;
      }

      const { data, error } = await supabase
        .from("incident_report")
        .update(updateData)
        .eq("id", incidentId)
        .select();

      if (error) {
        console.error("❌ Supabase error:", error);
        throw error;
      }

      console.log("✅ Incident updated successfully:", data[0]);

      setIncidents((prevIncidents) =>
        prevIncidents.map((incident) =>
          incident.id === incidentId
            ? {
                ...incident,
                status: validStatus,
                tags: tagsValue,
                reason: reason || incident.reason,
                verified_at: new Date().toISOString(),
                verified_by: currentAdminId,
              }
            : incident
        )
      );

      return data[0];
    } catch (error) {
      console.error("❌ Error updating incident:", error);
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

  const logAuditAction = async (
    actionType,
    description,
    details = null,
    targetUserId = null,
    targetIncidentId = null
  ) => {
    try {
      console.log("📝 Logging audit action:", { actionType, description });

      const { data, error } = await supabase
        .from("audit_logs")
        .insert({
          admin_id: currentAdminId,
          action_type: actionType,
          target_user_id: targetUserId,
          target_incident_id: targetIncidentId,
          description: description,
          details: details,
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error("❌ Supabase insert error:", error);
        return false;
      }

      console.log("✅ Audit action logged successfully:", data);
      return true;
    } catch (error) {
      console.error("❌ Unexpected error in audit logger:", error);
      return false;
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="header-left">
          <h1>Admin Dashboard</h1>
          <div className="user-info">
            Welcome, <strong>{user?.name}</strong> ({user?.role})
          </div>
        </div>
        <div className="header-info">
          <button onClick={handleManualRefresh} className="btn-outline">
            Refresh Data
          </button>
          <button onClick={onLogout} className="btn-outline logout-btn">
            Logout
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
            className={`tab ${
              activeTab === tab.toLowerCase().replace(" ", "_") ? "active" : ""
            }`}
            onClick={() => setActiveTab(tab.toLowerCase().replace(" ", "_"))}
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
            onLogAction={logAuditAction}
          />
        )}
        {activeTab === "users" && (
          <UsersTab
            users={users}
            onUpdateUser={updateUserStatus}
            onUpdateRole={updateUserRole}
            onDeleteUser={deleteUser}
            onLogAction={logAuditAction}
          />
        )}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "appeals" && <AppealsTab onLogAction={logAuditAction} />}
        {activeTab === "audit_logs" && <AuditLogsTab />}
        {activeTab === "export" && <ExportTab />}
      </div>
    </div>
  );
}
