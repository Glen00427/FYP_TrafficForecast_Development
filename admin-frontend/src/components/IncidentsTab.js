import React, { useState } from "react";
import IncidentCard from "./IncidentCard";
import AIAnalysisModal from "./AIAnalysisModal";
import ApproveModal from "./ApproveModal";
import RejectModal from "./RejectModal";
import AddTagsModal from "./AddTagsModal";
import RetractIncidentModal from "./RetractIncidentModal";

function IncidentsTab({ incidents, onUpdateIncident, onLogAction }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showRetract, setShowRetract] = useState(false);

  // Local state for incidents to allow immediate updates
  const [localIncidents, setLocalIncidents] = useState(incidents);

  // Update local incidents when props change
  React.useEffect(() => {
    setLocalIncidents(incidents);
  }, [incidents]);

  const handleAIAnalysis = (incident) => {
    setSelectedIncident(incident);
    setShowAI(true);
  };

  const handleApprove = (incident) => {
    setSelectedIncident(incident);
    setShowApprove(true);
  };

  const handleReject = (incident) => {
    setSelectedIncident(incident);
    setShowReject(true);
  };

  const handleAddTags = (incident) => {
    setSelectedIncident(incident);
    setShowTags(true);
  };

  const handleRetract = (incident) => {
    console.log("↩️ Retract Decision clicked for:", incident);
    setSelectedIncident(incident);
    setShowRetract(true);
  };
  

  const handleApproveIncident = async (tags = []) => {
    if (selectedIncident) {
      try {
        console.log(
          "🟢 Approving incident:",
          selectedIncident.id,
          "with tags:",
          tags
        );

        const updatedIncident = await onUpdateIncident(
          selectedIncident.id,
          "approved",
          tags
        );

        if (updatedIncident) {
          console.log("✅ Incident approved successfully");

          // LOG AUDIT ACTION
          if (onLogAction) {
            await onLogAction(
              "incident_approve",
              `Approved incident report #${selectedIncident.id} at ${selectedIncident.location}`,
              `Tags: ${tags.join(", ")}`,
              null, // targetUserId
              selectedIncident.id // targetIncidentId
            );
          }
        } else {
          throw new Error("Failed to update incident in database");
        }

        setShowApprove(false);
        setSelectedIncident(null);
      } catch (error) {
        console.error("❌ Error approving incident:", error);
        alert("Failed to approve incident. Please try again.");
      }
    }
  };

  const handleRejectIncident = async (reason, tags = []) => {
    if (selectedIncident) {
      try {
        console.log(
          "🔴 Rejecting incident:",
          selectedIncident.id,
          "Reason:",
          reason,
          "Tags:",
          tags
        );

        const updatedIncident = await onUpdateIncident(
          selectedIncident.id,
          "rejected",
          tags,
          reason
        );

        if (updatedIncident) {
          console.log("✅ Incident rejected successfully with reason:", reason);

          // LOG AUDIT ACTION
          if (onLogAction) {
            await onLogAction(
              "incident_reject",
              `Rejected incident report #${selectedIncident.id} at ${selectedIncident.location}`,
              `Reason: ${reason} | Tags: ${tags.join(", ")}`,
              null, // targetUserId
              selectedIncident.id // targetIncidentId
            );
          }
        } else {
          throw new Error("Failed to update incident in database");
        }

        setShowReject(false);
        setSelectedIncident(null);
      } catch (error) {
        console.error("❌ Error rejecting incident:", error);
        alert("Failed to reject incident. Please try again.");
      }
    }
  };

  const handleAddTagsToIncident = async (tags) => {
    if (selectedIncident) {
      // Update local state immediately
      setLocalIncidents((prev) =>
        prev.map((incident) =>
          incident.id === selectedIncident.id ? { ...incident, tags } : incident
        )
      );

      // Update database
      await onUpdateIncident(
        selectedIncident.id,
        selectedIncident.status,
        tags
      );

      setShowTags(false);
    }
  };

  const handleRetractIncident = async () => {
    if (selectedIncident) {
      try {
        console.log(
          "↩️ Retracting decision for incident:",
          selectedIncident.id
        );

        // Reset the incident to pending status and clear verification data
        const updatedIncident = await onUpdateIncident(
          selectedIncident.id,
          "pending",
          [], // Clear tags or keep existing?
          null // Clear rejection reason
        );

        if (updatedIncident) {
          console.log("✅ Decision retracted successfully");

          // LOG AUDIT ACTION
          if (onLogAction) {
            await onLogAction(
              "incident_retract",
              `Retracted decision for incident report #${selectedIncident.id}`,
              `Previous status: ${selectedIncident.status} | Reset to pending`,
              null, // targetUserId
              selectedIncident.id // targetIncidentId
            );
          }
        } else {
          throw new Error("Failed to retract decision in database");
        }

        setShowRetract(false);
        setSelectedIncident(null);
      } catch (error) {
        console.error("❌ Error retracting decision:", error);
        alert("Failed to retract decision. Please try again.");
      }
    }
  };

  // Filter incidents based on search and status - use localIncidents
  const filteredIncidents = localIncidents.filter((incident) => {
    const matchesSearch =
      (incident.location &&
        incident.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (incident.description &&
        incident.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (incident.incidentType &&
        incident.incidentType
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (incident.fullAddress &&
        incident.fullAddress.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || incident.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort incidents by createdAt date (newest first)
  const sortedIncidents = [...filteredIncidents].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB - dateA; // Newest first (descending order)
  });

  return (
    <div className="incidents-tab">
      <div className="filters">
        <input
          type="text"
          placeholder="Search incidents by location, type, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Status Summary */}
      <div className="status-summary">
        <span className="status-count pending">
          Pending: {localIncidents.filter((i) => i.status === "pending").length}
        </span>
        <span className="status-count approved">
          Approved:{" "}
          {localIncidents.filter((i) => i.status === "approved").length}
        </span>
        <span className="status-count rejected">
          Rejected:{" "}
          {localIncidents.filter((i) => i.status === "rejected").length}
        </span>
      </div>

      <div className="incidents-list">
        {sortedIncidents.length > 0 ? (
          sortedIncidents.map((incident, index) => (
            <IncidentCard
              key={
                incident.id ||
                `incident-${incident.user_id}-${incident.createdAt}-${index}`
              }
              incident={incident}
              onAIAnalysis={handleAIAnalysis}
              onApprove={handleApprove}
              onReject={handleReject}
              onAddTags={handleAddTags}
              onRetract={handleRetract}
            />
          ))
        ) : (
          <div className="no-data">
            <p>
              No {statusFilter === "all" ? "" : statusFilter} incidents found.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAI && (
        <AIAnalysisModal
          incident={selectedIncident}
          onClose={() => setShowAI(false)}
        />
      )}

      {showApprove && selectedIncident && (
        <ApproveModal
          incident={selectedIncident}
          onClose={() => setShowApprove(false)}
          onApprove={handleApproveIncident}
        />
      )}

      {showReject && selectedIncident && (
        <RejectModal
          incident={selectedIncident}
          onClose={() => setShowReject(false)}
          onReject={handleRejectIncident}
        />
      )}

      {showTags && selectedIncident && (
        <AddTagsModal
          incident={selectedIncident}
          onClose={() => setShowTags(false)}
          onAddTags={handleAddTagsToIncident}
        />
      )}

      {showRetract && selectedIncident && (
        <RetractIncidentModal
          incident={selectedIncident}
          onClose={() => setShowRetract(false)}
          onConfirm={handleRetractIncident}
        />
      )}
    </div>
  );
}

export default IncidentsTab;
