import React, { useState, useEffect } from 'react';

export default function CongestionInfo({ predictionData }) {
    const [congestionData, setCongestionData] = useState(null);
    const [forecastData, setForecastData] = useState(null);
    const [loading, setLoading] = useState(true);

    const API_URL = process.env.REACT_APP_ML_API_URL;

    useEffect(() => {
        if (predictionData) {
            fetchCongestionData();
            fetchForecastData();
        }
    }, [predictionData]);

    async function fetchCongestionData() {
        try {
            const response = await fetch(`${API_URL}/current-congestion`);
            const data = await response.json();
            setCongestionData(data);
        } catch (error) {
            console.error('Failed to fetch congestion:', error);
            setCongestionData({ roads: [] });
        }
    }

    async function fetchForecastData() {
        try {
            const response = await fetch(`${API_URL}/forecast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: predictionData.from,
                    to: predictionData.to,
                }),
            });
            const data = await response.json();
            setForecastData(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch forecast:', error);
            setForecastData({ predictions: [] });
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="congestion-info-loading">
                <div className="loading-spinner">🔄</div>
                <p>Loading traffic data...</p>
            </div>
        );
    }

    // Extract model factors from prediction data
    const modelFactors = predictionData?.best ? {
        speed: predictionData.best.speed || 'N/A',
        time: predictionData.best.hour ? `${predictionData.best.hour}:00` : 'N/A',
        day: predictionData.best.dow !== undefined ?
            ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][predictionData.best.dow] : 'N/A',
        incidents: predictionData.best.incident_count || 0,
        segments: predictionData.best.link_ids_count || 0,
    } : null;

    return (
        <div className="congestion-info">
            {/* Section 1: High Congestion Areas */}
            <div className="ci-section">
                <h3 className="ci-title">🚨 High Congestion Areas</h3>

                {congestionData && congestionData.roads && congestionData.roads.length > 0 ? (
                    <div className="ci-roads">
                        {congestionData.roads.slice(0, 3).map((road, index) => (
                            <div key={index} className="ci-road-card">
                                <div className="ci-road-header">
                                    <span className="ci-road-icon">
                                        {road.congestion >= 70 ? '🔴' : road.congestion >= 40 ? '🟡' : '🟢'}
                                    </span>
                                    <span className="ci-road-name">{road.name}</span>
                                    <span className="ci-road-percentage">{road.congestion}%</span>
                                </div>
                                <div className="ci-road-details">
                                    Average speed: {road.speed} km/h
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="ci-no-data">No congestion data available</div>
                )}
            </div>

            {/* Section 2: Traffic Forecast */}
            <div className="ci-section">
                <h3 className="ci-title">📊 Traffic Forecast - Next Hour</h3>

                {forecastData && forecastData.predictions && forecastData.predictions.length > 0 ? (
                    <div className="ci-forecast">
                        {forecastData.predictions.map((pred, index) => (
                            <div key={index} className="ci-forecast-item">
                                <span className="ci-forecast-time">{pred.label}</span>
                                <div className="ci-forecast-bar">
                                    <div
                                        className={`ci-forecast-fill ${pred.congestion >= 60 ? 'danger' :
                                                pred.congestion >= 40 ? 'warning' : 'ok'
                                            }`}
                                        style={{ width: `${pred.congestion}%` }}
                                    />
                                </div>
                                <span className="ci-forecast-percent">{pred.congestion}%</span>
                                <span className="ci-forecast-status">{pred.status}</span>
                            </div>
                        ))}

                        {forecastData.trend && (
                            <div className="ci-forecast-alert">
                                <span className="ci-alert-icon">💡</span>
                                <span className="ci-alert-text">{forecastData.trend}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="ci-no-data">No forecast data available</div>
                )}
            </div>

            {/* Section 3: Model Factors */}
            {modelFactors && (
                <div className="ci-section">
                    <h3 className="ci-title">🔍 Model Factors</h3>

                    <div className="ci-factors">
                        <div className="ci-factor-row">
                            <span className="ci-factor-label">Average Speed:</span>
                            <span className="ci-factor-value">{modelFactors.speed} km/h</span>
                        </div>
                        <div className="ci-factor-row">
                            <span className="ci-factor-label">Time of Day:</span>
                            <span className="ci-factor-value">{modelFactors.time}</span>
                        </div>
                        <div className="ci-factor-row">
                            <span className="ci-factor-label">Day of Week:</span>
                            <span className="ci-factor-value">{modelFactors.day}</span>
                        </div>
                        <div className="ci-factor-row">
                            <span className="ci-factor-label">Incidents:</span>
                            <span className="ci-factor-value">{modelFactors.incidents}</span>
                        </div>
                        <div className="ci-factor-row">
                            <span className="ci-factor-label">Road Segments:</span>
                            <span className="ci-factor-value">{modelFactors.segments}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}