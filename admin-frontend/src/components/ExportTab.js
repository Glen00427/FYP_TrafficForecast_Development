import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

function ExportTab() {
  const [dataType, setDataType] = useState("incidents");
  const [format, setFormat] = useState("csv");
  const [dateRange, setDateRange] = useState("7days");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  const calculateDateRange = (range) => {
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "7days":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30days":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90days":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "1year":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    return { startDate, endDate };
  };

  const getDateString = (date) => date.toISOString().split("T")[0];

  const exportIncidents = async (startDate, endDate, status) => {
    let query = supabase
      .from("incident_report")
      .select("*, users:user_id (name, email)")
      .gte("createdAt", startDate.toISOString())
      .lte("createdAt", endDate.toISOString());

    if (status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return data.map((incident) => ({
      ID: incident.id,
      Type: incident.incidentType,
      Severity: incident.severity,
      Location: incident.location,
      "Full Address": incident.fullAddress,
      Description: incident.description,
      Status: incident.status,
      Tags: incident.tags,
      Reason: incident.reason,
      "Reported By": incident.users?.name || `User ${incident.user_id}`,
      "Reported Email": incident.users?.email || "N/A",
      "Created At": new Date(incident.createdAt).toLocaleString(),
      Latitude: incident.latitude,
      Longitude: incident.longitude,
      "Photo URL": incident.photo_url || "N/A",
      "Verified At": incident.verified_at
        ? new Date(incident.verified_at).toLocaleString()
        : "Not Verified",
      "Verified By":
        incident.verifier?.name ||
        (incident.verified_by ? `Admin ${incident.verified_by}` : "N/A"),
      "Verification Admin ID": incident.verified_by || "N/A",
    }));
  };

  const exportUsers = async (status) => {
    let query = supabase.from("users").select("*");
    if (status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return data.map((user) => ({
      "User ID": user.userid,
      Name: user.name,
      Email: user.email,
      Phone: user.phone,
      Status: user.status,
      Role: user.role,
      "Last Active": user.last_active
        ? new Date(user.last_active).toLocaleString()
        : "Never",
      "Ban Reason": user.ban_reason || "N/A",
    }));
  };

  const exportAppeals = async (startDate, endDate, status) => {
    let query = supabase
      .from("appeals")
      .select(
        "*, users:user_id (name, email), incidents:incident_id (location, incidentType)"
      )
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return data.map((appeal) => ({
      "Appeal ID": appeal.appeals_id,
      Type:
        appeal.appeal_type === "ban_appeal" ? "Ban Appeal" : "Incident Appeal",
      User: appeal.users?.name || `User ${appeal.user_id}`,
      "User Email": appeal.users?.email || "N/A",
      Incident: appeal.incidents
        ? `${appeal.incidents.incidentType} at ${appeal.incidents.location}`
        : "N/A",
      Message: appeal.message,
      Status: appeal.status,
      "Admin Response": appeal.admin_response || "N/A",
      "Responded By": appeal.responded_by || "N/A",
      "Created At": new Date(appeal.created_at).toLocaleString(),
      "Updated At": new Date(appeal.updated_at).toLocaleString(),
    }));
  };

  const exportAuditLogs = async (startDate, endDate) => {
    const { data, error } = await supabase
      .from("audit_logs")
      .select(
        "*, admin:admin_id (name), target_user:target_user_id (name), target_incident:target_incident_id (location)"
      )
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((log) => ({
      "Log ID": log.log_id,
      "Action Type": log.action_type,
      Admin: log.admin?.name || `Admin ${log.admin_id}`,
      "Target User":
        log.target_user?.name ||
        (log.target_user_id ? `User ${log.target_user_id}` : "N/A"),
      "Target Incident": log.target_incident
        ? `Incident at ${log.target_incident.location}`
        : "N/A",
      Description: log.description,
      Details: log.details || "N/A",
      "Created At": new Date(log.created_at).toLocaleString(),
    }));
  };

  const downloadCSV = (data, filename) => {
    if (!data?.length) {
      alert("No data to export");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = String(row[header] || "");
            const escaped = value.replace(/"/g, '""');
            return escaped.includes(",") || escaped.includes('"')
              ? `"${escaped}"`
              : escaped;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, filename);
  };

  const downloadJSON = (data, filename) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    downloadBlob(blob, filename);
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusOptions = () => {
    const options = {
      incidents: [
        { value: "all", label: "All Status" },
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
      ],
      users: [
        { value: "all", label: "All Status" },
        { value: "active", label: "Active" },
        { value: "banned", label: "Banned" },
        { value: "inactive", label: "Inactive" },
      ],
      appeals: [
        { value: "all", label: "All Status" },
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
      ],
    };

    return options[dataType] || [{ value: "all", label: "All Status" }];
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportResult(null);

      const { startDate, endDate } = calculateDateRange(dateRange);

      let data, fileName;
      switch (dataType) {
        case "incidents":
          data = await exportIncidents(startDate, endDate, statusFilter);
          fileName = `incidents_${getDateString(startDate)}_to_${getDateString(
            endDate
          )}`;
          break;
        case "users":
          data = await exportUsers(statusFilter);
          fileName = `users_${getDateString(new Date())}`;
          break;
        case "appeals":
          data = await exportAppeals(startDate, endDate, statusFilter);
          fileName = `appeals_${getDateString(startDate)}_to_${getDateString(
            endDate
          )}`;
          break;
        case "audit_logs":
          data = await exportAuditLogs(startDate, endDate);
          fileName = `audit_logs_${getDateString(startDate)}_to_${getDateString(
            endDate
          )}`;
          break;
        default:
          throw new Error("Unknown data type");
      }

      format === "csv"
        ? downloadCSV(data, `${fileName}.csv`)
        : downloadJSON(data, `${fileName}.json`);

      setExportResult({
        success: true,
        message: `Successfully exported ${data.length} records`,
        count: data.length,
      });
    } catch (error) {
      console.error("Export error:", error);
      setExportResult({
        success: false,
        message: `Export failed: ${error.message}`,
      });
    } finally {
      setExporting(false);
    }
  };

  const dataTypeDescriptions = {
    incidents: "Export traffic incident reports with full details",
    users: "Export user accounts and their status",
    appeals: "Export appeal requests and their resolutions",
    audit_logs: "Export admin activity audit logs",
  };

  const formatDescriptions = {
    csv: "Best for spreadsheets and data analysis",
    json: "Best for developers and system integration",
  };

  const dateRangeDescriptions = {
    today: "Export data from today only",
    "7days": "Export data from the past week",
    "30days": "Export data from the past month",
    "90days": "Export data from the past quarter",
    "1year": "Export data from the past year",
  };

  return (
    <div className="export-tab">
      <div className="export-header">
        <h2>Data Export</h2>
        <p className="export-subtitle">
          Export your data in various formats for analysis and reporting
        </p>
      </div>

      <div className="export-form">
        <div className="form-group">
          <label>Data Type</label>
          <select
            value={dataType}
            onChange={(e) => setDataType(e.target.value)}
            className="export-select"
          >
            <option value="incidents">Incident Reports</option>
            <option value="users">User Data</option>
            <option value="appeals">Appeals</option>
            <option value="audit_logs">Audit Logs</option>
          </select>
          <small className="export-description">
            {dataTypeDescriptions[dataType]}
          </small>
        </div>

        <div className="form-group">
          <label>Export Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="export-select"
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
          <small className="export-description">
            {formatDescriptions[format]}
          </small>
        </div>

        <div className="form-group">
          <label>Date Range</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="export-select"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="1year">Last Year</option>
          </select>
          <small className="export-description">
            {dateRangeDescriptions[dateRange]}
          </small>
        </div>

        {(dataType === "incidents" ||
          dataType === "users" ||
          dataType === "appeals") && (
          <div className="form-group">
            <label>Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="export-select"
            >
              {getStatusOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small className="export-description">
              Filter records by their current status
            </small>
          </div>
        )}

        <button
          onClick={handleExport}
          className="btn-primary export-btn"
          disabled={exporting}
        >
          {exporting ? (
            <>
              <div className="export-spinner"></div>
              Exporting Data...
            </>
          ) : (
            `Export ${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`
          )}
        </button>

        {exportResult && (
          <div
            className={`export-result ${
              exportResult.success ? "success" : "error"
            }`}
          >
            <div className="export-result-icon">
              {exportResult.success ? "✅" : "❌"}
            </div>
            <div className="export-result-content">
              <strong>
                {exportResult.success ? "Export Successful" : "Export Failed"}
              </strong>
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
