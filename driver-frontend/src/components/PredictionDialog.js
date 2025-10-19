import React from 'react';

export default function PredictionDialog({ result, onClose, onShowRoute }) {
  if (!result) return null;

  const congestionPercent = Math.round(result.best.congestionProb * 100);
  const statusEmoji = result.best.status === 'congested' ? '🔴' : '🟢';

  return (
    <>
      {/* Backdrop - separate element */}
      <div 
        onClick={onClose} 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9998,
        }} 
      />

      {/* Dialog */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: 9999,
        minWidth: '300px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            marginBottom: '12px',
            color: '#1f2937',
          }}>
            {statusEmoji} Traffic Prediction
          </div>
          
          <div style={{ 
            fontSize: '14px', 
            lineHeight: '1.6',
            color: '#374151',
          }}>
            <div><strong>Route:</strong> {result.best.name}</div>
            <div><strong>Status:</strong> {result.best.status.toUpperCase()}</div>
            <div><strong>Congestion:</strong> {congestionPercent}%</div>
            <div><strong>Duration:</strong> {result.best.duration}</div>
            <div><strong>Distance:</strong> {result.best.distance}</div>
            <div><strong>Confidence:</strong> {Math.round(result.best.confidence * 100)}%</div>
          </div>

          <div style={{ 
            marginTop: '12px', 
            padding: '8px', 
            background: '#f3f4f6', 
            borderRadius: '6px', 
            fontSize: '13px',
            color: '#4b5563',
          }}>
            {result.note}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={onShowRoute} 
            style={{
              flex: 1,
              padding: '12px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.background = '#2563eb'}
          >
            🗺️ Show Route
          </button>
          
          <button 
            onClick={onClose} 
            style={{
              flex: 1,
              padding: '12px',
              background: '#e5e7eb',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => e.target.style.background = '#d1d5db'}
            onMouseOut={(e) => e.target.style.background = '#e5e7eb'}
          >
            OK
          </button>
        </div>
      </div>
    </>
  );
}