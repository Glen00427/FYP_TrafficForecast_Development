import React, { useState } from "react";
import IncidentCard from "./IncidentCard";
import AIAnalysisModal from "./AIAnalysisModal";
import ApproveModal from "./ApproveModal";
import RejectModal from "./RejectModal";
import AddTagsModal from "./AddTagsModal";
import RetractIncidentModal from "./RetractIncidentModal"; // Add this import

function IncidentsTab({ incidents, onUpdateIncident, onLogAction }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending"); // Default to pending only
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showRetract, setShowRetract] = useState(false); // Add this state

  // Use the incidents prop directly
  const displayIncidents = incidents;

  const handleAIAnalysis = (incident) => {
    console.log("🤖 AI Analysis clicked for:", incident);
    setSelectedIncident(incident);
    setShowAI(true);
  };

  const handleApprove = (incident) => {
    console.log("🟢 Approve button clicked for:", incident);
    setSelectedIncident(incident);
    setShowApprove(true);
  };

  const handleReject = (incident) => {
    console.log("🔴 Reject button clicked for:", incident);
    setSelectedIncident(incident);
    setShowReject(true);
  };

  const handleAddTags = (incident) => {
    console.log("🏷️ Add Tags clicked for:", incident);
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

        // Update database via parent function - pass both reason and tags
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
      try {
        console.log(
          "🏷️ Adding tags to incident:",
          selectedIncident.id,
          "Tags:",
          tags
        );

        const updatedIncident = await onUpdateIncident(
          selectedIncident.id,
          selectedIncident.status,
          tags
        );

        if (updatedIncident) {
          console.log("✅ Tags added successfully");

          // LOG AUDIT ACTION
          if (onLogAction) {
            await onLogAction(
              "incident_tag",
              `Added tags to incident report #${selectedIncident.id}`,
              `Tags: ${tags.join(", ")} | Status: ${selectedIncident.status}`,
              null, // targetUserId
              selectedIncident.id // targetIncidentId
            );
          }
        } else {
          throw new Error("Failed to update tags in database");
        }

        setShowTags(false);
        setSelectedIncident(null);
      } catch (error) {
        console.error("❌ Error adding tags:", error);
        alert("Failed to add tags. Please try again.");
      }
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

  // Filter incidents - only show pending by default, but allow viewing others via filter
  const filteredIncidents = displayIncidents.filter((incident) => {
    const searchTermLower = searchTerm.toLowerCase();

    const matchesSearch =
      (incident.location &&
        incident.location.toLowerCase().includes(searchTermLower)) ||
      (incident.description &&
        incident.description.toLowerCase().includes(searchTermLower)) ||
      (incident.incidentType &&
        incident.incidentType.toLowerCase().includes(searchTermLower)) ||
      (incident.fullAddress &&
        incident.fullAddress.toLowerCase().includes(searchTermLower)) ||
      (incident.users?.name &&
        incident.users.name.toLowerCase().includes(searchTermLower)) ||
      (incident.tags && incident.tags.toLowerCase().includes(searchTermLower));

    const matchesStatus =
      statusFilter === "all" || incident.status === statusFilter;

    const matchesType =
      typeFilter === "all" || incident.incidentType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Sort incidents by createdAt date (newest first)
  const sortedIncidents = [...filteredIncidents].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB - dateA; // Newest first (descending order)
  });

  return (
    <div className="incidents-tab">
      {/* Updated Filters Layout - Dropdowns below search bar */}
      <div className="incident-filters-column">
        <div className="incident-search-container">
          <input
            type="text"
            placeholder="Search by location, type, address, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="incident-search-input"
          />
        </div>
        <div className="incident-filter-dropdowns">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="incident-filter-select"
          >
            <option value="pending">Pending</option>
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="incident-filter-select"
          >
            <option value="all">All Types</option>
            <option value="Accident">Accident</option>
            <option value="Breakdown">Breakdown</option>
            <option value="Roadwork">Roadwork</option>
            <option value="Weather">Weather</option>
            <option value="Community Report">Community Report</option>
          </select>
        </div>
      </div>

      {/* Status Summary */}
      <div className="status-summary">
        <span className="status-count pending">
          Pending:{" "}
          {displayIncidents.filter((i) => i.status === "pending").length}
        </span>
        <span className="status-count approved">
          Approved:{" "}
          {displayIncidents.filter((i) => i.status === "approved").length}
        </span>
        <span className="status-count rejected">
          Rejected:{" "}
          {displayIncidents.filter((i) => i.status === "rejected").length}
        </span>
        <span className="status-count total">
          Total: {displayIncidents.length}
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
              onRetract={handleRetract} // Pass the retract handler
            />
          ))
        ) : (
          <div className="no-data">
            <p>
              {statusFilter === "pending"
                ? "No pending incidents need review."
                : `No ${
                    statusFilter === "all" ? "" : statusFilter
                  } incidents found.`}
              {searchTerm && ` No results for "${searchTerm}"`}
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
