import React, { useState } from "react";

function BanModal({ user, onClose, onBan }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Ban {user?.username}?</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="ban-form">
          <label>Select Reason:</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="reason"
                value="spam"
                onChange={(e) => setReason(e.target.value)}
              />
              Spam
            </label>
            <label>
              <input
                type="radio"
                name="reason"
                value="false-report"
                onChange={(e) => setReason(e.target.value)}
              />
              False Report
            </label>
            <label>
              <input
                type="radio"
                name="reason"
                value="other"
                onChange={(e) => setReason(e.target.value)}
              />
              Other
            </label>
          </div>
          <label>Reason Description</label>
          <textarea
            placeholder="Reason for ban..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
          />
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button
            onClick={() => onBan(reason, description)}
            className="btn-danger"
            disabled={!reason || !description.trim()}
          >
            Ban User
          </button>
        </div>
      </div>
    </div>
  );
}

export default BanModal;