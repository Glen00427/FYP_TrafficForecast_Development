// driver-frontend/src/api/predict.js
export async function predictRoutes({ from, to, departTime }) {
  const API_URL = process.env.REACT_APP_ML_API_URL || 'http://localhost:5000';
  
  try {
    console.log('🔍 Calling ML API:', API_URL);
    console.log('📍 From:', from, 'To:', to);
    
    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        departTime: departTime || new Date().toISOString(),
      }),
    });
    
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Error:', errorData);
      throw new Error(errorData.error || 'Prediction failed');
    }
    
    const data = await response.json();
    console.log('✅ ML Response:', data);
    
    return {
      best: {
        id: data.route_id,
        name: data.route_name,
        label: data.status === 'congested' ? '🔴 High Congestion' : '🟢 Clear Traffic',
        confidence: data.confidence,
        duration: `${data.duration_min} min`,
        distance: `${data.distance_km} km`,
        congestionProb: data.congestion_prob,
        status: data.status,
        linkIdsCount: data.link_ids_count
      },
      worst: null,
      note: `Congestion: ${Math.round(data.congestion_prob * 100)}% (${data.status})`,
    };
  } catch (error) {
    console.error('🔥 Prediction error:', error);
    return {
      best: { 
        id: 'fallback', 
        name: `${from} → ${to}`, 
        label: '⚠️ API Offline', 
        duration: '25 min', 
        distance: '12 km', 
        confidence: 0.7,
        congestionProb: 0.35,
        status: 'clear'
      },
      worst: null,
      note: `Error: ${error.message}`,
    };
  }
}
