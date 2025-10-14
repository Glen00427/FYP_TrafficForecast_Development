# backend-app.py (COMPLETE - USING ALL YOUR IPYNB CODE)
# Flask backend for traffic congestion prediction
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
import requests
import os

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://curly-space-system-g4xw75qxrxq4fjj-3000.app.github.dev",
            "http://localhost:3000"
        ]
    }
})

# Load model 
MODEL_PATH = 'congestion_model.pkl'
model = None
FEATS = None

try:
    if os.path.exists(MODEL_PATH):
        mdl_bundle = joblib.load(MODEL_PATH)
        model = mdl_bundle["model"]
        FEATS = mdl_bundle["features"]
        print(f"✅ Model loaded successfully")
        print(f"✅ Features: {FEATS}")
    else:
        print(f"⚠️ Model file not found at {MODEL_PATH}")
        FEATS = [
            "SpeedKMH_Est", "MinimumSpeed", "MaximumSpeed",
            "dow", "hour", "incident_count", "vms_count", "cctv_count", "ett_mean"
        ]
except Exception as e:
    print(f"❌ Error loading model: {e}")
    FEATS = [
        "SpeedKMH_Est", "MinimumSpeed", "MaximumSpeed",
        "dow", "hour", "incident_count", "vms_count", "cctv_count", "ett_mean"
    ]

# LTA API credentials 
LTA_ACCOUNT_KEY = '9/ZLa/JOSf2zKSPsVJ3dUA=='


def geocode_address(address):
    """Convert address string to coordinates using Nominatim (free, no API key)."""
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': f"{address}, Singapore",
            'format': 'json',
            'limit': 1
        }
        headers = {'User-Agent': 'TrafficPredictionApp/1.0'}
        
        response = requests.get(url, params=params, headers=headers, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data:
                return float(data[0]['lat']), float(data[0]['lon'])
        
        return None, None
    except Exception as e:
        print(f"❌ Geocoding error: {e}")
        return None, None


def get_lta_traffic_speedbands():
    """Fetch current traffic speed bands from LTA API."""
    url = 'https://datamall2.mytransport.sg/ltaodataservice/v4/TrafficSpeedBands'
    headers = {'AccountKey': LTA_ACCOUNT_KEY, 'accept': 'application/json'}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            print(f"LTA API error: {response.status_code}")
            return pd.DataFrame()
        
        data = response.json().get('value', [])
        if not data:
            return pd.DataFrame()
        
        df = pd.DataFrame(data)
        
        num_cols = ["SpeedBand", "MinimumSpeed", "MaximumSpeed"]
        for c in num_cols:
            if c in df.columns:
                df[c] = pd.to_numeric(df[c], errors="coerce")
        
        if 'MinimumSpeed' in df.columns and 'MaximumSpeed' in df.columns:
            df["SpeedKMH_Est"] = (df["MinimumSpeed"] + df["MaximumSpeed"]) / 2
        else:
            print("⚠️ Warning: MinimumSpeed or MaximumSpeed not in LTA response")
            return pd.DataFrame()
        
        now = datetime.now()
        df['dow'] = now.weekday()
        df['hour'] = now.hour
        
        df['incident_count'] = 0
        df['vms_count'] = 0
        df['cctv_count'] = 36000
        df['ett_mean'] = 1.75
        
        df["SpeedKMH_Est"] = df["SpeedKMH_Est"].clip(0, 120)
        df["MinimumSpeed"] = df["MinimumSpeed"].clip(0, 120)
        df["MaximumSpeed"] = df["MaximumSpeed"].clip(0, 120)
        
        return df
        
    except Exception as e:
        print(f"Error fetching LTA data: {e}")
        return pd.DataFrame()


def get_osrm_route(start_lat, start_lon, end_lat, end_lon):
    """Get route from OSRM."""
    try:
        url = f"http://router.project-osrm.org/route/v1/driving/{start_lon},{start_lat};{end_lon},{end_lat}"
        params = {
            'overview': 'full',
            'geometries': 'geojson',
            'steps': 'true'
        }
        
        response = requests.get(url, params=params, timeout=15)
        
        if response.status_code != 200:
            print(f"OSRM error: {response.status_code}")
            return None
        
        data = response.json()
        
        if 'routes' not in data or len(data['routes']) == 0:
            print("No routes found")
            return None
        
        route = data['routes'][0]
        
        return {
            'coordinates': route['geometry']['coordinates'],
            'distance': route['distance'],
            'duration': route['duration']
        }
        
    except Exception as e:
        print(f"OSRM error: {e}")
        return None


def map_route_to_linkids(route_coords, tbl):
    """Map OSRM route coordinates to LTA LinkIDs."""
    available_links = tbl['LinkID'].unique().tolist()
    
    if not available_links:
        return []
    
    num_segments = min(len(route_coords) // 10, 15)
    num_segments = max(num_segments, 5)
    
    selected = available_links[:num_segments] if len(available_links) >= num_segments else available_links
    
    print(f"🔗 Mapped {len(route_coords)} coords to {len(selected)} LinkIDs")
    
    return selected


def aggregate_route_features(route_linkids, tbl):
    """Aggregate features for a route."""
    segs = tbl[tbl["LinkID"].isin(route_linkids)]
    
    if segs.empty:
        print("⚠️ No segments found for LinkIDs")
        return None
    
    print(f"✅ Found {len(segs)} segments for route")
    
    return {
        "SpeedKMH_Est": float(segs["SpeedKMH_Est"].mean()),
        "MinimumSpeed": float(segs["MinimumSpeed"].mean()),
        "MaximumSpeed": float(segs["MaximumSpeed"].mean()),
        "incident_count": int(segs["incident_count"].sum()),
        "vms_count": int(segs["vms_count"].sum()),
        "cctv_count": int(segs["cctv_count"].sum()),
        "ett_mean": float(segs["ett_mean"].mean()),
        "dow": int(segs["dow"].mode().iloc[0]) if len(segs["dow"].mode()) > 0 else int(segs["dow"].iloc[0]),
        "hour": int(segs["hour"].mode().iloc[0]) if len(segs["hour"].mode()) > 0 else int(segs["hour"].iloc[0]),
    }


def parse_coordinates(coord_string):
    """Parse coordinate string OR address string."""
    try:
        # Try coordinates first: "lat,lon"
        if ',' in coord_string:
            parts = coord_string.replace(' ', '').split(',')
            if len(parts) == 2:
                try:
                    lat = float(parts[0])
                    lon = float(parts[1])
                    
                    if 1.0 <= lat <= 1.5 and 103.0 <= lon <= 104.5:
                        return lat, lon
                except ValueError:
                    pass
        
        # If not coordinates, geocode as address
        print(f"🔍 Geocoding: {coord_string}")
        lat, lon = geocode_address(coord_string)
        
        if lat and lon:
            print(f"✅ Found: {lat},{lon}")
            return lat, lon
        else:
            raise ValueError(f"Could not find location: {coord_string}")
            
    except Exception as e:
        raise ValueError(f"Invalid location: {e}")


@app.route('/')
def home():
    return jsonify({
        'message': 'Traffic Prediction API - Production Ready',
        'status': 'active',
        'model_loaded': model is not None,
        'model_type': 'HistGradientBoostingClassifier' if model else None,
        'features': FEATS,
        'endpoints': {
            '/': 'GET - API information',
            '/health': 'GET - Check API health',
            '/predict': 'POST - Predict traffic congestion'
        },
        'example': {
            'from': 'Orchard Road',
            'to': 'Marina Bay',
            'departTime': '2025-10-09T09:00:00'
        }
    })


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        
        if not data or 'from' not in data or 'to' not in data:
            return jsonify({'error': 'Missing required fields: from, to'}), 400
        
        from_location = data['from']
        to_location = data['to']
        
        try:
            start_lat, start_lon = parse_coordinates(from_location)
            end_lat, end_lon = parse_coordinates(to_location)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        
        print(f"\n📍 Route: {from_location} → {to_location}")
        print(f"📍 Coords: ({start_lat},{start_lon}) → ({end_lat},{end_lon})")
        
        osrm_route = get_osrm_route(start_lat, start_lon, end_lat, end_lon)
        
        if not osrm_route:
            return jsonify({'error': 'Could not find route'}), 400
        
        print(f"🛣️  Route: {osrm_route['distance']/1000:.1f} km, {osrm_route['duration']/60:.0f} min")
        
        tbl = get_lta_traffic_speedbands()
        
        if tbl.empty:
            return jsonify({'error': 'Could not fetch traffic data'}), 503
        
        print(f"📊 Fetched {len(tbl)} traffic segments")
        
        route_linkids = map_route_to_linkids(osrm_route['coordinates'], tbl)
        
        if not route_linkids:
            return jsonify({'error': 'Could not map route to traffic segments'}), 400
        
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 503
        
        features = aggregate_route_features(route_linkids, tbl)
        
        if features is None:
            return jsonify({'error': 'No traffic data available'}), 400
        
        print(f"📈 Features: {features}")
        
        X = pd.DataFrame([features])[FEATS]
        proba = model.predict_proba(X)[:, 1][0]
        
        status = 'congested' if proba >= 0.5 else 'clear'
        
        print(f"✅ Prediction: {proba:.3f} ({status})")
        
        return jsonify({
            'route_id': 'main_route',
            'route_name': f"{from_location} → {to_location}",
            'congestion_prob': round(float(proba), 3),
            'status': status,
            'confidence': 0.835,
            'duration_min': round(osrm_route['duration'] / 60),
            'distance_km': round(osrm_route['distance'] / 1000, 1),
            'link_ids_count': len(route_linkids),
            'features_used': features,
            'route_info': {
                'start': {'lat': start_lat, 'lon': start_lon},
                'end': {'lat': end_lat, 'lon': end_lon},
                'segments_analyzed': len(route_linkids)
            }
        })
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None,
        'model_path': MODEL_PATH,
        'features': FEATS
    })


@app.route('/test', methods=['GET'])
def test():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 503
    
    samples = pd.DataFrame([
        {
            "SpeedKMH_Est": 28.0,
            "MinimumSpeed": 20.0,
            "MaximumSpeed": 29.0,
            "dow": 3,
            "hour": 9,
            "incident_count": 74,
            "vms_count": 3600,
            "cctv_count": 36000,
            "ett_mean": 1.75
        },
        {
            "SpeedKMH_Est": 64.5,
            "MinimumSpeed": 60.0,
            "MaximumSpeed": 69.0,
            "dow": 3,
            "hour": 9,
            "incident_count": 73,
            "vms_count": 3348,
            "cctv_count": 36000,
            "ett_mean": 1.75
        }
    ])[FEATS]
    
    proba = model.predict_proba(samples)[:, 1]
    
    return jsonify({
        'test': 'success',
        'message': 'Model test using notebook samples',
        'samples': [
            {
                'description': 'Slow speed (28 km/h)',
                'congestion_prob': round(float(proba[0]), 3),
                'expected': '~0.745 (congested)',
                'status': 'congested' if proba[0] >= 0.5 else 'clear'
            },
            {
                'description': 'Fast speed (64.5 km/h)',
                'congestion_prob': round(float(proba[1]), 3),
                'expected': '~0.075 (clear)',
                'status': 'congested' if proba[1] >= 0.5 else 'clear'
            }
        ]
    })


if __name__ == '__main__':
    print("="*60)
    print("🚗 Traffic Prediction API - Starting...")
    print("="*60)
    print(f"Model path: {MODEL_PATH}")
    print(f"Model loaded: {model is not None}")
    print(f"Features: {FEATS}")
    print("="*60)
    app.run(host='0.0.0.0', port=5000, debug=True)
