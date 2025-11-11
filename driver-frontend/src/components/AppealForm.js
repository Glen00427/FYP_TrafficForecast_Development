import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AppealForm({ open, userRow, onClose, onSubmitted }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const userId =
    userRow?.userid ?? userRow?.user_id ?? userRow?.id ?? userRow?.ID ?? null;

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!userId) return alert("Missing user id for appeal.");
    const body = message.trim();
    if (!body) return alert("Please write your appeal message.");

    try {
      setSubmitting(true);
      const { error } = await supabase.from("appeals").insert([
        {
          user_id: Number(userId),
          incident_id: null,
          appeal_type: "ban_appeal", // fixed to pass CHECK constraint
          message: body,
          status: "pending",         
          responded_by: null,
        },
      ]);

      if (error) {
        console.error("Appeal insert error:", error);
        alert(error.message || "Failed to submit appeal.");
        return;
      }

      onSubmitted?.();
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="gate-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="gate-card" onClick={(e) => e.stopPropagation()}>
        <button className="gate-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <div className="gate-logo" aria-hidden>📝</div>
        <h2 className="gate-title">Submit an Appeal</h2>

        <form className="gate-form" onSubmit={handleSubmit}>
          <label className="usf-label" htmlFor="appeal-msg">Message</label>
          <textarea
            id="appeal-msg"
            className="usf-input"
            rows={6}
            placeholder="Explain why the ban should be reconsidered…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={5000}
          />

          <button
            type="submit"
            className="usf-btn usf-btn-primary"
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit Appeal"}
          </button>
        </form>
      </div>
    </div>
  );
}