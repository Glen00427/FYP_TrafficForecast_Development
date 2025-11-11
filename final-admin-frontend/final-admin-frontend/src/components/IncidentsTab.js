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
  const [currentPage, setCurrentPage] = useState(1);
  const [incidentsPerPage] = useState(5);

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
    if (selectedIncident) {
      try {
        const updatedIncident = await onUpdateIncident(
          selectedIncident.id,
          "approved",
          tags
        );

        if (updatedIncident) {
          if (onLogAction) {
            await onLogAction(
              "incident_approve",
              `Approved incident report #${selectedIncident.id} at ${selectedIncident.location}`,
              `Tags: ${tags.join(", ")}`,
              null,
              selectedIncident.id
            );
          }
        } else {
          throw new Error("Failed to update incident in database");
        }

        setShowApprove(false);
        setSelectedIncident(null);
      } catch (error) {
        alert("Failed to approve incident. Please try again.");
      }
    }
  };

  const handleRejectIncident = async (reason, tags = []) => {
    if (selectedIncident) {
      try {
        const updatedIncident = await onUpdateIncident(
          selectedIncident.id,
          "rejected",
          tags,
          reason
        );

        if (updatedIncident) {
          if (onLogAction) {
            await onLogAction(
              "incident_reject",
              `Rejected incident report #${selectedIncident.id} at ${selectedIncident.location}`,
              `Reason: ${reason} | Tags: ${tags.join(", ")}`,
              null,
              selectedIncident.id
            );
          }
        } else {
          throw new Error("Failed to update incident in database");
        }

        setShowReject(false);
        setSelectedIncident(null);
      } catch (error) {
        alert("Failed to reject incident. Please try again.");
      }
    }
  };

  const handleAddTagsToIncident = async (tags) => {
    if (selectedIncident) {
      try {
        const updatedIncident = await onUpdateIncident(
          selectedIncident.id,
          selectedIncident.status,
          tags
        );

        if (updatedIncident) {
          if (onLogAction) {
            await onLogAction(
              "incident_tag",
              `Added tags to incident report #${selectedIncident.id}`,
              `Tags: ${tags.join(", ")} | Status: ${selectedIncident.status}`,
              null,
              selectedIncident.id
            );
          }
        } else {
          throw new Error("Failed to update tags in database");
        }

        setShowTags(false);
        setSelectedIncident(null);
      } catch (error) {
        alert("Failed to add tags. Please try again.");
      }
    }
  };

  const handleRetractIncident = async () => {
    if (selectedIncident) {
      try {
        const updatedIncident = await onUpdateIncident(
          selectedIncident.id,
          "pending",
          [],
          null
        );

        if (updatedIncident) {
          if (onLogAction) {
            await onLogAction(
              "incident_retract",
              `Retracted decision for incident report #${selectedIncident.id}`,
              `Previous status: ${selectedIncident.status} | Reset to pending | Tags cleared`,
              null,
              selectedIncident.id
            );
          }
        } else {
          throw new Error("Failed to retract decision in database");
        }

        setShowRetract(false);
        setSelectedIncident(null);
      } catch (error) {
        alert("Failed to retract decision. Please try again.");
      }
    }
  };

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

  const sortedIncidents = [...filteredIncidents].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB - dateA;
  });

  const indexOfLastIncident = currentPage * incidentsPerPage;
  const indexOfFirstIncident = indexOfLastIncident - incidentsPerPage;
  const currentIncidents = sortedIncidents.slice(
    indexOfFirstIncident,
    indexOfLastIncident
  );
  const totalPages = Math.ceil(sortedIncidents.length / incidentsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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

  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, searchTerm]);

  return (
    <div className="incidents-tab">
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
        {currentIncidents.length > 0 ? (
          currentIncidents.map((incident, index) => (
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

      {sortedIncidents.length > incidentsPerPage && (
        <div className="table-footer">
          <span>
            Showing {currentIncidents.length} of {sortedIncidents.length}{" "}
            incidents
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
