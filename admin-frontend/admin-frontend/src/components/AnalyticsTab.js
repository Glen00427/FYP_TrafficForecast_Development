import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

function AnalyticsTab() {
  const [timeRange, setTimeRange] = useState("7days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [chartView, setChartView] = useState("days");
  const [analyticsData, setAnalyticsData] = useState({
    totalReports: 0,
    activeUsers: 0,
    reportAccuracy: 0,
    avgReportsPerUser: 0,
    approvalRate: 0,
    rejectionRate: 0,
    hotspots: [],
    incidentTypes: [],
    topContributors: [],
    dailyReports: [],
    statusDistribution: [],
    severityDistribution: [],
    reportsWithPhotos: 0,
    recentActivity: [],
    dateRangeLabel: "Last 7 Days",
  });
  const [loading, setLoading] = useState(true);
  const [appliedCustomDates, setAppliedCustomDates] = useState({
    start: "",
    end: "",
  });

  // Set default custom dates to last 30 days
  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    setCustomEndDate(formatDateForInput(endDate));
    setCustomStartDate(formatDateForInput(startDate));
    // Also set applied dates to default
    setAppliedCustomDates({
      start: formatDateForInput(startDate),
      end: formatDateForInput(endDate),
    });
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, chartView, appliedCustomDates]);

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    return date.toISOString().split("T")[0];
  };

  // Format date for display (DD/MM/YYYY)
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format date range for week display (3 Oct - 9 Oct)
  const formatWeekRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startDay = start.getDate();
    const startMonth = start.toLocaleDateString("en-US", { month: "short" });
    const endDay = end.getDate();
    const endMonth = end.toLocaleDateString("en-US", { month: "short" });

    // If same month: "3 - 9 Oct"
    if (startMonth === endMonth) {
      return `${startDay} - ${endDay} ${startMonth}`;
    }
    // Different months: "28 Mar - 3 Apr"
    return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
  };

  // Helper function to find the most common value in an array
  const findMostCommonValue = (arr) => {
    if (!arr.length) return null;

    const frequency = {};
    let maxCount = 0;
    let mostCommon = arr[0];

    arr.forEach((value) => {
      frequency[value] = (frequency[value] || 0) + 1;
      if (frequency[value] > maxCount) {
        maxCount = frequency[value];
        mostCommon = value;
      }
    });

    return mostCommon;
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      let startDate, endDate;

      if (
        timeRange === "custom" &&
        appliedCustomDates.start &&
        appliedCustomDates.end
      ) {
        startDate = new Date(appliedCustomDates.start);
        endDate = new Date(appliedCustomDates.end);
        // Set end date to end of day (but don't add extra day)
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999); // Include today
        startDate = new Date();

        switch (timeRange) {
          case "7days":
            startDate.setDate(endDate.getDate() - 6); // -6 to include today and 6 days back = 7 days total
            break;
          case "30days":
            startDate.setDate(endDate.getDate() - 29); // -29 to include today and 29 days back = 30 days total
            break;
          default:
            startDate.setDate(endDate.getDate() - 6);
        }
        startDate.setHours(0, 0, 0, 0);
      }

      console.log("Fetching data for range:", {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        timeRange,
        chartView,
      });

      // Fetch incidents within date range with user information
      const { data: incidentsData, error: incidentsError } = await supabase
        .from("incident_report")
        .select(
          `
          *,
          users:user_id (name, email)
        `
        )
        .gte("createdAt", startDate.toISOString())
        .lte("createdAt", endDate.toISOString())
        .order("createdAt", { ascending: false });

      if (incidentsError) throw incidentsError;

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("userid, name, status, last_active");

      if (usersError) throw usersError;

      // Process analytics data
      const processedData = processAnalyticsData(
        incidentsData || [],
        usersData || [],
        timeRange,
        appliedCustomDates.start,
        appliedCustomDates.end
      );
      setAnalyticsData(processedData);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    setShowCustomDate(range === "custom");
    // Reset chart view to days when changing time range
    if (range !== "custom") {
      setChartView("days");
    }
  };

  const handleDateChange = (type, value) => {
    if (type === "start") {
      setCustomStartDate(value);
    } else {
      setCustomEndDate(value);
    }
  };

  const handleCustomDateApply = () => {
    if (!customStartDate || !customEndDate) {
      alert("Please select both start and end dates");
      return;
    }

    const start = new Date(customStartDate);
    const end = new Date(customEndDate);

    if (start > end) {
      alert("Start date cannot be after end date");
      return;
    }

    // Store the applied dates in a separate state
    setAppliedCustomDates({
      start: customStartDate,
      end: customEndDate,
    });
  };

  const getDateRangeLabel = () => {
    if (
      timeRange === "custom" &&
      appliedCustomDates.start &&
      appliedCustomDates.end
    ) {
      const start = formatDateForDisplay(appliedCustomDates.start);
      const end = formatDateForDisplay(appliedCustomDates.end);
      return `${start} - ${end}`;
    }

    switch (timeRange) {
      case "7days":
        return "Last 7 Days";
      case "30days":
        return "Last 30 Days";
      default:
        return "Last 7 Days";
    }
  };

  // Get max date for date inputs (today)
  const getMaxDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  // Get min date for date inputs (reasonable past date, e.g., 5 years ago)
  const getMinDate = () => {
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 5);
    return minDate.toISOString().split("T")[0];
  };

  const processAnalyticsData = (
    incidents,
    users,
    range,
    startDate,
    endDate
  ) => {
    const totalReports = incidents.length;
    const activeUsers = users.filter((user) => user.status === "active").length;

    // Calculate approval/rejection rates
    const approved = incidents.filter(
      (incident) => incident["status"] === "approved"
    ).length;
    const rejected = incidents.filter(
      (incident) => incident["status"] === "rejected"
    ).length;
    const pending = incidents.filter(
      (incident) =>
        !incident["status"] ||
        incident["status"] === "pending" ||
        incident["status"] === "appeal"
    ).length;

    const approvalRate =
      totalReports > 0 ? Math.round((approved / totalReports) * 100) : 0;
    const rejectionRate =
      totalReports > 0 ? Math.round((rejected / totalReports) * 100) : 0;

    // Calculate report accuracy (based on verified tags)
    const verifiedReports = incidents.filter(
      (incident) =>
        incident["tags"] && incident["tags"].toLowerCase().includes("verified")
    ).length;
    const reportAccuracy =
      totalReports > 0 ? Math.round((verifiedReports / totalReports) * 100) : 0;

    // Calculate average reports per user
    const reportsByUser = {};
    incidents.forEach((incident) => {
      const userId = incident["user_id"];
      reportsByUser[userId] = (reportsByUser[userId] || 0) + 1;
    });
    const avgReportsPerUser =
      Object.keys(reportsByUser).length > 0
        ? Math.round((totalReports / Object.keys(reportsByUser).length) * 10) /
          10
        : 0;

    // Get hotspots (most common locations) - FIXED: case insensitive
    const locationCounts = {};
    incidents.forEach((incident) => {
      const location = (incident["location"] || "Unknown Location").trim();
      if (location) {
        // Convert to lowercase for case-insensitive grouping
        const normalizedLocation = location.toLowerCase();
        locationCounts[normalizedLocation] =
          (locationCounts[normalizedLocation] || 0) + 1;
      }
    });

    const hotspots = Object.entries(locationCounts)
      .map(([normalizedLocation, count]) => {
        // Find the most common casing for display
        const locations = incidents
          .filter(
            (incident) =>
              (incident["location"] || "").toLowerCase() === normalizedLocation
          )
          .map((incident) => incident["location"] || "Unknown Location");

        // Use the most frequent casing, or first found if all equal
        const displayLocation = findMostCommonValue(locations) || locations[0];

        return {
          location: displayLocation,
          normalizedLocation, // keep for reference if needed
          incidents: count,
        };
      })
      .sort((a, b) => b.incidents - a.incidents)
      .slice(0, 5);

    // Get incident type distribution - FIXED: case insensitive
    const typeCounts = {};
    incidents.forEach((incident) => {
      const type = (incident["incidentType"] || "Unknown").trim();
      if (type) {
        // Convert to lowercase for case-insensitive grouping
        const normalizedType = type.toLowerCase();
        typeCounts[normalizedType] = (typeCounts[normalizedType] || 0) + 1;
      }
    });

    const incidentTypes = Object.entries(typeCounts)
      .map(([normalizedType, count]) => {
        // Find the most common casing for display
        const types = incidents
          .filter(
            (incident) =>
              (incident["incidentType"] || "").toLowerCase() === normalizedType
          )
          .map((incident) => incident["incidentType"] || "Unknown");

        // Use the most frequent casing, or first found if all equal
        const displayType = findMostCommonValue(types) || types[0];

        return {
          type: displayType,
          normalizedType, // keep for reference if needed
          count,
        };
      })
      .sort((a, b) => b.count - a.count);

    // Get severity distribution
    const severityCounts = {};
    incidents.forEach((incident) => {
      const severity = incident["severity"] || "Unknown";
      severityCounts[severity] = (severityCounts[severity] || 0) + 1;
    });

    const severityDistribution = Object.entries(severityCounts)
      .map(([severity, count]) => ({ severity, count }))
      .sort((a, b) => b.count - a.count);

    // Get top contributors
    const userReports = {};
    incidents.forEach((incident) => {
      const userId = incident["user_id"];
      userReports[userId] = (userReports[userId] || 0) + 1;
    });

    const topContributors = Object.entries(userReports)
      .map(([userId, reports]) => {
        const user = users.find((u) => u.userid === userId);
        return {
          user: user ? user.name : `User ${userId}`,
          reports: reports,
          userId: userId,
        };
      })
      .sort((a, b) => b.reports - a.reports)
      .slice(0, 5);

    // Get daily/weekly reports based on range and chart view
    const dailyReports = getTimeSeriesReports(
      incidents,
      range,
      startDate,
      endDate
    );

    // Status distribution
    const statusDistribution = [
      { status: "Approved", count: approved, color: "#10b981" },
      { status: "Rejected", count: rejected, color: "#ef4444" },
      { status: "Pending", count: pending, color: "#f59e0b" },
    ];

    // In the processAnalyticsData function, replace the photos calculation with:
    const reportingEngagementRate =
      activeUsers > 0
        ? Math.round((Object.keys(reportsByUser).length / activeUsers) * 100)
        : 0;

    // Recent activity (last 5 reports)
    const recentActivity = incidents.slice(0, 5).map((incident) => ({
      id: incident.id,
      type: incident["incidentType"],
      location: incident["location"],
      severity: incident["severity"],
      status: incident["status"],
      date: incident["createdAt"],
      user: incident.users?.name || `User ${incident["user_id"]}`,
    }));

    return {
      totalReports,
      activeUsers,
      reportAccuracy,
      avgReportsPerUser,
      approvalRate,
      rejectionRate,
      hotspots,
      incidentTypes,
      topContributors,
      dailyReports,
      statusDistribution,
      severityDistribution,
      reportingEngagementRate,
      usersWhoReported: Object.keys(reportsByUser).length,
      recentActivity,
      approved,
      rejected,
      pending,
      dateRangeLabel: getDateRangeLabel(),
    };
  };

  const getTimeSeriesReports = (incidents, range, startDate, endDate) => {
    let timeSeries = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log("Generating time series for:", {
      range,
      chartView,
      start: start.toISOString(),
      end: end.toISOString(),
      incidentCount: incidents.length,
    });

    // For weekly view - group by weeks
    if (chartView === "weeks" && (range === "custom" || range === "30days")) {
      const weeks = [];
      let currentWeekStart = new Date(start);

      // For custom dates, start from the exact start date
      // For 30 days, calculate proper weeks
      if (range === "30days") {
        // For 30 days, start from 30 days ago
        currentWeekStart = new Date();
        currentWeekStart.setDate(currentWeekStart.getDate() - 29);
        currentWeekStart.setHours(0, 0, 0, 0);
      }

      while (currentWeekStart <= end) {
        const weekStart = new Date(currentWeekStart);
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Ensure weekEnd doesn't exceed the selected end date
        const actualWeekEnd = weekEnd > end ? new Date(end) : weekEnd;

        const weekReports = incidents.filter((incident) => {
          try {
            const incidentDate = new Date(incident["createdAt"]);
            return incidentDate >= weekStart && incidentDate <= actualWeekEnd;
          } catch (error) {
            console.error(
              "Error parsing incident date:",
              incident["createdAt"],
              error
            );
            return false;
          }
        }).length;

        weeks.push({
          date: formatWeekRange(weekStart, actualWeekEnd),
          fullDate: `${formatDateForDisplay(
            weekStart.toISOString()
          )} - ${formatDateForDisplay(actualWeekEnd.toISOString())}`,
          reports: weekReports,
          startDate: weekStart,
          endDate: actualWeekEnd,
        });

        // Move to next week (7 days from current start)
        currentWeekStart = new Date(weekStart);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        currentWeekStart.setHours(0, 0, 0, 0);

        // If we've moved past the end date, break
        if (currentWeekStart > end) break;
      }

      timeSeries = weeks;
      console.log("Weekly time series:", weeks);
    } else {
      // Group by day
      let currentDate, lastDate;

      if (range === "custom") {
        currentDate = new Date(start);
        currentDate.setHours(0, 0, 0, 0);
        lastDate = new Date(end);
        lastDate.setHours(23, 59, 59, 999);
      } else {
        // For predefined ranges, calculate the dates
        const days = range === "7days" ? 7 : 30;
        currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - (days - 1));
        currentDate.setHours(0, 0, 0, 0);
        lastDate = new Date();
        lastDate.setHours(23, 59, 59, 999);
      }

      const diffTime = Math.abs(lastDate - currentDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      console.log(
        "Daily view - days:",
        diffDays,
        "from",
        currentDate,
        "to",
        lastDate
      );

      for (let i = 0; i < diffDays; i++) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];

        const dayReports = incidents.filter((incident) => {
          try {
            return (
              incident["createdAt"] && incident["createdAt"].startsWith(dateStr)
            );
          } catch (error) {
            console.error(
              "Error filtering incident by date:",
              incident["createdAt"],
              error
            );
            return false;
          }
        }).length;

        timeSeries.push({
          date: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            ...(diffDays <= 7 ? { weekday: "short" } : {}),
          }),
          fullDate: formatDateForDisplay(dateStr),
          reports: dayReports,
          startDate: date,
          endDate: date,
        });
      }
    }

    console.log("Final time series:", timeSeries);
    return timeSeries;
  };

  const getSeverityColor = (severity) => {
    const severityLower = (severity || "").toLowerCase();
    switch (severityLower) {
      case "high":
        return "#ef4444";
      case "medium":
        return "#f59e0b";
      case "low":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const getStatusColor = (status) => {
    const statusLower = (status || "").toLowerCase();
    switch (statusLower) {
      case "approved":
        return "#10b981";
      case "rejected":
        return "#ef4444";
      case "pending":
        return "#f59e0b";
      default:
        return "#6b7280";
    }
  };

  if (loading) {
    return (
      <div className="analytics-tab">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-tab">
      <div className="time-filters">
        <button
          className={timeRange === "7days" ? "active" : ""}
          onClick={() => handleTimeRangeChange("7days")}
        >
          Last 7 Days
        </button>
        <button
          className={timeRange === "30days" ? "active" : ""}
          onClick={() => handleTimeRangeChange("30days")}
        >
          Last 30 Days
        </button>
        <button
          className={timeRange === "custom" ? "active" : ""}
          onClick={() => handleTimeRangeChange("custom")}
        >
          Custom Date
        </button>
      </div>

      {/* Custom Date Range Selector */}
      {showCustomDate && (
        <div className="custom-date-range">
          <div className="date-inputs">
            <div className="date-input-group">
              <label>From Date:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => handleDateChange("start", e.target.value)}
                className="date-input white-calendar"
                min={getMinDate()}
                max={customEndDate || getMaxDate()}
              />
            </div>
            <div className="date-input-group">
              <label>To Date:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => handleDateChange("end", e.target.value)}
                className="date-input white-calendar"
                min={customStartDate || getMinDate()}
                max={getMaxDate()}
              />
            </div>
            <button
              onClick={handleCustomDateApply}
              className="btn-primary apply-date-btn"
              disabled={!customStartDate || !customEndDate}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Date Range Display */}
      <div className="date-range-display">
        <h3>Analytics: {analyticsData.dateRangeLabel}</h3>
        <p className="date-range-subtitle">
          {analyticsData.totalReports} total reports in selected period
        </p>
      </div>

      <div className="analytics-grid">
        {/* Key Metrics */}
        <div className="analytics-stats">
          <div className="analytics-stat">
            <h4>Total Reports</h4>
            <div className="stat-number">{analyticsData.totalReports}</div>
            <small>In selected period</small>
          </div>
          <div className="analytics-stat">
            <h4>Active Users</h4>
            <div className="stat-number">{analyticsData.activeUsers}</div>
            <small>Currently active</small>
          </div>
          <div className="analytics-stat">
            <h4>Report Accuracy</h4>
            <div className="stat-number">{analyticsData.reportAccuracy}%</div>
            <small>Verified reports</small>
          </div>
          <div className="analytics-stat">
            <h4>Avg Reports/User</h4>
            <div className="stat-number">{analyticsData.avgReportsPerUser}</div>
            <small>Average contribution</small>
          </div>
          <div className="analytics-stat">
            <h4>Reporting Engagement</h4>
            <div className="stat-number">
              {analyticsData.reportingEngagementRate}%
            </div>
            <small>{analyticsData.usersWhoReported} users reported</small>
          </div>
          <div className="analytics-stat">
            <h4>Approval Rate</h4>
            <div className="stat-number">{analyticsData.approvalRate}%</div>
            <small>Of total reports</small>
          </div>
        </div>

        {/* Reports Chart - Always show if there are reports */}
        {analyticsData.dailyReports.length > 0 ? (
          <div className="analytics-section">
            <div className="chart-header">
              <h3>Reports Timeline</h3>
              {/* Chart View Toggle - Show for custom dates and 30 days */}
              {(timeRange === "custom" || timeRange === "30days") && (
                <div className="chart-view-toggle">
                  <button
                    className={chartView === "days" ? "active" : ""}
                    onClick={() => setChartView("days")}
                  >
                    By Days
                  </button>
                  <button
                    className={chartView === "weeks" ? "active" : ""}
                    onClick={() => setChartView("weeks")}
                  >
                    By Weeks
                  </button>
                </div>
              )}
            </div>
            <div className="chart-container">
              <div
                className={`daily-chart ${
                  chartView === "weeks" ? "weekly-view" : ""
                }`}
              >
                {analyticsData.dailyReports.map((day, index) => (
                  <div key={index} className="chart-bar">
                    <div
                      className="bar-fill"
                      style={{
                        height: `${Math.max(
                          10,
                          (day.reports /
                            Math.max(
                              1,
                              ...analyticsData.dailyReports.map(
                                (d) => d.reports
                              )
                            )) *
                            100
                        )}%`,
                      }}
                      title={`${day.reports} reports on ${day.fullDate}`}
                    ></div>
                    <div className="bar-label">
                      <span className="bar-date">{day.date}</span>
                      <span className="bar-count">{day.reports}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="analytics-section">
            <h3>Reports Timeline</h3>
            <div className="no-data">
              <p>No reports found in the selected period</p>
            </div>
          </div>
        )}

        {/* Rest of the components remain the same */}
        {/* Status & Severity Distribution */}
        <div className="distribution-grid">
          <div className="analytics-section">
            <h3>Report Status Distribution</h3>
            <div className="status-distribution">
              {analyticsData.statusDistribution.map((item, index) => (
                <div key={index} className="status-item">
                  <div className="status-bar">
                    <div
                      className="status-fill"
                      style={{
                        width: `${
                          (item.count /
                            Math.max(1, analyticsData.totalReports)) *
                          100
                        }%`,
                        backgroundColor: item.color,
                      }}
                    ></div>
                  </div>
                  <div className="status-info">
                    <span
                      className="status-color"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <span className="status-name">{item.status}</span>
                    <span className="status-count">{item.count}</span>
                    <span className="status-percentage">
                      {Math.round(
                        (item.count / Math.max(1, analyticsData.totalReports)) *
                          100
                      )}
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-section">
            <h3>Severity Distribution</h3>
            <div className="severity-distribution">
              {analyticsData.severityDistribution.map((item, index) => (
                <div key={index} className="severity-item">
                  <div className="severity-info">
                    <span
                      className="severity-dot"
                      style={{
                        backgroundColor: getSeverityColor(item.severity),
                      }}
                    ></span>
                    <span className="severity-name">
                      {item.severity || "Unknown"}
                    </span>
                    <span className="severity-count">{item.count}</span>
                    <span className="severity-percentage">
                      {Math.round(
                        (item.count / Math.max(1, analyticsData.totalReports)) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="severity-bar">
                    <div
                      className="severity-fill"
                      style={{
                        width: `${
                          (item.count /
                            Math.max(1, analyticsData.totalReports)) *
                          100
                        }%`,
                        backgroundColor: getSeverityColor(item.severity),
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="analytics-section">
          <h3>Recent Activity</h3>
          <div className="recent-activity">
            {analyticsData.recentActivity.length > 0 ? (
              analyticsData.recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-main">
                    <div className="activity-type">{activity.type}</div>
                    <div className="activity-details">
                      <span className="activity-location">
                        {activity.location}
                      </span>
                      <span
                        className="activity-severity severity-badge"
                        style={{
                          backgroundColor: getSeverityColor(activity.severity),
                        }}
                      >
                        {activity.severity}
                      </span>
                      <span
                        className="activity-status status-badge"
                        style={{
                          backgroundColor: getStatusColor(activity.status),
                        }}
                      >
                        {activity.status}
                      </span>
                    </div>
                  </div>
                  <div className="activity-meta">
                    <span className="activity-user">by {activity.user}</span>
                    <span className="activity-date">
                      {new Date(activity.date).toLocaleDateString()} at{" "}
                      {new Date(activity.date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-activity">
                <p>No recent activity in the selected period</p>
              </div>
            )}
          </div>
        </div>

        <div className="analytics-lists">
          <div className="analytics-list">
            <h4>Accident Hotspots</h4>
            {analyticsData.hotspots.length > 0 ? (
              analyticsData.hotspots.map((hotspot, index) => (
                <div key={index} className="list-item">
                  <span className="rank">{index + 1}</span>
                  <span className="location">{hotspot.location}</span>
                  <span className="count">{hotspot.incidents} incidents</span>
                </div>
              ))
            ) : (
              <p className="no-data">No hotspot data available</p>
            )}
          </div>

          <div className="analytics-list">
            <h4>Incident Types</h4>
            {analyticsData.incidentTypes.length > 0 ? (
              analyticsData.incidentTypes.map((item, index) => (
                <div key={index} className="list-item">
                  <span className="rank">{index + 1}</span>
                  <span className="type">{item.type}</span>
                  <span className="count">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="no-data">No incident type data available</p>
            )}
          </div>

          <div className="analytics-list">
            <h4>Top Contributors</h4>
            {analyticsData.topContributors.length > 0 ? (
              analyticsData.topContributors.map((contributor, index) => (
                <div key={index} className="list-item">
                  <span className="rank">{index + 1}</span>
                  <span className="user">{contributor.user}</span>
                  <span className="count">{contributor.reports} reports</span>
                </div>
              ))
            ) : (
              <p className="no-data">No contributor data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsTab;
// fully working
