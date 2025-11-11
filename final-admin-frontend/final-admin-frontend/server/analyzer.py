"""Heuristic AI report analysis engine for the admin dashboard.

This module keeps all logic inside the admin-frontend workspace so the
feature can run independently of the driver-facing backend.  It exposes
``AIReportAnalyzer`` which ingests an incident payload and returns
structured findings that the React ``AIAnalysisModal`` can render.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Iterable, List, Optional

UNCERTAINTY_TERMS = {
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
}

CONCRETE_DETAIL_TERMS = {
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
}

MEDIA_HINT_TERMS = {
    "see photo",
    "attached",
    "image",
    "video",
    "screenshot",
}

SEVERITY_ORDER = {"low": 0, "medium": 1, "moderate": 1, "high": 2, "critical": 3}

RESPONSE_LABELS = ["Suspicious", "Needs Review", "Likely Authentic"]


@dataclass
class NormalisedIncident:
    """Container for the normalised incident payload."""

    description: str
    type: str
    severity: str
    location: str
    full_address: str
    tags: List[str]
    photo_url: Optional[str]
    created_at: Optional[datetime]
    reporter_reputation: Optional[float]

    @property
    def has_photo(self) -> bool:
        return bool(self.photo_url)


class AIReportAnalyzer:
    """Rule-based incident analyser that mimics an AI assistant."""

    def __init__(self) -> None:
        self._model_status = {
            "ready": True,
            "message": "Heuristic scoring engine initialised inside admin-frontend.",
        }

    # ------------------------------------------------------------------
    def analyse(self, incident: Dict) -> Dict:
        """Analyse an incident and return structured findings."""

        normalised = self._normalise(incident)
        features = self._extract_features(normalised)

        authenticity = self._score_authenticity(features)
        quality = self._score_quality(features)
        red_flags = self._detect_red_flags(features)
        recommendation = self._generate_recommendation(authenticity, red_flags)
        reasoning = self._build_reasoning(features, authenticity, quality, red_flags)

        return {
            "model_status": self._model_status,
            "authenticity": authenticity,
            "quality": quality,
            "red_flags": red_flags,
            "recommendation": recommendation,
            "reasoning": reasoning,
            "feature_summary": features,
        }

    # ------------------------------------------------------------------
    def _normalise(self, incident: Dict) -> NormalisedIncident:
        if not isinstance(incident, dict):
            raise ValueError("Incident payload must be an object")

        description = self._first_truthy(
            incident.get("description"),
            incident.get("message"),
            "",
        )
        type_value = self._first_truthy(
            incident.get("incidentType"),
            incident.get("type"),
            incident.get("category"),
            "unknown",
        )
        severity_value = self._first_truthy(
            incident.get("severity"),
            incident.get("incident_severity"),
            incident.get("level"),
            "medium",
        )
        location = self._first_truthy(
            incident.get("location"),
            incident.get("road_name"),
            incident.get("road"),
            "",
        )
        full_address = self._first_truthy(
            incident.get("fullAddress"),
            incident.get("address"),
            incident.get("place"),
            location,
        )

        tags_field = incident.get("tags")
        if isinstance(tags_field, str):
            tags = [t.strip() for t in tags_field.split(",") if t.strip()]
        elif isinstance(tags_field, Iterable):
            tags = [str(t).strip() for t in tags_field if str(t).strip()]
        else:
            tags = []

        photo_url = incident.get("photo_url") or incident.get("photoUrl")
        if photo_url:
            photo_url = str(photo_url).strip()

        created_raw = (
            incident.get("createdAt")
            or incident.get("created_at")
            or incident.get("reported_at")
        )
        created_at = self._parse_datetime(created_raw) if created_raw else None

        reputation_raw = incident.get("reporter_reputation") or incident.get(
            "reporterReputation"
        )
        reporter_reputation = None
        if reputation_raw is not None:
            try:
                reporter_reputation = float(reputation_raw)
            except (TypeError, ValueError):
                reporter_reputation = None

        return NormalisedIncident(
            description=str(description).strip(),
            type=str(type_value).strip().lower() or "unknown",
            severity=str(severity_value).strip().lower() or "medium",
            location=str(location).strip(),
            full_address=str(full_address).strip(),
            tags=tags,
            photo_url=photo_url or None,
            created_at=created_at,
            reporter_reputation=reporter_reputation,
        )

    # ------------------------------------------------------------------
    def _extract_features(self, incident: NormalisedIncident) -> Dict[str, object]:
        words = [w for w in incident.description.split() if w]
        word_count = len(words)
        char_count = len(incident.description)

        uncertainty_hits = self._count_terms(incident.description, UNCERTAINTY_TERMS)
        evidence_terms = self._count_terms(incident.description, MEDIA_HINT_TERMS)
        concrete_terms = self._count_terms(incident.description, CONCRETE_DETAIL_TERMS)
        has_digits = any(ch.isdigit() for ch in incident.description)

        severity_rank = SEVERITY_ORDER.get(incident.severity, 1)
        has_tags = bool(incident.tags)
        has_verified_tag = any(t.lower() == "verified" for t in incident.tags)

        recency_hours = None
        if incident.created_at:
            recency_hours = max(
                (datetime.utcnow() - incident.created_at).total_seconds() / 3600.0,
                0,
            )

        return {
            "description": incident.description,
            "word_count": word_count,
            "char_count": char_count,
            "uncertainty_terms": uncertainty_hits,
            "evidence_terms": evidence_terms,
            "concrete_terms": concrete_terms,
            "has_digits": has_digits,
            "has_photo": incident.has_photo,
            "severity": incident.severity,
            "severity_rank": severity_rank,
            "type": incident.type,
            "location": incident.location or incident.full_address,
            "has_tags": has_tags,
            "has_verified_tag": has_verified_tag,
            "reporter_reputation": incident.reporter_reputation,
            "recency_hours": recency_hours,
        }

    # ------------------------------------------------------------------
    def _score_authenticity(self, features: Dict[str, object]) -> Dict[str, object]:
        score = 58.0
        confidence_weighting: Dict[str, float] = {
            "Likely Authentic": 0.33,
            "Needs Review": 0.34,
            "Suspicious": 0.33,
        }

        adjustments: List[str] = []

        if features["has_photo"]:
            score += 12
            adjustments.append("Photo evidence provided")
            confidence_weighting["Likely Authentic"] += 0.1
            confidence_weighting["Suspicious"] -= 0.05

        if features["has_digits"] or features["concrete_terms"] >= 2:
            score += 10
            adjustments.append("Specific details detected in description")
            confidence_weighting["Likely Authentic"] += 0.06
            confidence_weighting["Needs Review"] -= 0.03

        if features["uncertainty_terms"]:
            penalty = min(18, features["uncertainty_terms"] * 6)
            score -= penalty
            adjustments.append("Uncertainty language used")
            confidence_weighting["Suspicious"] += 0.08
            confidence_weighting["Likely Authentic"] -= 0.04

        if features["severity_rank"] >= 2 and features["word_count"] < 12:
            score -= 10
            adjustments.append("Severe incident reported with little context")
            confidence_weighting["Suspicious"] += 0.05

        if features["has_verified_tag"]:
            score += 6
            adjustments.append("Previously verified by moderators")
            confidence_weighting["Likely Authentic"] += 0.05

        reputation = features.get("reporter_reputation")
        if reputation is not None:
            if reputation >= 0.7:
                score += 5
                adjustments.append("Reporter has strong reputation")
            elif reputation <= 0.3:
                score -= 7
                adjustments.append("Reporter flagged with low reputation")

        score = max(0, min(100, round(score)))

        label = RESPONSE_LABELS[1]
        if score >= 75:
            label = RESPONSE_LABELS[2]
        elif score <= 45:
            label = RESPONSE_LABELS[0]

        normaliser = sum(confidence_weighting.values()) or 1.0
        confidence = {
            key: max(0.0, round(value / normaliser, 3))
            for key, value in confidence_weighting.items()
        }

        return {
            "score": score,
            "label": label,
            "signals": adjustments,
            "confidence": confidence,
        }

    # ------------------------------------------------------------------
    def _score_quality(self, features: Dict[str, object]) -> Dict[str, object]:
        score = 55.0
        signals: List[str] = []

        if features["word_count"] >= 20:
            score += 8
            signals.append("Detailed description (>20 words)")
        elif features["word_count"] < 8:
            score -= 8
            signals.append("Very short description (<8 words)")

        if features["concrete_terms"] >= 2:
            score += 6
            signals.append("Contains concrete location cues")

        if features["has_photo"]:
            score += 10
            signals.append("Includes supporting photo evidence")

        if features["evidence_terms"]:
            score += 4
            signals.append("Mentions attached media")

        if features["uncertainty_terms"]:
            penalty = min(12, features["uncertainty_terms"] * 4)
            score -= penalty
            signals.append("Uses uncertainty language")

        recency = features.get("recency_hours")
        if recency is not None:
            if recency <= 3:
                score += 5
                signals.append("Reported within the last 3 hours")
            elif recency > 24:
                score -= 4
                signals.append("Report is older than 24 hours")

        score = max(0, min(100, round(score)))

        return {
            "score": score,
            "signals": signals,
        }

    # ------------------------------------------------------------------
    def _detect_red_flags(self, features: Dict[str, object]) -> List[str]:
        red_flags: List[str] = []

        if features["uncertainty_terms"] >= 2:
            red_flags.append("Multiple uncertainty phrases detected in the report")

        if features["severity_rank"] >= 2 and features["word_count"] <= 6:
            red_flags.append(
                "High severity incident described with five words or fewer"
            )

        if not features["has_photo"] and features["severity_rank"] >= 2:
            red_flags.append("Severe incident reported without supporting media")

        if (
            features.get("reporter_reputation") is not None
            and features["reporter_reputation"] <= 0.2
        ):
            red_flags.append("Reporter reputation is flagged as very low")

        return red_flags

    # ------------------------------------------------------------------
    def _generate_recommendation(
        self, authenticity: Dict[str, object], red_flags: List[str]
    ) -> str:
        score = authenticity["score"]
        label = authenticity["label"]

        if score >= 80 and not red_flags:
            return "Approve and publish the incident to drivers."
        if score <= 40:
            return "Escalate for manual verification before any action."
        if label == "Needs Review" or red_flags:
            return "Hold for moderator review and request additional evidence if possible."
        return "Proceed with caution and monitor for corroborating reports."

    # ------------------------------------------------------------------
    def _build_reasoning(
        self,
        features: Dict[str, object],
        authenticity: Dict[str, object],
        quality: Dict[str, object],
        red_flags: List[str],
    ) -> str:
        fragments: List[str] = []

        if features["has_photo"]:
            fragments.append("Photo evidence increases confidence.")
        else:
            fragments.append("No media was attached.")

        if features["word_count"]:
            fragments.append(
                f"Description length: {features['word_count']} words with {features['concrete_terms']} location cues."
            )

        if authenticity["signals"]:
            fragments.append(
                "Authenticity signals: "
                + ", ".join(authenticity["signals"])
            )

        if quality["signals"]:
            fragments.append(
                "Quality observations: " + ", ".join(quality["signals"])
            )

        if red_flags:
            fragments.append("Red flags: " + "; ".join(red_flags))

        return " ".join(fragments)

    # ------------------------------------------------------------------
    @staticmethod
    def _first_truthy(*values):
        for value in values:
            if value:
                return value
        return ""

    @staticmethod
    def _parse_datetime(value) -> Optional[datetime]:
        if isinstance(value, datetime):
            return value

        if isinstance(value, (int, float)):
            try:
                return datetime.utcfromtimestamp(float(value))
            except ValueError:
                return None

        if isinstance(value, str):
            for fmt in (
                "%Y-%m-%dT%H:%M:%S.%fZ",
                "%Y-%m-%dT%H:%M:%SZ",
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%d",
            ):
                try:
                    return datetime.strptime(value, fmt)
                except ValueError:
                    continue
        return None

    @staticmethod
    def _count_terms(text: str, terms: Iterable[str]) -> int:
        lowered = text.lower()
        return sum(lowered.count(term) for term in terms)


__all__ = ["AIReportAnalyzer"]
