import React, { useState } from "react";

function RoleModal({ user, onClose, onRoleChange }) {
  const [selectedRole, setSelectedRole] = useState(user?.role || "user");

  const handleRoleChange = () => {
    if (selectedRole && selectedRole !== user.role) {
      onRoleChange(selectedRole);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Change Role for {user?.name}</h3>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>
        <div className="role-form">
          <label>Select New Role:</label>
          <div className="role-options">
            <label className="role-option">
              <input
                type="radio"
                name="role"
                value="user"
                checked={selectedRole === "user"}
                onChange={(e) => setSelectedRole(e.target.value)}
              />
              <div className="role-info">
                <span className="role-name">User</span>
                <span className="role-description">
                  Can report incidents and view basic data
                </span>
              </div>
            </label>

            <label className="role-option">
              <input
                type="radio"
                name="role"
                value="moderator"
                checked={selectedRole === "moderator"}
                onChange={(e) => setSelectedRole(e.target.value)}
              />
              <div className="role-info">
                <span className="role-name">Moderator</span>
                <span className="role-description">
                  Can review and manage incident reports
                </span>
              </div>
            </label>

            <label className="role-option">
              <input
                type="radio"
                name="role"
                value="admin"
                checked={selectedRole === "admin"}
                onChange={(e) => setSelectedRole(e.target.value)}
              />
              <div className="role-info">
                <span className="role-name">Administrator</span>
                <span className="role-description">
                  Full access to all admin functions
                </span>
              </div>
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn-outline">
            Cancel
          </button>
          <button
            onClick={handleRoleChange}
            className="btn-primary"
            disabled={selectedRole === user?.role}
          >
            Update Role
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoleModal;
