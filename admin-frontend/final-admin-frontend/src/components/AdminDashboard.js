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
  const [appeals, setAppeals] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingReviews: 0,
    pendingAppeals: 0,
    todaysReports: 0,
    bannedUsers: 0,
    verifiedReports: 0,
  });
  const [loading, setLoading] = useState(true);

  const currentAdminId = user?.userid;

  const getTabsForRole = (role) => {
    if (role === "admin") {
      return [
        "Home",
        "Incidents",
        "Users",
        "Analytics",
        "Appeals",
        "Audit Logs",
        "Export",
      ];
    }
    if (role === "moderator") {
      return ["Home", "Incidents", "Appeals"];
    }
    return [];
  };

  const tabs = getTabsForRole(user?.role);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

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

      if (!incidentsError) {
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

        setIncidents(processedIncidents);
      }

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(
          "userid, name, email, password, phone, status, role, last_active, ban_reason"
        );

      if (!usersError) {
        setUsers(usersData || []);
      }

      const { data: appealsData, error: appealsError } = await supabase
        .from("appeals")
        .select("appeals_id, status, appeal_type, created_at")
        .eq("status", "pending");

      if (!appealsError) {
        setAppeals(appealsData || []);
      }

      calculateStats(incidentsData || [], usersData || [], appealsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (incidentsData, usersData, appealsData) => {
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todaysReports = incidentsData.filter((incident) => {
      if (!incident.createdAt) return false;
      const createdDate = new Date(incident.createdAt);
      return createdDate >= todayStart && createdDate <= todayEnd;
    }).length;

    const pendingReviews = incidentsData.filter(
      (incident) =>
        !incident.status ||
        incident.status === "pending" ||
        !["approved", "rejected"].includes(incident.status)
    ).length;

    const bannedUsers = usersData.filter(
      (user) => user.status === "banned"
    ).length;

    const verifiedReports = incidentsData.filter((incident) => {
      if (!incident.verified_at) return false;
      const verificationDate = new Date(incident.verified_at);
      return verificationDate >= todayStart && verificationDate <= todayEnd;
    }).length;

    const pendingAppeals = appealsData.filter(
      (appeal) => appeal.status === "pending"
    ).length;

    const newStats = {
      totalUsers: usersData.length,
      pendingReviews,
      pendingAppeals,
      todaysReports,
      bannedUsers,
      verifiedReports,
    };

    setStats(newStats);
  };

  const updateIncidentStatus = async (
    incidentId,
    status,
    tags = [],
    reason = null
  ) => {
    try {
      const normalizedStatus = status?.toLowerCase();
      const validStatus =
        normalizedStatus === "approved" || normalizedStatus === "rejected"
          ? normalizedStatus
          : "pending";
      const tagsValue = Array.isArray(tags) ? tags.join(", ") : tags;

      const updateData = {
        status: validStatus,
        tags: tagsValue,
        verified_at:
          normalizedStatus === "pending" ? null : new Date().toISOString(),
        verified_by: normalizedStatus === "pending" ? null : currentAdminId,
      };

      if (reason) {
        updateData.reason = reason;
      } else if (normalizedStatus === "pending") {
        updateData.reason = null;
      }

      const { data, error } = await supabase
        .from("incident_report")
        .update(updateData)
        .eq("id", incidentId)
        .select();

      if (error) throw error;

      await fetchData();
      return data[0];
    } catch (error) {
      console.error("Error updating incident:", error);
      return null;
    }
  };

  const updateUserStatus = async (
    userId,
    status = null,
    reason = null,
    newRole = null
  ) => {
    try {
      const updateData = {};

      if (status !== null) updateData.status = status;
      if (newRole !== null) updateData.role = newRole;
      if (reason !== null) updateData.ban_reason = reason;
      if (status === "active") updateData.ban_reason = null;

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("userid", userId);

      if (error) throw error;

      await fetchData();
      return true;
    } catch (error) {
      console.error("Error updating user:", error);
      return false;
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ role: newRole })
        .eq("userid", userId);

      if (error) throw error;

      await fetchData();
      return true;
    } catch (error) {
      console.error("Error updating user role:", error);
      return false;
    }
  };

  const deleteUser = async (userId, reason = "") => {
    try {
      const { error } = await supabase
        .from("users")
        .update({
          status: "inactive",
          ban_reason: reason || "User deactivated by admin",
        })
        .eq("userid", userId);

      if (error) throw error;

      await fetchData();
      return true;
    } catch (error) {
      console.error("Error soft deleting user:", error);
      return false;
    }
  };

  const logAuditAction = async (
    actionType,
    description,
    details = null,
    targetUserId = null,
    targetIncidentId = null
  ) => {
    try {
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
        console.error("Supabase insert error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Unexpected error in audit logger:", error);
      return false;
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div></div>
        <div className="header-center">
          <h1>Admin Dashboard</h1>
          <div className="user-info">
            Welcome, <strong>{user?.name}</strong> ({user?.role})
          </div>
        </div>
        <div className="header-right">
          <button onClick={onLogout} className="btn-outline logout-btn">
            Logout
          </button>
        </div>
      </header>

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
        {activeTab === "users" && user?.role === "admin" && (
          <UsersTab
            users={users}
            onUpdateUser={updateUserStatus}
            onUpdateRole={updateUserRole}
            onDeleteUser={deleteUser}
            onLogAction={logAuditAction}
            currentUserRole={user?.role}
          />
        )}
        {activeTab === "analytics" && user?.role === "admin" && (
          <AnalyticsTab />
        )}
        {activeTab === "appeals" && (
          <AppealsTab
            onLogAction={logAuditAction}
            currentUser={user}
            onRefreshData={fetchData}
          />
        )}
        {activeTab === "audit_logs" && user?.role === "admin" && (
          <AuditLogsTab />
        )}
        {activeTab === "export" && user?.role === "admin" && <ExportTab />}
      </div>
    </div>
  );
}
