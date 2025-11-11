import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

function AuditLogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(10); // Show 10 logs per page

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
    const formatted = actionType
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
    return formatted;
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

  // Calculate pagination
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 3;

    if (totalPages <= maxPagesToShow + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= maxPagesToShow) {
        for (let i = 1; i <= maxPagesToShow; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - maxPagesToShow + 1) {
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = totalPages - maxPagesToShow + 1; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [actionFilter, dateFilter, searchTerm]);

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

      <div className="audit-logs-list">
        {currentLogs.length > 0 ? (
          currentLogs.map((log) => (
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

      {/* Pagination */}
      {filteredLogs.length > logsPerPage && (
        <div className="table-footer">
          <span>
            Showing {currentLogs.length} of {filteredLogs.length} audit log
            entries
          </span>
          <div className="pagination">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              Previous
            </button>

            {getPageNumbers().map((number, index) =>
              number === "..." ? (
                <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                  ⋯
                </span>
              ) : (
                <button
                  key={number}
                  onClick={() => paginate(number)}
                  className={`pagination-btn ${
                    currentPage === number ? "active" : ""
                  }`}
                >
                  {number}
                </button>
              )
            )}

            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogsTab;
