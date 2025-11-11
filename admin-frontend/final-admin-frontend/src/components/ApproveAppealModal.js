import React, { useState } from "react";

function ApproveAppealModal({ appeal, onClose, onApprove }) {
  const [response, setResponse] = useState("");

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Approve Appeal</h3>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>
        <div className="appeal-form">
          <label>Response to user...</label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Enter response to user..."
            rows="4"
          />
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn-outline">
            Cancel
          </button>
          <button
            onClick={() => onApprove(response)}
            className="btn-success"
            disabled={!response.trim()}
          >
            Approve Appeal
          </button>
        </div>
      </div>
    </div>
  );
}

export default ApproveAppealModal;
