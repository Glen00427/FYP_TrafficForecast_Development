// src/api/predict.js
/**
 * Predict routes given inputs.
 * Replace the internals with a real fetch to your ML service.
 * Suggested real API shape:
 * POST /predict { from, to, weather, daypart, dateISO, features... }
 * -> { best: {...}, worst: {...}, note, version }
 */
export async function predictRoutes({
  from,
  to,
  weather = "clear",
  daypart = "peak",
}) {
  // --- MOCK LOGIC (replace with real fetch) ---
  // A tiny heuristic + randomness to simulate different returns:
  const seed = (from + to + weather + daypart).length;
  const bestFirst = seed % 2 === 0;

  const options = [
    { id: "ECP", name: "ECP expressway" },
    { id: "PIE", name: "PIE expressway" },
    { id: "CTE", name: "CTE via city" },
  ];

  const best = bestFirst ? options[0] : options[1];
  const worst = bestFirst ? options[2] : options[0];

  const bestConfidence = 0.76 + (seed % 10) / 100; // 0.76 - 0.85
  const worstConfidence = 1 - bestConfidence - 0.05; // just to show a number

  // Return a shape your UI can render.
  // We only return labels/metadata; the map line will be fetched from OSRM when the user clicks.
  return {
    best: {
      id: best.id,
      label: "Predicted Best",
      name: best.name,
      confidence: Number(bestConfidence.toFixed(2)),
      // You can attach more features here (ETA, expected congestion, etc.)
      from,
      to,
    },
    worst: {
      id: worst.id,
      label: "Predicted Worst",
      name: worst.name,
      confidence: Number(worstConfidence.toFixed(2)),
      from,
      to,
    },
    note: "Suggestions are prediction-based and may differ from real-time traffic.",
    version: "mock-0.1",
  };
}
