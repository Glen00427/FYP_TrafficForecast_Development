import { supabase } from "../lib/supabaseClient";

export const auditLogger = {
  // Generic log function
  async logAction(
    adminId,
    actionType,
    description,
    details = null,
    targetUserId = null,
    targetIncidentId = null
  ) {
    try {
      const { error } = await supabase.from("audit_logs").insert({
        admin_id: adminId,
        action_type: actionType,
        target_user_id: targetUserId,
        target_incident_id: targetIncidentId,
        description: description,
        details: details,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error logging audit action:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error in audit logger:", error);
      return false;
    }
  },

  // Specific action loggers
  async logUserBan(adminId, targetUserId, reason) {
    return this.logAction(
      adminId,
      "user_ban",
      `Banned user ${targetUserId}`,
      `Reason: ${reason}`,
      targetUserId
    );
  },

  async logUserUnban(adminId, targetUserId, reason) {
    return this.logAction(
      adminId,
      "user_unban",
      `Unbanned user ${targetUserId}`,
      `Reason: ${reason}`,
      targetUserId
    );
  },

  async logIncidentApprove(adminId, incidentId) {
    return this.logAction(
      adminId,
      "incident_approve",
      `Approved incident report ${incidentId}`,
      null,
      null,
      incidentId
    );
  },

  async logIncidentReject(adminId, incidentId, reason) {
    return this.logAction(
      adminId,
      "incident_reject",
      `Rejected incident report ${incidentId}`,
      `Reason: ${reason}`,
      null,
      incidentId
    );
  },

  async logRoleChange(adminId, targetUserId, oldRole, newRole) {
    return this.logAction(
      adminId,
      "role_change",
      `Changed role for user ${targetUserId} from ${oldRole} to ${newRole}`,
      null,
      targetUserId
    );
  },

  async logAppealAction(adminId, appealId, action, appealType, response) {
    return this.logAction(
      adminId,
      `appeal_${action}`,
      `${
        action === "approve" ? "Approved" : "Rejected"
      } ${appealType} appeal ${appealId}`,
      `Response: ${response}`,
      null,
      null
    );
  },

  async logBulkAction(adminId, action, count, details) {
    return this.logAction(
      adminId,
      "bulk_action",
      `Performed bulk ${action} on ${count} items`,
      details
    );
  },
};
