import React from "react";

function IncidentCard({
  incident,
  onAIAnalysis,
  onApprove,
  onReject,
  onAddTags,
}) {
  // Safely handle tags with comprehensive error checking
  const getTagsArray = () => {
    try {
      // Check if tags exists and is a string
      if (!incident.tags || typeof incident.tags !== "string") {
        return [];
      }

      // Handle empty string
      if (incident.tags.trim() === "") {
        return [];
      }

      // Split and process tags
      return incident.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ""); // Remove empty strings
    } catch (error) {
      console.error("Error processing tags:", error, incident.tags);
      return [];
    }
  };

  const tagsArray = getTagsArray();
  const hasVerifiedTag = tagsArray.includes("verified");

  return (
    <div className="incident-card">
      <div className="incident-header">
        <h4>{incident.location}</h4>
        {incident.fullAddress && (
          <p className="full-address">{incident.fullAddress}</p>
        )}
        <div className="incident-tags">
          <span
            className={`severity-tag ${
              incident.severity?.toLowerCase() || "medium"
            }`}
          >
            {incident.severity}
          </span>
          <span className="type-tag">{incident.incidentType}</span>
          {hasVerifiedTag && <span className="verified-tag">verified</span>}
        </div>
      </div>
      <p className="incident-description">{incident.description}</p>
      {incident.photo_url && (
        <div className="incident-photo">
          <img
            src={incident.photo_url}
            alt="Incident"
            className="photo-preview"
          />
        </div>
      )}
      <div className="incident-meta">
        <span>Reported by user: {incident.user_id}</span>
        <span>{new Date(incident.createdAt).toLocaleDateString()}</span>
      </div>
      <div className="incident-actions">
        <button onClick={() => onAIAnalysis(incident)} className="btn-outline">
          AI Analysis
        </button>
        <button onClick={() => onApprove(incident)} className="btn-success">
          Approve
        </button>
        <button onClick={() => onReject(incident)} className="btn-danger">
          Reject
        </button>
        <button onClick={() => onAddTags(incident)} className="btn-outline">
          Add Tags
        </button>
      </div>
    </div>
  );
}

export default IncidentCard;
