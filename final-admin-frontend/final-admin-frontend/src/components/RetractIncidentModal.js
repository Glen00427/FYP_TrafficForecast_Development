import React from "react";

function RetractIncidentModal({ incident, onClose, onConfirm }) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Retract Decision</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="retract-confirmation">
          <p>
            Are you sure you want to retract the decision for this incident?
            This will reset the incident status to "pending" and allow it to be
            reviewed again.
          </p>

          <div className="appeal-details">
            <p>
              <strong>Incident:</strong> {incident.location}
            </p>
            <p>
              <strong>Type:</strong> {incident.incidentType}
            </p>
            <p>
              <strong>Current Status:</strong> {incident.status}
            </p>
            {incident.reason && (
              <p>
                <strong>Rejection Reason:</strong> {incident.reason}
              </p>
            )}
            {incident.admin_verifier?.name && (
              <p>
                <strong>Action by:</strong> {incident.admin_verifier.name}
              </p>
            )}
          </div>

          <p className="warning-text">
            ⚠️ This action cannot be undone. The incident will be returned to
            the pending queue.
          </p>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-warning" onClick={handleConfirm}>
            Retract Decision
          </button>
        </div>
      </div>
    </div>
  );
}

export default RetractIncidentModal;
