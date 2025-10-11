// fyp-tfbdm/src/api/predict.js
export async function predictRoutes({ from, to, departTime }) {
  const API_URL = process.env.REACT_APP_ML_API_URL || 'http://localhost:5000';
  
  try {
    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        departTime: departTime || new Date().toISOString(),
      }),
    });
    
    if (!response.ok) {
      throw new Error('Prediction failed');
    }
    
    const data = await response.json();
    
    // Transform to UI format
    return {
      best: {
        id: data.best_route_id,
        name: data.best_route_name,
        label: "Predicted Best",
        confidence: data.best_confidence,
        duration: `${data.best_duration_min} min`,
        distance: `${data.best_distance_km} km`,
        congestionProb: data.best_congestion_prob,
      },
      worst: {
        id: data.worst_route_id,
        name: data.worst_route_name,
        label: "Predicted Worst",
        confidence: data.worst_confidence,
        duration: `${data.worst_duration_min} min`,
        distance: `${data.worst_distance_km} km`,
        congestionProb: data.worst_congestion_prob,
      },
      note: "AI-powered predictions based on real-time traffic and historical patterns",
    };
  } catch (error) {
    console.error('Prediction error:', error);
    // Return fallback/demo data
    return {
      best: { 
        id: 'fallback', 
        name: 'Route 1', 
        label: 'Best (fallback)', 
        duration: '25 min', 
        distance: '12 km', 
        confidence: 0.7,
        congestionProb: 0.35  // ADDED THIS
      },
      worst: { 
        id: 'fallback2', 
        name: 'Route 2', 
        label: 'Alternative', 
        duration: '32 min', 
        distance: '15 km', 
        confidence: 0.6,
        congestionProb: 0.68  // ADDED THIS
      },
      note: 'Using fallback routes (backend offline)',
    };
  }
}
