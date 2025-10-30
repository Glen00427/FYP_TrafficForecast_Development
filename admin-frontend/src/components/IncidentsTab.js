import React, { useState } from "react";
import IncidentCard from "./IncidentCard";
import AIAnalysisModal from "./AIAnalysisModal";
import ApproveModal from "./ApproveModal";
import RejectModal from "./RejectModal";
import AddTagsModal from "./AddTagsModal";

function IncidentsTab({ incidents, onUpdateIncident }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showTags, setShowTags] = useState(false);

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

  const handleApproveIncident = async (tags = []) => {
    if (selectedIncident) {
      // Update local state immediately - change status to "approved"
      setLocalIncidents((prev) =>
        prev.map((incident) =>
          incident.id === selectedIncident.id
            ? { ...incident, status: "approved", tags }
            : incident
        )
      );

      // Update database
      await onUpdateIncident(selectedIncident.id, "approved", tags);

      setShowApprove(false);
    }
  };

  const handleRejectIncident = async (reason) => {
    if (selectedIncident) {
      // Update local state immediately - change status to "rejected"
      setLocalIncidents((prev) =>
        prev.map((incident) =>
          incident.id === selectedIncident.id
            ? { ...incident, status: "rejected" }
            : incident
        )
      );

      // Update database
      await onUpdateIncident(selectedIncident.id, "rejected");

      setShowReject(false);
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
    </div>
  );
}

export default IncidentsTab;
