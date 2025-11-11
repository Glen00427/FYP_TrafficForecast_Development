import React, { useState } from "react";

function UnbanModal({ user, onClose, onUnban }) {
  const [reason, setReason] = useState("");

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Unban {user?.username}?</h3>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>
        <div className="unban-form">
          <label>Reason for unbanning...</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for unbanning..."
            rows="3"
          />
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn-outline">
            Cancel
          </button>
          <button
            onClick={() => onUnban(reason)}
            className="btn-success"
            disabled={!reason.trim()}
          >
            Approve Appeal
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnbanModal;
