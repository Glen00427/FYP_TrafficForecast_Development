import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import ApproveAppealModal from "./ApproveAppealModal";
import RejectAppealModal from "./RejectAppealModal";

function AppealsTab({ onLogAction }) {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const mockAdminId = "admin-001";

  useEffect(() => {
    fetchAppeals();
  }, []);

  const fetchAppeals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("appeals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const appealsWithUserData = await Promise.all(
        data.map(async (appeal) => {
          try {
            const appealData = appeal.appeal_data;
            const { data: userData } = await supabase
              .from("users")
              .select("name, email")
              .eq("userid", appealData.user_id)
              .single();

            return {
              id: appeal.appeals_id,
              from: userData?.name || "Unknown User",
              email: userData?.email || "unknown@email.com",
              type:
                appealData.appeal_type === "ban_appeal"
                  ? "Ban Appeal"
                  : "Incident Rejection Appeal",
              message: appealData.appeal_reason || "No reason provided",
              submitted: new Date(appeal.created_at).toLocaleDateString(),
              status: appeal.status === "approved" || appeal.status === "rejected" ? "resolved" : appeal.status,
              response: appeal.admin_response,
              respondedBy: appeal.responded_by,
              appealData: appealData,
            };
          } catch (error) {
            console.error("Error fetching user data for appeal:", error);
            return null;
          }
        })
      );

      setAppeals(appealsWithUserData.filter((appeal) => appeal !== null));
    } catch (error) {
      console.error("Error fetching appeals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAppeal = async (response) => {
    if (!selectedAppeal) return;

    try {
      const { error: appealError } = await supabase
        .from("appeals")
        .update({
          status: "approved",
          admin_response: response,
          responded_by: mockAdminId,
          updated_at: new Date().toISOString(),
        })
        .eq("appeals_id", selectedAppeal.id);

      if (appealError) throw appealError;

      const appealData = selectedAppeal.appealData;

      if (appealData.appeal_type === "ban_appeal") {
        const { error: userError } = await supabase
          .from("users")
          .update({
            status: "active",
            ban_reason: null,
          })
          .eq("userid", appealData.user_id);

        if (userError) throw userError;

        // LOG AUDIT ACTION
        if (onLogAction) {
          await onLogAction(
            "appeal_approve",
            `Approved ban appeal for user: ${selectedAppeal.from}`,
            `Response: ${response} | User unbanned`,
            appealData.user_id,
            null
          );
        }
      } else if (
        appealData.appeal_type === "incident_rejection_appeal" &&
        appealData.incident_id
      ) {
        const { error: incidentError } = await supabase
          .from("incident_report")
          .update({
            status: "approved",
            reason: null,
          })
          .eq("id", appealData.incident_id);

        if (incidentError) throw incidentError;

        // LOG AUDIT ACTION
        if (onLogAction) {
          await onLogAction(
            "appeal_approve",
            `Approved incident appeal #${appealData.incident_id} for user: ${selectedAppeal.from}`,
            `Response: ${response} | Incident re-approved`,
            appealData.user_id,
            appealData.incident_id
          );
        }
      }

      await fetchAppeals();
      setShowApproveModal(false);
      setSelectedAppeal(null);
    } catch (error) {
      console.error("Error approving appeal:", error);
      alert("Failed to approve appeal. Please try again.");
    }
  };

  const handleRejectAppeal = async (reason) => {
    if (!selectedAppeal) return;

    try {
      const { error } = await supabase
        .from("appeals")
        .update({
          status: "rejected",
          admin_response: reason,
          responded_by: mockAdminId,
          updated_at: new Date().toISOString(),
        })
        .eq("appeals_id", selectedAppeal.id);

      if (error) throw error;

      const appealData = selectedAppeal.appealData;
      const appealType =
        appealData.appeal_type === "ban_appeal" ? "ban" : "incident";

      // LOG AUDIT ACTION
      if (onLogAction) {
        await onLogAction(
          "appeal_reject",
          `Rejected ${appealType} appeal from: ${selectedAppeal.from}`,
          `Reason: ${reason}`,
          appealData.user_id,
          appealData.incident_id || null
        );
      }

      await fetchAppeals();
      setShowRejectModal(false);
      setSelectedAppeal(null);
    } catch (error) {
      console.error("Error rejecting appeal:", error);
      alert("Failed to reject appeal. Please try again.");
    }
  };

  const handleApprove = (appeal) => {
    setSelectedAppeal(appeal);
    setShowApproveModal(true);
  };

  const handleReject = (appeal) => {
    setSelectedAppeal(appeal);
    setShowRejectModal(true);
  };

  if (loading) {
    return <div className="loading">Loading appeals...</div>;
  }

  return (
    <div className="appeals-tab">
      <div className="appeals-list">
        {appeals.length === 0 ? (
          <div className="no-appeals">No appeals found</div>
        ) : (
          appeals.map((appeal) => (
            <div key={appeal.id} className="appeal-card">
              <div className="appeal-header">
                <h4>{appeal.type}</h4>
                <span className="appeal-date">{appeal.submitted}</span>
              </div>
              <div className="appeal-meta">
                <strong>From: {appeal.from}</strong>
              </div>
              <p className="appeal-message">{appeal.message}</p>

              {appeal.status === "resolved" && (
                <div className="appeal-response">
                  <div className="response-header">
                    <strong>Admin Response by {appeal.respondedBy}</strong>
                  </div>
                  <p>{appeal.response}</p>
                </div>
              )}

              {appeal.status === "pending" && (
                <div className="appeal-actions">
                  <button
                    onClick={() => handleApprove(appeal)}
                    className="btn-success"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(appeal)}
                    className="btn-danger"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Approve Appeal Modal */}
      {showApproveModal && (
        <ApproveAppealModal
          appeal={selectedAppeal}
          onClose={() => {
            setShowApproveModal(false);
            setSelectedAppeal(null);
          }}
          onApprove={handleApproveAppeal}
        />
      )}

      {/* Reject Appeal Modal */}
      {showRejectModal && (
        <RejectAppealModal
          appeal={selectedAppeal}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedAppeal(null);
          }}
          onReject={handleRejectAppeal}
        />
      )}
    </div>
  );
}

export default AppealsTab;