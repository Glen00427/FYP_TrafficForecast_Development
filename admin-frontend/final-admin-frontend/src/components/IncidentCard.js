import React from "react";

function IncidentCard({
  incident,
  onAIAnalysis,
  onApprove,
  onReject,
  onAddTags,
  onRetract,
}) {
  const getTagsArray = () => {
    try {
      if (!incident.tags || typeof incident.tags !== "string") {
        return [];
      }

      if (incident.tags.trim() === "") {
        return [];
      }

      return incident.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== "");
    } catch (error) {
      return [];
    }
  };

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
  const isVerified = incident.verified_at !== null;

  return (
    <div className="incident-card">
      <div className="incident-header">
        <div className="location-section">
          <h4>{incident.location}</h4>
          {incident.fullAddress && (
            <p className="full-address">Address: {incident.fullAddress}</p>
          )}
        </div>
        <div className="incident-tags">
          {isVerified && (
            <span
              className="verified-tag"
              title={`Verified on ${new Date(
                incident.verified_at
              ).toLocaleDateString()}`}
            >
              Verified ✓
            </span>
          )}

          {incident.status === "approved" && (
            <span className="approved-tag">Approved</span>
          )}

          {incident.status === "rejected" && (
            <span className="rejected-tag">Rejected</span>
          )}

          {incident.status === "pending" && (
            <span className="pending-tag">Pending Review</span>
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

          {tagsArray.map((tag, index) => (
            <span key={index} className="type-tag">
              {capitalizeWords(tag)}
            </span>
          ))}
        </div>
      </div>

      {isVerified && (
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
