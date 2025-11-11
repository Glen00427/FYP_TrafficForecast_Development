import React, { useState } from "react";

function RejectModal({ incident, onClose, onReject }) {
  const [reason, setReason] = useState("");
  const [tags, setTags] = useState(""); // Add tags state

  const handleReject = () => {
    if (reason.trim()) {
      // Convert tags string to array
      const tagsArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== "");

      onReject(reason, tagsArray); // Pass both reason and tags to parent
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Reject Incident</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="reject-form">
          <label htmlFor="reject-reason">Reason for Rejection: *</label>
          <textarea
            id="reject-reason"
            placeholder="Please provide a reason for rejecting this incident report..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />

          <label htmlFor="reject-tags">
            Add Tags (comma-separated, optional):
          </label>
          <textarea
            id="reject-tags"
            placeholder="duplicate, false_report, incomplete, etc."
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={handleReject}
            disabled={!reason.trim()}
          >
            Reject Incident
          </button>
        </div>
      </div>
    </div>
  );
}

export default RejectModal;
