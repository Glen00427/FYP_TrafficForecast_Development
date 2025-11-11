import React, { useState } from "react";

function AddTagsModal({ incident, onClose, onAddTags }) {
  const initialTags = incident.tags
    ? incident.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag)
    : [];

  const [tags, setTags] = useState(initialTags.join(", "));

  const handleSubmit = () => {
    const tagsArray = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);
    const tagsText = tagsArray.join(", ");
    onAddTags(tagsText);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add Tags to Report</h3>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>
        <div className="tags-form">
          <input
            type="text"
            placeholder="e.g. verified, urgent, recurring (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <p className="help-text">Separate multiple tags with commas</p>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn-outline">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            Add Tags
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddTagsModal;
