import React, { useState } from "react";

// In ApproveModal.js
function ApproveModal({ incident, onClose, onApprove }) {
  const [tags, setTags] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // Convert tags string to array, or use empty array if no tags
    const tagsArray = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");

    // Call onApprove with tags array (can be empty)
    onApprove(tagsArray);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Approve Incident</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="approve-form">
            <label htmlFor="approve-tags">
              Add Tags (comma-separated, optional):
            </label>
            <input
              type="text"
              id="approve-tags"
              placeholder="urgent, recurring, etc."
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-success">
              Approve Incident
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ApproveModal;
