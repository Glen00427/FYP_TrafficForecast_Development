import React from 'react';

export default function PredictionDialog({ result, onClose, onShowRoute }) {
  if (!result) return null;

  const congestionPercent = Math.round(result.best.congestionProb * 100);
  const statusEmoji = result.best.status === 'congested' ? '🔴' : '🟢';

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
        maxWidth: '400px',
        width: '90%',
      }}>
        <h2 style={{ margin: '0 0 15px 0' }}>
          {statusEmoji} Traffic Prediction
        </h2>

        <div style={{ marginBottom: '20px', lineHeight: '1.8' }}>
          <div><strong>Route:</strong> {result.best.name}</div>
          <div><strong>Status:</strong> {result.best.status.toUpperCase()}</div>
          <div><strong>Congestion:</strong> {congestionPercent}%</div>
          <div><strong>Duration:</strong> {result.best.duration}</div>
          <div><strong>Distance:</strong> {result.best.distance}</div>
          <div><strong>Confidence:</strong> {Math.round(result.best.confidence * 100)}%</div>
        </div>

        <div style={{
          padding: '10px',
          background: '#f0f0f0',
          borderRadius: '5px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          {result.note}
        </div>

        {/* TWO BUTTONS SIDE BY SIDE */}
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
              background: '#gray',
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