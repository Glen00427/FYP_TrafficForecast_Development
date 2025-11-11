import React from "react";

function AIAnalysisModal({ incident, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>AI Report Analysis</h3>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>
        <div className="ai-analysis">
          <div className="ai-scores">
            <div className="score-card">
              <div className="score-value">50%</div>
              <div className="score-label">Authenticity Score</div>
            </div>
            <div className="score-card">
              <div className="score-value">30%</div>
              <div className="score-label">Quality Score</div>
            </div>
          </div>

          <div className="red-flags">
            <h4>Red Flags:</h4>
            <ul>
              <li>Lack of specific location details</li>
              <li>Vague description of the incident</li>
              <li>Source is non-official (community)</li>
            </ul>
          </div>

          <div className="recommendation">
            <h4>Recommendation:</h4>
            <p>
              Verify the report with local authorities and seek more detailed
              information.
            </p>
          </div>

          <div className="reasoning">
            <h4>Reasoning:</h4>
            <p>
              The report lacks critical details such as a precise location and
              specific information about the accident. The source being a
              community reference raises questions about the reliability of the
              information, suggesting a moderate level of concern for
              authenticity. The overall quality is low due to the vague nature
              of the report.
            </p>
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIAnalysisModal;
