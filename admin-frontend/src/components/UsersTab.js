import React, { useState } from "react";
import BanModal from "./BanModal";
import UnbanModal from "./UnbanModal";
import DeleteUserModal from "./DeleteUserModal";
import RoleModal from "./RoleModal";

function UsersTab({ users, onUpdateUser, onUpdateRole, onDeleteUser }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showUnbanModal, setShowUnbanModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(5); // Show 5 users per page

  const handleBan = (user) => {
    console.log("🔴 Ban button clicked for user:", user);
    setSelectedUser(user);
    setShowBanModal(true);
  };

  const handleUnban = (user) => {
    console.log("🔴 Unban button clicked for user:", user);
    setSelectedUser(user);
    setShowUnbanModal(true);
  };

  const handleDelete = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleRoleChange = (user) => {
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  // Custom sorting function
  const sortUsers = (users) => {
    const rolePriority = {
      admin: 1,
      moderator: 2,
      user: 3,
    };

    const statusPriority = {
      active: 1,
      inactive: 2,
      banned: 3,
    };

    return [...users].sort((a, b) => {
      const aStatus = a.status || "active";
      const bStatus = b.status || "active";
      const aRole = a.role || "user";
      const bRole = b.role || "user";

      // First sort by status priority
      if (statusPriority[aStatus] !== statusPriority[bStatus]) {
        return statusPriority[aStatus] - statusPriority[bStatus];
      }

      // Then sort by role priority within the same status
      if (rolePriority[aRole] !== rolePriority[bRole]) {
        return rolePriority[aRole] - rolePriority[bRole];
      }

      // Finally sort by name alphabetically
      return (a.name || "").localeCompare(b.name || "");
    });
  };

  // Filter users based on role and status
  const filteredUsers = users.filter((user) => {
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;
    return matchesRole && matchesStatus;
  });

  // Apply custom sorting to filtered users
  const sortedUsers = sortUsers(filteredUsers);

  // Calculate pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 3;

    if (totalPages <= maxPagesToShow + 2) {
      // Show all pages if total pages are small
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Show first page, current page range, and last page
      if (currentPage <= maxPagesToShow) {
        for (let i = 1; i <= maxPagesToShow; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - maxPagesToShow + 1) {
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = totalPages - maxPagesToShow + 1; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } catch {
      return "Invalid Date";
    }
  };

  // Get role badge class for styling
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case "admin":
        return "role-badge-admin";
      case "moderator":
        return "role-badge-moderator";
      default:
        return "role-badge-user";
    }
  };

  // Get status badge class for styling
  const getStatusBadgeClass = (status) => {
    const statusLower = (status || "active").toLowerCase();
    switch (statusLower) {
      case "active":
        return "status-badge-active";
      case "banned":
        return "status-badge-banned";
      case "inactive":
        return "status-badge-inactive";
      default:
        return "status-badge-active";
    }
  };

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter]);

  return (
    <div className="users-tab">
      <div className="filters">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="user">User</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Status</th>
              <th>Role</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.map((user) => (
              <tr key={user.userid}>
                <td>
                  <div className="user-info">
                    <div className="username">{user.name}</div>
                    <div className="email">{user.email}</div>
                  </div>
                </td>
                <td>
                  <span
                    className={`status-badge ${getStatusBadgeClass(
                      user.status
                    )}`}
                  >
                    {user.status || "Active"}
                  </span>
                </td>
                <td>
                  <span
                    className={`role-badge ${getRoleBadgeClass(user.role)}`}
                  >
                    {user.role || "user"}
                  </span>
                </td>
                <td>{formatDate(user.last_active)}</td>
                <td>
                  <div className="user-actions">
                    <button className="btn-outline">View Activity</button>
                    <button
                      onClick={() => handleRoleChange(user)}
                      className="btn-info"
                    >
                      Change Role
                    </button>

                    {/* Show different actions based on status */}
                    {user.status === "inactive" ? (
                      <button
                        onClick={() => {
                          if (onUpdateUser && user) {
                            onUpdateUser(
                              user.userid,
                              "active",
                              "User restored by admin"
                            );
                          }
                        }}
                        className="btn-success"
                      >
                        Restore User
                      </button>
                    ) : user.status === "banned" ? (
                      <button
                        onClick={() => handleUnban(user)}
                        className="btn-success"
                      >
                        Unban User
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleBan(user)}
                          className="btn-warning"
                        >
                          Ban User
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="btn-danger"
                        >
                          Delete User
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedUsers.length === 0 && (
          <div className="no-data">
            <p>No users found matching the selected filters.</p>
          </div>
        )}

        <div className="table-footer">
          <span>
            Showing {currentUsers.length} of {sortedUsers.length} users
          </span>
          <div className="pagination">
            {/* Previous button */}
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              Previous
            </button>

            {/* Page numbers */}
            {getPageNumbers().map((number, index) =>
              number === "..." ? (
                <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                  ⋯
                </span>
              ) : (
                <button
                  key={number}
                  onClick={() => paginate(number)}
                  className={`pagination-btn ${
                    currentPage === number ? "active" : ""
                  }`}
                >
                  {number}
                </button>
              )
            )}

            {/* Next button */}
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modals remain the same */}
      {showBanModal && (
        <BanModal
          user={selectedUser}
          onClose={() => setShowBanModal(false)}
          onBan={(reason, description) => {
            if (onUpdateUser && selectedUser) {
              onUpdateUser(selectedUser.userid, "banned", description);
            }
            setShowBanModal(false);
          }}
        />
      )}

      {showUnbanModal && (
        <UnbanModal
          user={selectedUser}
          onClose={() => setShowUnbanModal(false)}
          onUnban={(reason) => {
            if (onUpdateUser && selectedUser) {
              onUpdateUser(selectedUser.userid, "active", reason);
            }
            setShowUnbanModal(false);
          }}
        />
      )}

      {showRoleModal && (
        <RoleModal
          user={selectedUser}
          onClose={() => setShowRoleModal(false)}
          onRoleChange={(newRole) => {
            if (onUpdateRole && selectedUser) {
              onUpdateRole(selectedUser.userid, newRole);
            }
            setShowRoleModal(false);
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteUserModal
          user={selectedUser}
          onClose={() => setShowDeleteModal(false)}
          onDelete={(reason) => {
            if (onDeleteUser && selectedUser) {
              onDeleteUser(selectedUser.userid, reason);
            }
            setShowDeleteModal(false);
          }}
        />
      )}
    </div>
  );
}

export default UsersTab;
