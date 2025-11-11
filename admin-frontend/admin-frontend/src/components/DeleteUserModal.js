import React, { useState } from "react";

function DeleteUserModal({ user, onClose, onDelete }) {
  const [reason, setReason] = useState("");

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Delete {user?.username}?</h3>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>
        <div className="delete-form">
          <label>Reason for deletion...</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="(Note that deletion of user will be permanent)"
            rows="3"
          />
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn-outline">
            Cancel
          </button>
          <button
            onClick={() => onDelete(reason)}
            className="btn-danger"
            disabled={!reason.trim()}
          >
            Delete User
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteUserModal;
