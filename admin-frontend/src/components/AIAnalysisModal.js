import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_API_URL =
  process.env.REACT_APP_ADMIN_API_URL ||
  process.env.REACT_APP_ML_API_URL ||
  "http://localhost:5000";

function AIAnalysisModal({ incident, onClose }) {
  const apiUrl = useMemo(() => DEFAULT_API_URL, []);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!incident) return;

    const controller = new AbortController();
    const fetchAnalysis = async () => {
      if (!apiUrl) {
        setError("AI analysis API is not configured.");
        return;
      }

      setLoading(true);
      setError(null);
      setAnalysis(null);

      try {
        const response = await fetch(`${apiUrl}/ai-analysis`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incident }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || "Unable to complete AI analysis.");
        }

        const data = await response.json();
        if (data.status !== "success" || !data.analysis) {
          throw new Error(
            data.error || "AI analysis response did not include any insights."
          );
        }

        setAnalysis(data.analysis);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("AI analysis error", err);
        setError(err.message || "Unexpected error while analysing report.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();

    return () => controller.abort();
  }, [incident, apiUrl]);

  const renderScores = () => {
    if (!analysis) return null;

    const authenticityScore = analysis.authenticity?.score ?? 0;
    const authenticityLabel = analysis.authenticity?.label || "Unknown";
    const qualityScore = analysis.quality?.score ?? 0;

    return (
      <div className="ai-scores">
        <div className="score-card">
          <div className="score-value">{authenticityScore}%</div>
          <div className="score-label">Authenticity Score</div>
          <div className="score-subtext">Predicted: {authenticityLabel}</div>
        </div>
        <div className="score-card">
          <div className="score-value">{qualityScore}%</div>
          <div className="score-label">Quality Score</div>
          {analysis.quality?.signals?.length > 0 && (
            <div className="score-subtext">
              {analysis.quality.signals.length} quality observations
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderConfidence = () => {
    if (!analysis?.authenticity?.confidence) return null;

    return (
      <div className="analysis-meta">
        <h4>Confidence</h4>
        <ul className="confidence-list">
          {Object.entries(analysis.authenticity.confidence).map(
            ([label, value]) => (
              <li key={label}>
                <span className="confidence-label">{label}</span>
                <span className="confidence-value">
                  {(value * 100).toFixed(1)}%
                </span>
              </li>
            )
          )}
        </ul>
        {analysis.model_status && !analysis.model_status.ready && (
          <p className="analysis-warning">
            Model fallback in use: {analysis.model_status.message}
          </p>
        )}
      </div>
    );
  };

  const renderRedFlags = () => {
    if (!analysis) return null;

    const flags = analysis.red_flags || [];
    return (
      <div className="red-flags">
        <h4>Red Flags</h4>
        {flags.length === 0 ? (
          <p className="no-flags">No significant red flags detected.</p>
        ) : (
          <ul>
            {flags.map((flag, idx) => (
              <li key={`${flag}-${idx}`}>{flag}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderQualitySignals = () => {
    if (!analysis?.quality?.signals?.length) return null;

    return (
      <div className="quality-signals">
        <h4>Quality Notes</h4>
        <ul>
          {analysis.quality.signals.map((signal, idx) => (
            <li key={`${signal}-${idx}`}>{signal}</li>
          ))}
        </ul>
      </div>
    );
  };

  const renderFeatureSummary = () => {
    if (!analysis?.feature_summary) return null;

    return (
      <div className="feature-summary">
        <h4>Signals Considered</h4>
        <ul>
          {Object.entries(analysis.feature_summary).map(([key, value]) => (
            <li key={key}>
              <span className="feature-label">{key.replace(/_/g, " ")}</span>
              <span className="feature-value">{String(value)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderBody = () => {
    if (loading) {
      return <div className="analysis-placeholder">Running AI analysis…</div>;
    }

    if (error) {
      return <div className="analysis-error">{error}</div>;
    }

    if (!analysis) {
      return (
        <div className="analysis-placeholder">
          Unable to load AI analysis for this incident.
        </div>
      );
    }

    return (
      <>
        {renderScores()}
        {renderConfidence()}
        {renderRedFlags()}
        {renderQualitySignals()}
        <div className="recommendation">
          <h4>Recommendation</h4>
          <p>{analysis.recommendation}</p>
        </div>
        <div className="reasoning">
          <h4>Reasoning</h4>
          <p>{analysis.reasoning}</p>
        </div>
        {renderFeatureSummary()}
      </>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>AI Report Analysis</h3>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>
        <div className="ai-analysis">{renderBody()}</div>
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