import React from "react";

function IncidentCard({
  incident,
  onAIAnalysis,
  onApprove,
  onReject,
  onAddTags,
  onRetract, // Add this new prop
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

  // Function to capitalize first letter of each word
  const capitalizeWords = (text) => {
    if (!text) return "";
    return text
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const tagsArray = getTagsArray();
  const isResolved =
    incident.status === "approved" || incident.status === "rejected";

  return (
    <div className="incident-card">
      <div className="incident-header">
        <div className="location-section">
          <h4>{incident.location}</h4>
          {/* Display full address directly under location */}
          {incident.fullAddress && (
            <p className="full-address">Address: {incident.fullAddress}</p>
          )}
        </div>
        <div className="incident-tags">
          {/* Show verification info if available */}
          {incident.verified_at && (
            <span
              className="verified-tag"
              title={`${
                incident.status === "approved" ? "Approved" : "Rejected"
              } on ${new Date(incident.verified_at).toLocaleDateString()}`}
            >
              {incident.status === "approved" ? "Approved" : "Rejected"} ✓
            </span>
          )}

          {/* Show Approved tag if incident is approved */}
          {incident.status === "approved" && (
            <span className="approved-tag">Approved</span>
          )}

          {/* Show Rejected tag if incident is rejected */}
          {incident.status === "rejected" && (
            <span className="rejected-tag">Rejected</span>
          )}

          <span
            className={`severity-tag ${
              incident.severity?.toLowerCase() || "medium"
            }`}
          >
            {capitalizeWords(incident.severity)}
          </span>
          <span className="type-tag">
            {capitalizeWords(incident.incidentType)}
          </span>

          {/* Show other custom tags */}
          {tagsArray.map((tag, index) => (
            <span key={index} className="type-tag">
              {capitalizeWords(tag)}
            </span>
          ))}
        </div>
      </div>

      {/* Show action details for BOTH approved and rejected incidents */}
      {incident.verified_at && (
        <div
          className={`action-info ${
            incident.status === "rejected"
              ? "rejection-info"
              : "verification-info"
          }`}
        >
          <small>
            <strong>
              {incident.status === "approved" ? "Approved" : "Rejected"}:
            </strong>{" "}
            {new Date(incident.verified_at).toLocaleString()}
            {incident.admin_verifier?.name &&
              ` by ${incident.admin_verifier.name}`}
            {!incident.admin_verifier?.name &&
              incident.verified_by &&
              ` by Admin ${incident.verified_by}`}
          </small>
        </div>
      )}

      {/* Show rejection reason if available */}
      {incident.status === "rejected" && incident.reason && (
        <div className="rejection-reason">
          <strong>Rejection Reason:</strong>
          <p>{incident.reason}</p>
        </div>
      )}

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
        <span>
          Reported by: {incident.users?.name || `User ${incident.user_id}`}
        </span>
        <span>{new Date(incident.createdAt).toLocaleDateString()}</span>
      </div>
      <div className="incident-actions">
        <button onClick={() => onAIAnalysis(incident)} className="btn-outline">
          AI Analysis
        </button>

        {/* Show different actions based on status */}
        {incident.status === "pending" && (
          <>
            <button onClick={() => onApprove(incident)} className="btn-success">
              Approve
            </button>
            <button onClick={() => onReject(incident)} className="btn-danger">
              Reject
            </button>
            <button onClick={() => onAddTags(incident)} className="btn-outline">
              Add Tags
            </button>
          </>
        )}

        {/* Show retract button for resolved incidents */}
        {isResolved && (
          <button onClick={() => onRetract(incident)} className="btn-warning">
            Retract Decision
          </button>
        )}
      </div>
    </div>
  );
}

export default IncidentCard;
