import React, { useState } from "react";

function RejectAppealModal({ appeal, onClose, onReject }) {
  const [reason, setReason] = useState("");

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Reject Appeal</h3>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>
        <div className="reject-appeal-form">
          <label>Reason for rejection...</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for rejection..."
            rows="4"
          />
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn-outline">
            Cancel
          </button>
          <button
            onClick={() => onReject(reason)}
            className="btn-danger"
            disabled={!reason.trim()}
          >
            Reject Appeal
          </button>
        </div>
      </div>
    </div>
  );
}

export default RejectAppealModal;
