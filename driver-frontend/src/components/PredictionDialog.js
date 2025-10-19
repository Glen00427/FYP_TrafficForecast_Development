// driver-frontend/src/components/PredictionDialog.js
import React from 'react';

export default function PredictionDialog({ result, onClose, onShowRoute }) {
  if (!result) return null;

  const best = result.best;
  const alternatives = result.alternatives || [];
  // const congestionPercent = Math.round(best.congestionProb * 100);
  const congestionPercent = Math.round((best.congestionProb || best.congestion_prob) * 100);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '10px',
        maxWidth: '450px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        <h2 style={{ margin: '0 0 15px 0' }}>
          {best.label || '🚗 Traffic Prediction'}
        </h2>

        {/* BEST ROUTE */}
        <div style={{ marginBottom: '20px', lineHeight: '1.8' }}>
          <div><strong>Route:</strong> {best.route_name || best.name}</div>
          <div><strong>Status:</strong> {best.status.toUpperCase()}</div>
          <div><strong>Congestion:</strong> {congestionPercent}%</div>
          <div><strong>Duration:</strong> {best.duration_min || best.duration} min</div>
          <div><strong>Distance:</strong> {best.distance_km || best.distance} km</div>
          <div><strong>Confidence:</strong> {Math.round(best.confidence * 100)}%</div>
        </div>

        {/* ALTERNATIVES */}
        {alternatives.length > 0 && (
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            background: '#f9f9f9',
            borderRadius: '5px',
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
              Other Routes:
            </div>
            {alternatives.map((alt, idx) => (
              <div key={idx} style={{
                marginBottom: '8px',
                fontSize: '14px',
                paddingBottom: '8px',
                borderBottom: idx < alternatives.length - 1 ? '1px solid #ddd' : 'none'
              }}>
                {/*<div>{alt.label} - {Math.round(alt.congestionProb * 100)}% congested</div>*/}
                <div>{alt.label} - {Math.round((alt.congestionProb || alt.congestion_prob) * 100)}% congested</div>
                <div style={{ color: '#666', fontSize: '13px' }}>
                  {alt.duration_min} min, {alt.distance_km} km
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NOTE */}
        {result.note && (
          <div style={{
            padding: '10px',
            background: '#e8f5e9',
            borderRadius: '5px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#2e7d32',
          }}>
            {result.note}
          </div>
        )}

        {/* BUTTONS */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onShowRoute}
            style={{
              flex: 1,
              padding: '12px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Show Route
          </button>

          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              background: 'white',
              color: '#333',
              border: '1px solid #ccc',
              borderRadius: '5px',
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}