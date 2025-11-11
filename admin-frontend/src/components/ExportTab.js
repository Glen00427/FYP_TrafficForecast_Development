import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

function ExportTab() {
  const [dataType, setDataType] = useState("incidents");
  const [format, setFormat] = useState("csv");
  const [dateRange, setDateRange] = useState("7days");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportResult(null);

      // Compute date range
      const { startDate, endDate } = calculateDateRange(dateRange);

      // Build data & filename per type
      let data;
      let fileName;

      switch (dataType) {
        case "incidents":
          data = await exportIncidents(startDate, endDate, statusFilter);
          fileName = `incidents_${getDateString(startDate)}_to_${getDateString(endDate)}`;
          break;
        case "users":
          data = await exportUsers(statusFilter);
          fileName = `users_${getDateString(new Date())}`;
          break;
        case "appeals":
          data = await exportAppeals(startDate, endDate, statusFilter);
          fileName = `appeals_${getDateString(startDate)}_to_${getDateString(endDate)}`;
          break;
        case "audit_logs":
          data = await exportAuditLogs(startDate, endDate);
          fileName = `audit_logs_${getDateString(startDate)}_to_${getDateString(endDate)}`;
          break;
        default:
          throw new Error("Unknown data type");
      }

      if (!data || data.length === 0) {
        setExportResult({
          success: false,
          message: "No data to export for the chosen filters.",
          count: 0,
        });
        return;
      }

      if (format === "csv") {
        downloadCSV(data, `${fileName}.csv`);
      } else if (format === "json") {
        downloadJSON(data, `${fileName}.json`);
      } else {
        throw new Error("Unsupported format");
      }

      setExportResult({
        success: true,
        message: "File generated and download started.",
        count: data.length,
      });
    } catch (err) {
      console.error(err);
      setExportResult({
        success: false,
        message: err?.message || "Export failed unexpectedly.",
      });
    } finally {
      setExporting(false);
    }
  };

  // ===== Helpers =====

  const getStatusOptions = () => [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending Review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "resolved", label: "Resolved" },
    { value: "banned", label: "Banned (users only)" },
    { value: "active", label: "Active (users only)" },
  ];

  const calculateDateRange = (preset) => {
    const end = new Date();
    const start = new Date(end);

    switch (preset) {
      case "7days":
        start.setDate(end.getDate() - 7);
        break;
      case "30days":
        start.setDate(end.getDate() - 30);
        break;
      case "90days":
        start.setDate(end.getDate() - 90);
        break;
      case "custom":
        // For now, custom is same as 7 days unless you wire a date picker
        start.setDate(end.getDate() - 7);
        break;
      default:
        start.setDate(end.getDate() - 7);
    }
    return { startDate: start, endDate: end };
  };

  const getDateString = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  // ===== Data fetchers (adjust table/column names here if needed) =====

  // INCIDENTS
  const exportIncidents = async (startDate, endDate, status) => {
    let query = supabase
      .from("incident_report")
      .select(
        `
        *,
        users:user_id (name, email)
      `
      )
      .gte("createdAt", startDate.toISOString())
      .lte("createdAt", endDate.toISOString());

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Flatten for export
    return data.map((incident) => ({
      ID: incident.id,
      Type: incident.incidentType,
      Severity: incident.severity,
      Location: incident.location,
      "Full Address": incident.fullAddress,
      Description: incident.description,
      "Photo URL": incident.photo_url || "",
      Status: incident.status,
      Tags: Array.isArray(incident.tags) ? incident.tags.join("|") : "",
      "Created At": incident.createdAt,
      "User ID": incident.user_id,
      "User Name": incident.users?.name || "",
      "User Email": incident.users?.email || "",
    }));
  };

  // USERS
  const exportUsers = async (status) => {
    let query = supabase.from("users").select("*");
    if (status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return data.map((user) => ({
      "User ID": user.userid || user.id || user.user_id,
      Name: user.name,
      Email: user.email,
      Role: user.role,
      Status: user.status,
      "Created At": user.created_at || user.createdAt,
      "Phone": user.phone || "",
    }));
  };

  // APPEALS
  const exportAppeals = async (startDate, endDate, status) => {
    let query = supabase
      .from("appeals")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return data.map((a) => ({
      "Appeal ID": a.id,
      "Appeal Type": a.appeal_type,
      Status: a.status,
      Reason: a.appeal_reason,
      "Created At": a.created_at,
      "Responded By": a.responded_by || "",
      "Admin Response": a.admin_response || "",
      "Target Incident ID": a.incident_id || "",
      "Target User ID": a.user_id || "",
    }));
  };

  // AUDIT LOGS
  const exportAuditLogs = async (startDate, endDate) => {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());
    if (error) throw error;

    return data.map((r) => ({
      "Log ID": r.id,
      "Admin ID": r.admin_id,
      "Action Type": r.action_type,
      Description: r.description,
      Details: typeof r.details === "object" ? JSON.stringify(r.details) : (r.details || ""),
      "Target User ID": r.target_user_id || "",
      "Target Incident ID": r.target_incident_id || "",
      "Created At": r.created_at,
    }));
  };

  // ===== Download helpers =====
  const downloadCSV = (rows, filename) => {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header] ?? "";
            const needsQuotes = /[",\n]/.test(String(value));
            const escaped = String(value).replace(/"/g, '""');
            return needsQuotes ? `"${escaped}"` : escaped;
          })
          .join(",")
      ),
    ].join("\n");
    downloadBlob(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), filename);
  };

  const downloadJSON = (rows, filename) => {
    downloadBlob(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }), filename);
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ===== UI =====
  return (
    <div className="export-tab">
      <h2>Data Export</h2>
      <div className="export-form">
        <div className="form-group">
          <label>Data Type</label>
          <select value={dataType} onChange={(e) => setDataType(e.target.value)}>
            <option value="incidents">Incidents</option>
            <option value="users">Users</option>
            <option value="appeals">Appeals</option>
            <option value="audit_logs">Audit Logs</option>
          </select>
          <small className="hint">
            {dataType === "incidents" && "Export traffic incident reports with full details"}
            {dataType === "users" && "Export user accounts and their status"}
            {dataType === "appeals" && "Export appeal requests and their resolutions"}
            {dataType === "audit_logs" && "Export admin activity audit logs"}
          </small>
        </div>

        <div className="form-group">
          <label>Export Format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </div>

        <div className="form-group">
          <label>Date Range</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="custom">Custom (placeholder)</option>
          </select>
          <small className="hint">
            For now, “Custom” uses 7 days by default. You can wire date pickers later.
          </small>
        </div>

        <div className="form-group">
          <label>Status Filter</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {getStatusOptions().map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <button onClick={handleExport} className="btn-primary export-btn" disabled={exporting}>
          {exporting ? "Exporting…" : "Export Data"}
        </button>

        {exportResult && (
          <div className={`export-result ${exportResult.success ? "success" : "error"}`}>
            <div className="export-result-content">
              <strong>{exportResult.success ? "Export Successful" : "Export Failed"}</strong>
              <p>{exportResult.message}</p>
              {exportResult.count !== undefined && (
                <small>Records exported: {exportResult.count}</small>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExportTab;
