import React from "react";

function RetractConfirmationModal({ appeal, onClose, onConfirm }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Retract Decision</h3>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>
        <div className="retract-confirmation">
          <p>Are you sure you want to retract this decision?</p>
          <div className="appeal-details">
            <strong>Appeal Type:</strong> {appeal.type}
            <br />
            <strong>From:</strong> {appeal.from}
            <br />
            <strong>Current Status:</strong> {appeal.status}
            {appeal.admin_response && (
              <>
                <br />
                <strong>Previous Response:</strong> {appeal.admin_response}
              </>
            )}
          </div>
          <p className="warning-text">
            This will reopen the appeal for review and reverse any actions taken.
          </p>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn-outline">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-warning">
            Retract Decision
          </button>
        </div>
      </div>
    </div>
  );
}

export default RetractConfirmationModal;