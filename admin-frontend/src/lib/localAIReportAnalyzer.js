const UNCERTAINTY_TERMS = [
  "maybe",
  "not sure",
  "unsure",
  "idk",
  "rumour",
  "unconfirmed",
  "apparently",
  "heard",
  "someone said",
  "looks like",
  "i think",
  "might",
];

const CONCRETE_DETAIL_TERMS = [
  "lane",
  "km",
  "exit",
  "towards",
  "junction",
  "bridge",
  "singapore",
  "expressway",
  "avenue",
  "road",
  "street",
];

const MEDIA_HINT_TERMS = [
  "see photo",
  "attached",
  "image",
  "video",
  "screenshot",
];

const SEVERITY_ORDER = {
  low: 0,
  medium: 1,
  moderate: 1,
  high: 2,
  critical: 3,
};

const RESPONSE_LABELS = ["Suspicious", "Needs Review", "Likely Authentic"];

class LocalAIReportAnalyzer {
  constructor() {
    this._modelStatus = {
      ready: true,
      message:
        "Client-side heuristic engine initialised inside admin-frontend.",
    };
  }

  analyse(rawIncident) {
    const incident = this._normalise(rawIncident);
    const features = this._extractFeatures(incident);

    const authenticity = this._scoreAuthenticity(features);
    const quality = this._scoreQuality(features);
    const redFlags = this._detectRedFlags(features);
    const recommendation = this._generateRecommendation(authenticity, redFlags);
    const reasoning = this._buildReasoning(
      features,
      authenticity,
      quality,
      redFlags
    );

    return {
      model_status: this._modelStatus,
      authenticity,
      quality,
      red_flags: redFlags,
      recommendation,
      reasoning,
      feature_summary: features,
    };
  }

  _normalise(incident) {
    if (typeof incident !== "object" || incident === null) {
      throw new Error("Incident payload must be an object");
    }

    const description = this._firstTruthy(
      incident.description,
      incident.message,
      ""
    );
    const type = this._firstTruthy(
      incident.incidentType,
      incident.type,
      incident.category,
      "unknown"
    );
    const severity = this._firstTruthy(
      incident.severity,
      incident.incident_severity,
      incident.level,
      "medium"
    );
    const location = this._firstTruthy(
      incident.location,
      incident.road_name,
      incident.road,
      ""
    );
    const fullAddress = this._firstTruthy(
      incident.fullAddress,
      incident.address,
      incident.place,
      location
    );

    let tags = [];
    const tagsField = incident.tags;
    if (typeof tagsField === "string") {
      tags = tagsField
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    } else if (Array.isArray(tagsField)) {
      tags = tagsField
        .map((value) => String(value).trim())
        .filter(Boolean);
    }

    let photoUrl = incident.photo_url || incident.photoUrl;
    if (photoUrl) {
      photoUrl = String(photoUrl).trim();
    } else {
      photoUrl = null;
    }

    const createdRaw =
      incident.createdAt || incident.created_at || incident.reported_at;
    const createdAt = createdRaw ? this._parseDatetime(createdRaw) : null;

    const reputationRaw =
      incident.reporter_reputation ?? incident.reporterReputation;
    let reporterReputation = null;
    if (reputationRaw !== undefined && reputationRaw !== null) {
      const parsed = Number(reputationRaw);
      if (!Number.isNaN(parsed)) {
        reporterReputation = parsed;
      }
    }

    return {
      description: String(description || "").trim(),
      type: String(type || "unknown").trim().toLowerCase() || "unknown",
      severity:
        String(severity || "medium").trim().toLowerCase() || "medium",
      location: String(location || "").trim(),
      full_address: String(fullAddress || "").trim(),
      tags,
      photo_url: photoUrl,
      created_at: createdAt,
      reporter_reputation: reporterReputation,
    };
  }

  _extractFeatures(incident) {
    const words = incident.description.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const charCount = incident.description.length;

    const uncertaintyTerms = this._countTerms(
      incident.description,
      UNCERTAINTY_TERMS
    );
    const evidenceTerms = this._countTerms(
      incident.description,
      MEDIA_HINT_TERMS
    );
    const concreteTerms = this._countTerms(
      incident.description,
      CONCRETE_DETAIL_TERMS
    );
    const hasDigits = /\d/.test(incident.description);

    const severityRank =
      SEVERITY_ORDER[incident.severity] ?? SEVERITY_ORDER.medium;
    const hasTags = incident.tags.length > 0;
    const hasVerifiedTag = incident.tags.some(
      (tag) => tag.toLowerCase() === "verified"
    );

    let recencyHours = null;
    if (
      incident.created_at instanceof Date &&
      !Number.isNaN(incident.created_at.getTime())
    ) {
      const diffMs = Date.now() - incident.created_at.getTime();
      recencyHours = Math.max(diffMs / (1000 * 60 * 60), 0);
    }

    return {
      description: incident.description,
      word_count: wordCount,
      char_count: charCount,
      uncertainty_terms: uncertaintyTerms,
      evidence_terms: evidenceTerms,
      concrete_terms: concreteTerms,
      has_digits: hasDigits,
      has_photo: Boolean(incident.photo_url),
      severity: incident.severity,
      severity_rank: severityRank,
      type: incident.type,
      location: incident.location || incident.full_address,
      has_tags: hasTags,
      has_verified_tag: hasVerifiedTag,
      reporter_reputation: incident.reporter_reputation,
      recency_hours: recencyHours,
    };
  }

  _scoreAuthenticity(features) {
    let score = 58.0;
    const confidenceWeighting = {
      "Likely Authentic": 0.33,
      "Needs Review": 0.34,
      Suspicious: 0.33,
    };

    const adjustments = [];

    if (features.has_photo) {
      score += 12;
      adjustments.push("Photo evidence provided");
      confidenceWeighting["Likely Authentic"] += 0.1;
      confidenceWeighting.Suspicious -= 0.05;
    }

    if (features.has_digits || features.concrete_terms >= 2) {
      score += 10;
      adjustments.push("Specific details detected in description");
      confidenceWeighting["Likely Authentic"] += 0.06;
      confidenceWeighting["Needs Review"] -= 0.03;
    }

    if (features.uncertainty_terms) {
      const penalty = Math.min(18, features.uncertainty_terms * 6);
      score -= penalty;
      adjustments.push("Uncertainty language used");
      confidenceWeighting.Suspicious += 0.08;
      confidenceWeighting["Likely Authentic"] -= 0.04;
    }

    if (features.severity_rank >= 2 && features.word_count < 12) {
      score -= 10;
      adjustments.push("Severe incident reported with little context");
      confidenceWeighting.Suspicious += 0.05;
    }

    if (features.has_verified_tag) {
      score += 6;
      adjustments.push("Previously verified by moderators");
      confidenceWeighting["Likely Authentic"] += 0.05;
    }

    const reputation = features.reporter_reputation;
    if (typeof reputation === "number") {
      if (reputation >= 0.7) {
        score += 5;
        adjustments.push("Reporter has strong reputation");
      } else if (reputation <= 0.3) {
        score -= 7;
        adjustments.push("Reporter flagged with low reputation");
      }
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    let label = RESPONSE_LABELS[1];
    if (score >= 75) {
      label = RESPONSE_LABELS[2];
    } else if (score <= 45) {
      label = RESPONSE_LABELS[0];
    }

    const totalWeight =
      confidenceWeighting["Likely Authentic"] +
      confidenceWeighting["Needs Review"] +
      confidenceWeighting.Suspicious || 1;
    const confidence = {
      "Likely Authentic": this._roundTo(
        confidenceWeighting["Likely Authentic"] / totalWeight,
        3
      ),
      "Needs Review": this._roundTo(
        confidenceWeighting["Needs Review"] / totalWeight,
        3
      ),
      Suspicious: this._roundTo(
        confidenceWeighting.Suspicious / totalWeight,
        3
      ),
    };

    return {
      score,
      label,
      signals: adjustments,
      confidence,
    };
  }

  _scoreQuality(features) {
    let score = 55.0;
    const signals = [];

    if (features.word_count >= 20) {
      score += 8;
      signals.push("Detailed description (>20 words)");
    } else if (features.word_count < 8) {
      score -= 8;
      signals.push("Very short description (<8 words)");
    }

    if (features.concrete_terms >= 2) {
      score += 6;
      signals.push("Contains concrete location cues");
    }

    if (features.has_photo) {
      score += 10;
      signals.push("Includes supporting photo evidence");
    }

    if (features.evidence_terms) {
      score += 4;
      signals.push("Mentions attached media");
    }

    if (features.uncertainty_terms) {
      const penalty = Math.min(12, features.uncertainty_terms * 4);
      score -= penalty;
      signals.push("Uses uncertainty language");
    }

    const recency = features.recency_hours;
    if (typeof recency === "number") {
      if (recency <= 3) {
        score += 5;
        signals.push("Reported within the last 3 hours");
      } else if (recency > 24) {
        score -= 4;
        signals.push("Report is older than 24 hours");
      }
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    return {
      score,
      signals,
    };
  }

  _detectRedFlags(features) {
    const redFlags = [];

    if (features.uncertainty_terms >= 2) {
      redFlags.push("Multiple uncertainty phrases detected in the report");
    }

    if (features.severity_rank >= 2 && features.word_count <= 6) {
      redFlags.push("High severity incident described with five words or fewer");
    }

    if (!features.has_photo && features.severity_rank >= 2) {
      redFlags.push("Severe incident reported without supporting media");
    }

    if (
      typeof features.reporter_reputation === "number" &&
      features.reporter_reputation <= 0.2
    ) {
      redFlags.push("Reporter reputation is flagged as very low");
    }

    return redFlags;
  }

  _generateRecommendation(authenticity, redFlags) {
    const score = authenticity.score;
    const label = authenticity.label;

    if (score >= 80 && redFlags.length === 0) {
      return "Approve and publish the incident to drivers.";
    }
    if (score <= 40) {
      return "Escalate for manual verification before any action.";
    }
    if (label === "Needs Review" || redFlags.length > 0) {
      return "Hold for moderator review and request additional evidence if possible.";
    }
    return "Proceed with caution and monitor for corroborating reports.";
  }

  _buildReasoning(features, authenticity, quality, redFlags) {
    const fragments = [];

    if (features.has_photo) {
      fragments.push("Photo evidence increases confidence.");
    } else {
      fragments.push("No media was attached.");
    }

    if (features.word_count) {
      fragments.push(
        `Description length: ${features.word_count} words with ${features.concrete_terms} location cues.`
      );
    }

    if (authenticity.signals.length) {
      fragments.push(`Authenticity signals: ${authenticity.signals.join(", ")}`);
    }

    if (quality.signals.length) {
      fragments.push(`Quality observations: ${quality.signals.join(", ")}`);
    }

    if (redFlags.length) {
      fragments.push(`Red flags: ${redFlags.join("; ")}`);
    }

    return fragments.join(" ");
  }

  _firstTruthy(...values) {
    for (const value of values) {
      if (value) {
        return value;
      }
    }
    return "";
  }

  _parseDatetime(value) {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === "number") {
      if (!Number.isFinite(value)) return null;
      if (value > 1e12) {
        return new Date(value);
      }
      return new Date(value * 1000);
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;

      // Attempt exact formats first to mirror the Python implementation.
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }

      const withZulu = new Date(`${trimmed}Z`);
      if (!Number.isNaN(withZulu.getTime())) {
        return withZulu;
      }
    }

    return null;
  }

  _countTerms(text, terms) {
    if (!text) return 0;
    const lowered = text.toLowerCase();
    return terms.reduce((total, term) => total + this._countOccurrences(lowered, term), 0);
  }

  _countOccurrences(haystack, needle) {
    if (!needle) return 0;
    let count = 0;
    let startIndex = 0;
    while (true) {
      const index = haystack.indexOf(needle, startIndex);
      if (index === -1) break;
      count += 1;
      startIndex = index + needle.length;
    }
    return count;
  }

  _roundTo(value, precision) {
    const factor = 10 ** precision;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}

export default LocalAIReportAnalyzer;
