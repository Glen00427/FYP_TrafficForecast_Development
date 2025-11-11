import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

function AuditLogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Fetch audit logs from database
  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("audit_logs")
        .select(
          `
          *,
          admin:admin_id (name, email),
          target_user:target_user_id (name, email),
          target_incident:target_incident_id (location, incidentType)
        `
        )
        .order("created_at", { ascending: false });

      // Apply action filter
      if (actionFilter !== "all") {
        query = query.eq("action_type", actionFilter);
      }

      // Apply date filter
      if (dateFilter !== "all") {
        const now = new Date();
        let startDate = new Date();

        switch (dateFilter) {
          case "today":
            startDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            startDate.setDate(now.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(now.getMonth() - 1);
            break;
          default:
            break;
        }

        if (dateFilter !== "all") {
          query = query.gte("created_at", startDate.toISOString());
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Format the logs for display
      const formattedLogs = (data || []).map((log) => ({
        id: log.log_id,
        action: formatActionType(log.action_type),
        actionType: log.action_type,
        admin: log.admin?.name || `Admin ${log.admin_id}`,
        targetUser:
          log.target_user?.name ||
          (log.target_user_id ? `User ${log.target_user_id}` : null),
        targetIncident: log.target_incident
          ? `${log.target_incident.incidentType} at ${log.target_incident.location}`
          : null,
        description: log.description,
        details: log.details,
        date: new Date(log.created_at).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        fullDate: log.created_at,
      }));

      setLogs(formattedLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [actionFilter, dateFilter]);

  // Format action type for display
  const formatActionType = (actionType) => {
    const actionMap = {
      user_ban: "User Ban",
      user_unban: "User Unban",
      incident_approve: "Incident Approval",
      incident_reject: "Incident Rejection",
      bulk_action: "Bulk Action",
      role_change: "Role Change",
      appeal_approve: "Appeal Approval",
      appeal_reject: "Appeal Rejection",
    };
    return actionMap[actionType] || actionType;
  };

  // Filter logs based on search term
  const filteredLogs = logs.filter(
    (log) =>
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.admin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.targetUser &&
        log.targetUser.toLowerCase().includes(searchTerm.toLowerCase())) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="audit-logs-loading">
        <div className="audit-logs-spinner"></div>
        <p>Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="audit-logs-container">
      <div className="audit-logs-header">
        <h2>Audit Logs</h2>
        <p className="audit-logs-subtitle">
          Track all administrative actions and changes
        </p>
      </div>

      <div className="audit-logs-controls">
        <div className="audit-logs-search">
          <input
            type="text"
            placeholder="Search logs by admin, action, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="audit-logs-search-input"
          />
        </div>

        <div className="audit-logs-filters">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="audit-logs-filter-select"
          >
            <option value="all">All Actions</option>
            <option value="user_ban">User Bans</option>
            <option value="user_unban">User Unbans</option>
            <option value="incident_approve">Incident Approvals</option>
            <option value="incident_reject">Incident Rejections</option>
            <option value="role_change">Role Changes</option>
            <option value="appeal_approve">Appeal Approvals</option>
            <option value="appeal_reject">Appeal Rejections</option>
            <option value="bulk_action">Bulk Actions</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="audit-logs-filter-select"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
          </select>
        </div>
      </div>

      <div className="audit-logs-info">
        <p className="audit-logs-count">
          Showing {filteredLogs.length} of {logs.length} audit log entries
        </p>
      </div>

      <div className="audit-logs-list">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div key={log.id} className="audit-log-entry">
              <div className="audit-log-header">
                <span className="audit-log-action">
                  {log.action} by{" "}
                  <span className="audit-log-admin">{log.admin}</span>
                </span>
                <span className="audit-log-date">{log.date}</span>
              </div>

              <div className="audit-log-description">{log.description}</div>

              {log.details && (
                <div className="audit-log-details">
                  <strong>Details:</strong> {log.details}
                </div>
              )}

              <div className="audit-log-meta">
                {log.targetUser && (
                  <span className="audit-log-target">
                    <strong>User:</strong> {log.targetUser}
                  </span>
                )}
                {log.targetIncident && (
                  <span className="audit-log-target">
                    <strong>Incident:</strong> {log.targetIncident}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="audit-logs-empty">
            <div className="audit-logs-empty-icon">📋</div>
            <p className="audit-logs-empty-text">
              No audit logs found matching your criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditLogsTab;
