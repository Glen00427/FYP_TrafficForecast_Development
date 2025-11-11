import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import ApproveAppealModal from "./ApproveAppealModal";
import RejectAppealModal from "./RejectAppealModal";
import RetractConfirmationModal from "./RetractConfirmationModal";

function AppealsTab({ onLogAction }) {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRetractModal, setShowRetractModal] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");

  const mockAdminId = 5;

  // Fetch appeals from database
  const fetchAppeals = async () => {
    try {
      setLoading(true);

      const { data: appealsData, error } = await supabase
        .from("appeals")
        .select(
          `
          appeals_id,
          user_id,
          incident_id,
          appeal_type,
          message,
          status,
          admin_response,
          responded_by,
          created_at,
          updated_at,
          users:user_id (userid, name, email, status),
          incidents:incident_id (id, location, incidentType, severity, description, status)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedAppeals = (appealsData || []).map((appeal) => ({
        id: appeal.appeals_id,
        type:
          appeal.appeal_type === "ban_appeal"
            ? "Ban Appeal"
            : "Incident Rejection Appeal",
        appealType: appeal.appeal_type,
        from: appeal.users?.name || `User ${appeal.user_id}`,
        submitted: new Date(appeal.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        message: appeal.message,
        status: appeal.status,
        admin_response: appeal.admin_response,
        responded_by: appeal.responded_by,
        appealData: appeal,
        incidentContext: appeal.incidents
          ? {
              id: appeal.incidents.id,
              location: appeal.incidents.location,
              type: appeal.incidents.incidentType,
              severity: appeal.incidents.severity,
              description: appeal.incidents.description,
              status: appeal.incidents.status,
            }
          : null,
        userContext: appeal.users
          ? {
              id: appeal.users.userid,
              name: appeal.users.name,
              status: appeal.users.status,
            }
          : null,
      }));

      setAppeals(formattedAppeals);
    } catch (error) {
      console.error("Error fetching appeals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppeals();
  }, []);

  const handleApprove = (appeal) => {
    setSelectedAppeal(appeal);
    setShowApproveModal(true);
  };

  const handleReject = (appeal) => {
    setSelectedAppeal(appeal);
    setShowRejectModal(true);
  };

  const handleRetractClick = (appeal) => {
    setSelectedAppeal(appeal);
    setShowRetractModal(true);
  };

  const handleRetractConfirm = async () => {
    if (!selectedAppeal) return;

    try {
      const { error: appealError } = await supabase
        .from("appeals")
        .update({
          status: "pending",
          admin_response: null,
          responded_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("appeals_id", selectedAppeal.id);

      if (appealError) throw appealError;

      const appealData = selectedAppeal.appealData;

      if (
        appealData.appeal_type === "ban_appeal" &&
        selectedAppeal.status === "approved"
      ) {
        const { error: userError } = await supabase
          .from("users")
          .update({
            status: "banned",
            ban_reason: "Decision retracted - appeal reopened",
          })
          .eq("userid", appealData.user_id);

        if (userError) throw userError;

        // Audit log
        await onLogAction(
          "appeal_retract",
          `Retracted ban appeal decision for user: ${selectedAppeal.from}`,
          "Appeal reopened - user re-banned",
          appealData.user_id,
          null
        );
      } else if (
        appealData.appeal_type === "incident_rejection_appeal" &&
        appealData.incident_id &&
        selectedAppeal.status === "approved"
      ) {
        const { error: incidentError } = await supabase
          .from("incident_report")
          .update({
            status: "rejected",
            reason: "Decision retracted - appeal reopened",
          })
          .eq("id", appealData.incident_id);

        if (incidentError) throw incidentError;

        // Audit log
        await onLogAction(
          "appeal_retract",
          `Retracted incident appeal decision for incident #${appealData.incident_id}`,
          "Appeal reopened - incident re-rejected",
          appealData.user_id,
          appealData.incident_id
        );
      }

      await fetchAppeals();
      setShowRetractModal(false);
      setSelectedAppeal(null);
    } catch (error) {
      console.error("Error retracting decision:", error);
      alert("Failed to retract decision. Please try again.");
    }
  };

  const handleApproveAppeal = async (response) => {
    if (!selectedAppeal) return;

    try {
      // Update appeal status
      const { error: appealError } = await supabase
        .from("appeals")
        .update({
          status: "approved",
          admin_response: response,
          responded_by: mockAdminId,
          updated_at: new Date().toISOString(),
        })
        .eq("appeals_id", selectedAppeal.id);

      if (appealError) throw appealError;

      const appealData = selectedAppeal.appealData;

      if (appealData.appeal_type === "ban_appeal") {
        const { error: userError } = await supabase
          .from("users")
          .update({
            status: "active",
            ban_reason: null,
          })
          .eq("userid", appealData.user_id);

        if (userError) throw userError;

        // Audit log
        await onLogAction(
          "appeal_approve",
          `Approved ban appeal for user: ${selectedAppeal.from}`,
          `Response: ${response} | User unbanned`,
          appealData.user_id,
          null
        );
      } else if (
        appealData.appeal_type === "incident_rejection_appeal" &&
        appealData.incident_id
      ) {
        const { error: incidentError } = await supabase
          .from("incident_report")
          .update({
            status: "approved",
            reason: null,
          })
          .eq("id", appealData.incident_id);

        if (incidentError) throw incidentError;

        // Audit log
        await onLogAction(
          "appeal_approve",
          `Approved incident appeal #${appealData.incident_id} for user: ${selectedAppeal.from}`,
          `Response: ${response} | Incident re-approved`,
          appealData.user_id,
          appealData.incident_id
        );
      }

      await fetchAppeals();
      setShowApproveModal(false);
      setSelectedAppeal(null);
    } catch (error) {
      console.error("Error approving appeal:", error);
      alert("Failed to approve appeal. Please try again.");
    }
  };

  const handleRejectAppeal = async (reason) => {
    if (!selectedAppeal) return;

    try {
      const { error } = await supabase
        .from("appeals")
        .update({
          status: "rejected",
          admin_response: reason,
          responded_by: mockAdminId,
          updated_at: new Date().toISOString(),
        })
        .eq("appeals_id", selectedAppeal.id);

      if (error) throw error;

      const appealData = selectedAppeal.appealData;
      const appealType =
        appealData.appeal_type === "ban_appeal" ? "ban" : "incident";

      // Audit log
      await onLogAction(
        "appeal_reject",
        `Rejected ${appealType} appeal from: ${selectedAppeal.from}`,
        `Reason: ${reason}`,
        appealData.user_id,
        appealData.incident_id || null
      );

      await fetchAppeals();
      setShowRejectModal(false);
      setSelectedAppeal(null);
    } catch (error) {
      console.error("Error rejecting appeal:", error);
      alert("Failed to reject appeal. Please try again.");
    }
  };

  // Filter appeals
  const filteredAppeals = appeals.filter((appeal) => {
    const statusMatch =
      filter === "all" ||
      (filter === "pending" && appeal.status === "pending") ||
      (filter === "resolved" &&
        (appeal.status === "approved" || appeal.status === "rejected"));

    const typeMatch =
      typeFilter === "all" || appeal.appealType === `${typeFilter}_appeal`;

    return statusMatch && typeMatch;
  });

  const pendingCount = appeals.filter((a) => a.status === "pending").length;
  const resolvedCount = appeals.filter(
    (a) => a.status === "approved" || a.status === "rejected"
  ).length;
  const totalCount = appeals.length;

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading appeals...</p>
      </div>
    );
  }

  return (
    <div className="appeals-tab">
      <div className="appeals-filters">
        <div className="filter-group">
          <h4>Status</h4>
          <div className="filter-buttons">
            <button
              className={filter === "pending" ? "active" : ""}
              onClick={() => setFilter("pending")}
            >
              Pending ({pendingCount})
            </button>
            <button
              className={filter === "resolved" ? "active" : ""}
              onClick={() => setFilter("resolved")}
            >
              Resolved ({resolvedCount})
            </button>
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              All ({totalCount})
            </button>
          </div>
        </div>

        <div className="filter-group">
          <h4>Appeal Type</h4>
          <div className="dropdown-filter">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="type-dropdown"
            >
              <option value="all">All Appeal Types</option>
              <option value="ban">Ban Appeals</option>
              <option value="incident">Incident Appeals</option>
            </select>
          </div>
        </div>
      </div>

      <div className="appeals-list">
        {filteredAppeals.length > 0 ? (
          filteredAppeals.map((appeal) => (
            <AppealCard
              key={appeal.id}
              appeal={appeal}
              onApprove={handleApprove}
              onReject={handleReject}
              onRetract={handleRetractClick}
              showActions={filter === "pending"}
            />
          ))
        ) : (
          <div className="no-data">
            <p>No appeals found matching the selected filters.</p>
          </div>
        )}
      </div>

      {showApproveModal && (
        <ApproveAppealModal
          appeal={selectedAppeal}
          onClose={() => setShowApproveModal(false)}
          onApprove={handleApproveAppeal}
        />
      )}

      {showRejectModal && (
        <RejectAppealModal
          appeal={selectedAppeal}
          onClose={() => setShowRejectModal(false)}
          onReject={handleRejectAppeal}
        />
      )}

      {showRetractModal && (
        <RetractConfirmationModal
          appeal={selectedAppeal}
          onClose={() => setShowRetractModal(false)}
          onConfirm={handleRetractConfirm}
        />
      )}
    </div>
  );
}

// Appeal Card Component (unchanged)
function AppealCard({ appeal, onApprove, onReject, onRetract, showActions }) {
  const isResolved =
    appeal.status === "approved" || appeal.status === "rejected";

  return (
    <div className="appeal-card">
      <div className="appeal-header">
        <h4>{appeal.type}</h4>
        <div className="appeal-status">
          <span className={`status-badge status-${appeal.status}`}>
            {appeal.status.charAt(0).toUpperCase() + appeal.status.slice(1)}
          </span>
          <span className="appeal-date">{appeal.submitted}</span>
        </div>
      </div>

      <div className="appeal-meta">
        <strong>From: {appeal.from}</strong>
        {appeal.userContext && (
          <div className="user-context">
            <small>
              <strong>User Status:</strong> {appeal.userContext.status}
            </small>
          </div>
        )}
        {appeal.incidentContext && (
          <div className="incident-context">
            <small>
              <strong>Incident #{appeal.incidentContext.id}:</strong>{" "}
              {appeal.incidentContext.type} at {appeal.incidentContext.location}{" "}
              ({appeal.incidentContext.severity}) - Status:{" "}
              {appeal.incidentContext.status}
            </small>
            {appeal.incidentContext.description && (
              <small className="incident-description">
                {appeal.incidentContext.description}
              </small>
            )}
          </div>
        )}
      </div>

      <p className="appeal-message">{appeal.message}</p>

      {isResolved && appeal.admin_response && (
        <div className="appeal-response">
          <div className="response-header">
            <strong>
              {appeal.status === "approved" ? "Approved" : "Rejected"}
              {appeal.responded_by && ` by Admin`}
            </strong>
          </div>
          <p>{appeal.admin_response}</p>
        </div>
      )}

      <div className="appeal-actions">
        {showActions && appeal.status === "pending" && (
          <>
            <button onClick={() => onApprove(appeal)} className="btn-success">
              Approve
            </button>
            <button onClick={() => onReject(appeal)} className="btn-danger">
              Reject
            </button>
          </>
        )}
        {isResolved && (
          <button onClick={() => onRetract(appeal)} className="btn-warning">
            Retract Decision
          </button>
        )}
      </div>
    </div>
  );
}

export default AppealsTab;
