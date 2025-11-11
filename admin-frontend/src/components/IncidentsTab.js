import React, { useState } from "react";
import IncidentCard from "./IncidentCard";
import AIAnalysisModal from "./AIAnalysisModal";
import ApproveModal from "./ApproveModal";
import RejectModal from "./RejectModal";
import AddTagsModal from "./AddTagsModal";
import RetractIncidentModal from "./RetractIncidentModal";

function IncidentsTab({ incidents, onUpdateIncident, onLogAction }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showRetract, setShowRetract] = useState(false);

  const displayIncidents = incidents;

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
    setSelectedIncident(incident);
    setShowRetract(true);
  };

  const handleApproveIncident = async (tags = []) => {
    if (!selectedIncident) return;
    try {
      const updatedIncident = await onUpdateIncident(selectedIncident.id, "approved", tags);
      if (updatedIncident && onLogAction) {
        await onLogAction(
          "incident_approve",
          `Approved incident report #${selectedIncident.id} at ${selectedIncident.location}`,
          `Tags: ${tags.join(", ")}`,
          null,
          selectedIncident.id
        );
      }
      setShowApprove(false);
      setSelectedIncident(null);
    } catch (error) {
      console.error("Error approving:", error);
      alert("Failed to approve incident. Please try again.");
    }
  };

  const handleRejectIncident = async (reason, tags = []) => {
    if (!selectedIncident) return;
    try {
      const updatedIncident = await onUpdateIncident(selectedIncident.id, "rejected", tags, reason);
      if (updatedIncident && onLogAction) {
        await onLogAction(
          "incident_reject",
          `Rejected incident report #${selectedIncident.id} at ${selectedIncident.location}`,
          `Reason: ${reason} | Tags: ${tags.join(", ")}`,
          null,
          selectedIncident.id
        );
      }
      setShowReject(false);
      setSelectedIncident(null);
    } catch (error) {
      console.error("Error rejecting:", error);
      alert("Failed to reject incident. Please try again.");
    }
  };

  const handleAddTagsToIncident = async (tags) => {
    if (!selectedIncident) return;
    try {
      const updatedIncident = await onUpdateIncident(
        selectedIncident.id,
        selectedIncident.status,
        tags
      );
      if (updatedIncident && onLogAction) {
        await onLogAction(
          "incident_tag",
          `Added tags to incident report #${selectedIncident.id}`,
          `Tags: ${tags.join(", ")} | Status: ${selectedIncident.status}`,
          null,
          selectedIncident.id
        );
      }
      setShowTags(false);
      setSelectedIncident(null);
    } catch (error) {
      console.error("Error adding tags:", error);
      alert("Failed to add tags. Please try again.");
    }
  };

  const handleRetractIncident = async () => {
    if (!selectedIncident) return;
    try {
      const updatedIncident = await onUpdateIncident(selectedIncident.id, "pending", [], null);
      if (updatedIncident && onLogAction) {
        await onLogAction(
          "incident_retract",
          `Retracted decision for incident report #${selectedIncident.id}`,
          `Previous status: ${selectedIncident.status} | Reset to pending`,
          null,
          selectedIncident.id
        );
      }
      setShowRetract(false);
      setSelectedIncident(null);
    } catch (error) {
      console.error("Error retracting:", error);
      alert("Failed to retract decision. Please try again.");
    }
  };

  const filteredIncidents = displayIncidents.filter((incident) => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch =
      (incident.location && incident.location.toLowerCase().includes(searchTermLower)) ||
      (incident.description && incident.description.toLowerCase().includes(searchTermLower)) ||
      (incident.incidentType && incident.incidentType.toLowerCase().includes(searchTermLower)) ||
      (incident.fullAddress && incident.fullAddress.toLowerCase().includes(searchTermLower)) ||
      (incident.users?.name && incident.users.name.toLowerCase().includes(searchTermLower)) ||
      (incident.tags && incident.tags.toLowerCase().includes(searchTermLower));

    const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
    const matchesType = typeFilter === "all" || incident.incidentType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const sortedIncidents = [...filteredIncidents].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <div className="incidents-tab">
      {/* --- Filter Panel --- */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search by location, type, address, or user..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="pending">Pending</option>
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Types</option>
          <option value="Accident">Accident</option>
          <option value="Breakdown">Breakdown</option>
          <option value="Roadwork">Roadwork</option>
          <option value="Weather">Weather</option>
          <option value="Community Report">Community Report</option>
        </select>
      </div>

      {/* --- Status Summary --- */}
      <div className="incident-stats">
        <span>Pending: {displayIncidents.filter((i) => i.status === "pending").length}</span>{" "}
        | <span>Approved: {displayIncidents.filter((i) => i.status === "approved").length}</span>{" "}
        | <span>Rejected: {displayIncidents.filter((i) => i.status === "rejected").length}</span>{" "}
        | <span>Total: {displayIncidents.length}</span>
      </div>

      {/* --- Incident List --- */}
      <div className="incidents-list">
        {sortedIncidents.length > 0 ? (
          sortedIncidents.map((incident, index) => (
            <IncidentCard
              key={incident.id || `incident-${index}`}
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
              {statusFilter === "pending"
                ? "No pending incidents need review."
                : `No ${statusFilter === "all" ? "" : statusFilter} incidents found.`}
              {searchTerm && ` No results for "${searchTerm}"`}
            </p>
          </div>
        )}
      </div>

      {/* --- Modals --- */}
      {showAI && (
        <AIAnalysisModal incident={selectedIncident} onClose={() => setShowAI(false)} />
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
