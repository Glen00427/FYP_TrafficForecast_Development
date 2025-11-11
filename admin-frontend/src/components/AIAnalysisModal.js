import React, { useEffect, useMemo, useState } from "react";
import LocalAIReportAnalyzer from "../lib/localAIReportAnalyzer";

const CONFIDENCE_ORDER = ["Likely Authentic", "Needs Review", "Suspicious"];

function AIAnalysisModal({ incident, onClose }) {
  const localAnalyzer = useMemo(() => new LocalAIReportAnalyzer(), []);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisSource, setAnalysisSource] = useState(null);

  useEffect(() => {
    if (!incident) {
      return undefined;
    }

    let isActive = true;
    const controller = new AbortController();

    const runAnalysis = async () => {
      setLoading(true);
      setError(null);
      setAnalysis(null);
      setAnalysisSource(null);

      const configuredEndpoint = (process.env.REACT_APP_AI_ANALYSIS_URL || "").trim();

      const candidateEndpoints = [];
      if (configuredEndpoint) {
        candidateEndpoints.push(configuredEndpoint);
      }
      candidateEndpoints.push("/ai-analysis");
      candidateEndpoints.push("http://localhost:5000/ai-analysis");

      let remoteError = null;

      for (const url of candidateEndpoints) {
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ incident }),
            signal: controller.signal,
          });
          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }
          const data = await response.json();
          if (data.status !== "success" || !data.analysis) {
            throw new Error("Malformed response from AI service");
          }
          if (!isActive) {
            return;
          }
          setAnalysis(data.analysis);
          setAnalysisSource("remote");
          setLoading(false);
          return;
        } catch (err) {
          remoteError = err;
          console.warn("⚠️ Remote AI analysis failed:", err);
        }
      }

      try {
        const fallbackAnalysis = localAnalyzer.analyse(incident);
        if (!isActive) {
          return;
        }
        setAnalysis(fallbackAnalysis);
        setAnalysisSource("local");
      } catch (fallbackErr) {
        console.error("❌ Local AI analysis failed:", fallbackErr);
        if (!isActive) {
          return;
        }
        setError(
          fallbackErr instanceof Error
            ? fallbackErr.message
            : "Unable to generate analysis."
        );
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    runAnalysis();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [incident, localAnalyzer]);

  if (!incident) {
    return null;
  }

  const authenticity = analysis?.authenticity;
  const quality = analysis?.quality;
  const redFlags = analysis?.red_flags || [];
  const qualityNotes = quality?.signals || [];
  const confidence = authenticity?.confidence || {};
  const featureSummary = analysis?.feature_summary || {};

  const statusMessage = (() => {
    if (loading) {
      return "Generating AI insights…";
    }
    if (analysisSource === "local") {
      return "Remote AI service unavailable – generated insights using local heuristics.";
    }
    if (analysis?.model_status?.message) {
      return analysis.model_status.message;
    }
    return null;
  })();

  const formatPercent = (value, decimals = 0) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "0%";
    }
    const percentValue = value > 1 ? value : value * 100;
    return `${percentValue.toFixed(decimals)}%`;
  };

  const confidenceEntries = CONFIDENCE_ORDER.map((label) => ({
    label,
    value:
      typeof confidence[label] === "number"
        ? Math.max(0, Math.min(1, confidence[label]))
        : 0,
  }));

  const signalsList = [
    { key: "description", label: "description", value: featureSummary.description },
    { key: "word_count", label: "Word Count", value: featureSummary.word_count },
    { key: "char_count", label: "Char Count", value: featureSummary.char_count },
    {
      key: "uncertainty_terms",
      label: "Uncertainty Terms",
      value: featureSummary.uncertainty_terms,
    },
    {
      key: "evidence_terms",
      label: "Evidence Terms",
      value: featureSummary.evidence_terms,
    },
    {
      key: "concrete_terms",
      label: "Concrete Terms",
      value: featureSummary.concrete_terms,
    },
    {
      key: "has_digits",
      label: "Has Digits",
      value:
        featureSummary.has_digits === undefined
          ? null
          : featureSummary.has_digits
          ? "true"
          : "false",
    },
    {
      key: "has_photo",
      label: "Has Photo",
      value:
        featureSummary.has_photo === undefined
          ? null
          : featureSummary.has_photo
          ? "true"
          : "false",
    },
    { key: "severity", label: "Severity", value: featureSummary.severity },
    {
      key: "severity_rank",
      label: "Severity Rank",
      value: featureSummary.severity_rank,
    },
    { key: "type", label: "Type", value: featureSummary.type },
    { key: "location", label: "Location", value: featureSummary.location },
    {
      key: "has_tags",
      label: "Has Tags",
      value:
        featureSummary.has_tags === undefined
          ? null
          : featureSummary.has_tags
          ? "true"
          : "false",
    },
    {
      key: "has_verified_tag",
      label: "Has Verified Tag",
      value:
        featureSummary.has_verified_tag === undefined
          ? null
          : featureSummary.has_verified_tag
          ? "true"
          : "false",
    },
    {
      key: "reporter_reputation",
      label: "Reporter Reputation",
      value:
        featureSummary.reporter_reputation === null ||
        featureSummary.reporter_reputation === undefined
          ? "null"
          : featureSummary.reporter_reputation.toFixed(2),
    },
    {
      key: "recency_hours",
      label: "Recency Hours",
      value:
        featureSummary.recency_hours === null ||
        featureSummary.recency_hours === undefined
          ? "Unknown"
          : featureSummary.recency_hours.toFixed(6),
    },
  ];

  const nonEmptySignals = signalsList.filter((item) => item.value !== undefined && item.value !== null && item.value !== "");

  return (
    <div className="modal-overlay">
      <div className="modal-content ai-modal">
        <div className="modal-header">
          <h3>AI Report Analysis</h3>
          <button onClick={onClose} className="close-btn" aria-label="Close AI analysis modal">
            ×
          </button>
        </div>
        <div className="ai-analysis">
          {statusMessage && (
            <div
              className={`ai-status ${
                analysisSource === "local" ? "warning" : "info"
              }`}
            >
              {statusMessage}
            </div>
          )}

          {error && analysisSource !== "remote" && (
            <div className="ai-error" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="ai-loading">Analysing incident details…</div>
          ) : analysis ? (
            <>
              <div className="ai-scores">
                <div className="score-card">
                  <div className="score-value">
                    {formatPercent(authenticity?.score || 0)}
                  </div>
                  <div className="score-label">Authenticity Score</div>
                  {authenticity?.label && (
                    <div className="score-subtitle">
                      Predicted: {authenticity.label}
                    </div>
                  )}
                </div>
                <div className="score-card">
                  <div className="score-value">
                    {formatPercent(quality?.score || 0)}
                  </div>
                  <div className="score-label">Quality Score</div>
                  <div className="score-subtitle">
                    {qualityNotes.length
                      ? `${qualityNotes.length} quality observation${
                          qualityNotes.length === 1 ? "" : "s"
                        }`
                      : "No quality observations"}
                  </div>
                </div>
              </div>

              <div className="ai-grid">
                <div className="ai-panel">
                  <h4>Confidence</h4>
                  <ul className="confidence-list">
                    {confidenceEntries.map(({ label, value }) => (
                      <li key={label} className="confidence-item">
                        <span>{label}</span>
                        <div className="confidence-meter">
                          <div
                            className="confidence-bar"
                            style={{ width: `${Math.round(value * 100)}%` }}
                          />
                        </div>
                        <span className="confidence-value">
                          {formatPercent(value, 1)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="ai-panel">
                  <h4>Red Flags</h4>
                  {redFlags.length ? (
                    <ul className="ai-list">
                      {redFlags.map((flag, index) => (
                        <li key={index}>{flag}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No significant red flags detected.</p>
                  )}
                </div>
              </div>

              <div className="ai-panel">
                <h4>Quality Notes</h4>
                {qualityNotes.length ? (
                  <ul className="ai-list">
                    {qualityNotes.map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No specific quality observations recorded.</p>
                )}
              </div>

              <div className="ai-panel">
                <h4>Recommendation</h4>
                <p>{analysis.recommendation}</p>
              </div>

              <div className="ai-panel">
                <h4>Reasoning</h4>
                <p>{analysis.reasoning}</p>
              </div>

              <div className="ai-panel">
                <h4>Signals Considered</h4>
                <dl className="signals-list">
                  {nonEmptySignals.map(({ key, label, value }) => (
                    <div className="signals-row" key={key}>
                      <dt>{label}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </>
          ) : (
            <div className="ai-error" role="alert">
              Unable to generate analysis for this incident.
            </div>
          )}
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