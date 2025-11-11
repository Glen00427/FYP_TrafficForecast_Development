!pip install supabase

import pandas as pd
import numpy as np
import requests
from sentence_transformers import SentenceTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics import classification_report, f1_score
from supabase import create_client, Client

# === Step 1. Supabase setup ===
SUPABASE_URL = "https://vxistpqjjavwykdsgeur.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4aXN0cHFqamF2d3lrZHNnZXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwODMzNTQsImV4cCI6MjA3NDY1OTM1NH0.2JfYXhZuL6wKEJMZV_LRcFgAr3xguLkgegxr5V7_u1Y"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# === Mapping / helper variables ===
severity_map = {"low": 7, "medium": 5, "high": 2}
type_map = {
    "accident": 1,
    "heavy traffic": 2,
    "obstacle": 3,
    "road block": 4,
    "roadwork": 5,
    "unattended vehicle": 6,
    "vehicle breakdown": 7
}
uncertainty_keywords = [
    "maybe", "not sure", "idk", "looks like", "i think",
    "heard", "reports say", "just saw", "someone said", "apparently", "rumour", "unconfirmed"
]
keyword_type_map = {
    "accident": "Accident",
    "accid": "Accident",
    "car vs motor": "Accident",
    "pile-up": "Road Block",
    "blocked": "Road Block",
    "something blocking the road": "Road Block",
    "roadwork": "Roadwork",
    "lorry tipped over": "Vehicle breakdown",
    "vehicle": "Unattended Vehicle",
    "unattended vehicle": "Unattended Vehicle",
    "breakdown": "Vehicle breakdown",
    "stalled": "Vehicle breakdown",
    "slow moving traffic": "Heavy Traffic",
    "traffic crawling": "Heavy Traffic",
    "jam": "Heavy Traffic",
    "school pickup": "Obstacle",
    "police lights": "Obstacle",
    "smoke": "Obstacle"
}

# === LTA TrafficSpeedBands fetch ===
ACCOUNT_KEY = "orxOhzCKSY+kXRrlIyWWrQ=="
BASE_URL = "https://datamall2.mytransport.sg/ltaodataservice/v4/TrafficSpeedBands"

def get_live_speed(road_name):
    headers = {"AccountKey": ACCOUNT_KEY, "accept": "application/json"}
    try:
        resp = requests.get(BASE_URL, headers=headers)
        data = resp.json().get("value", [])
        for entry in data:
            if road_name.lower() in entry["RoadName"].lower():
                return entry["SpeedBand"]
        return None
    except Exception as e:
        print("⚠️ Error fetching LTA data:", e)
        return None

# === Infer type from message ===
def infer_type_from_message(msg, default_type="Heavy Traffic"):
    msg_lower = msg.lower()
    for keyword, typ in keyword_type_map.items():
        if keyword in msg_lower:
            return typ
    return default_type

# === Fetch incidents from Supabase with batching ===
def fetch_supabase_incidents(batch_size=1000):
    offset = 0
    all_data = []
    while True:
        response = supabase.table("incidents_duplicate").select("*").range(offset, offset + batch_size - 1).execute()
        data = response.data
        if not data:
            break
        all_data.extend(data)
        offset += batch_size

    df = pd.DataFrame(all_data)

    # Feature engineering
    df["speed_band"] = df["severity"].str.lower().map(severity_map).fillna(5)
    df["type_score"] = df["type"].str.lower().map(type_map).fillna(0)
    df["type_match_score"] = df.apply(
        lambda x: 1 if infer_type_from_message(x["message"]).lower() == x["type"].lower() else 0, axis=1
    )
    df["uncertainty_score"] = df["message"].apply(
        lambda msg: sum(word in msg.lower() for word in uncertainty_keywords) / len(uncertainty_keywords)
    )
    return df

# === Encode text messages ===
model_text = SentenceTransformer("all-MiniLM-L6-v2")

# === Load data ===
df = fetch_supabase_incidents()
print("Fetched incidents:", len(df))
print(df.head())

# === Feature engineering ===
text_embeddings = model_text.encode(df["message"].tolist())
numeric_features = df[["speed_band", "type_score", "type_match_score", "uncertainty_score"]].values

# === Labels ===
le = LabelEncoder()
labels = le.fit_transform(df["label"])  # 'verified' / 'false'

# === Train/test split ===
X_train_idx, X_test_idx, y_train, y_test = train_test_split(
    np.arange(len(df)), labels, test_size=0.3, random_state=42, stratify=labels
)

# === Train RandomForest with cross-validation (no leakage) ===
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = []

for train_idx, val_idx in cv.split(text_embeddings, labels):
    svd_cv = TruncatedSVD(n_components=100, random_state=42)
    svd_cv.fit(text_embeddings[train_idx])

    X_train_cv = np.hstack([
        svd_cv.transform(text_embeddings[train_idx]),
        numeric_features[train_idx]
    ])

    X_val_cv = np.hstack([
        svd_cv.transform(text_embeddings[val_idx]),
        numeric_features[val_idx]
    ])

    clf_cv = RandomForestClassifier(n_estimators=150, max_depth=15, min_samples_leaf=5, random_state=42)
    clf_cv.fit(X_train_cv, labels[train_idx])

    val_pred = clf_cv.predict(X_val_cv)
    cv_scores.append(f1_score(labels[val_idx], val_pred, average="weighted"))

cv_scores = np.array(cv_scores)
print("5-Fold CV weighted F1 scores:", cv_scores)
print("Mean F1 score:", cv_scores.mean())

# === Hold-out evaluation ===
svd_eval = TruncatedSVD(n_components=100, random_state=42)
svd_eval.fit(text_embeddings[X_train_idx])

X_train_eval = np.hstack([
    svd_eval.transform(text_embeddings[X_train_idx]),
    numeric_features[X_train_idx]
])

X_test_eval = np.hstack([
    svd_eval.transform(text_embeddings[X_test_idx]),
    numeric_features[X_test_idx]
])

clf_eval = RandomForestClassifier(n_estimators=150, max_depth=15, min_samples_leaf=5, random_state=42)
clf_eval.fit(X_train_eval, y_train)

y_pred = clf_eval.predict(X_test_eval)

report = classification_report(
    y_test,
    y_pred,
    target_names=le.classes_,
    digits=2
)

print("=== Model Evaluation (Hold-out) ===")
print(report)

# === Train final model on full dataset for inference ===
svd = TruncatedSVD(n_components=100, random_state=42)
svd.fit(text_embeddings)

features_full = np.hstack([
    svd.transform(text_embeddings),
    numeric_features
])

clf = RandomForestClassifier(n_estimators=150, max_depth=15, min_samples_leaf=5, random_state=42)
clf.fit(features_full, labels)
print("✅ Model trained on full dataset for inference.")

# === Analyze new report ===
def analyze_report(description, road_name, incident_type, live_speed=None):
    # Fetch live speed from LTA if not provided
    if live_speed is None:
        live_speed = get_live_speed(road_name) or 5

    emb = model_text.encode([description])
    emb_reduced = svd.transform(emb)

    type_match = 1 if infer_type_from_message(description).lower() == incident_type.lower() else 0
    uncertainty = sum(word in description.lower() for word in uncertainty_keywords) / len(uncertainty_keywords)

    feat = np.hstack([emb_reduced, [[live_speed, type_map.get(incident_type.lower(), 0), type_match, uncertainty]]])
    pred = clf.predict(feat)
    proba = clf.predict_proba(feat)[0]
    authenticity = le.inverse_transform(pred)[0]
    conf = {cls: round(prob, 2) for cls, prob in zip(le.classes_, proba)}

    print("\n=== 🚗 Report Analysis ===")
    print("Description:", description)
    print("Road:", road_name)
    print("Incident Type:", incident_type)
    print("Live SpeedBand:", live_speed)
    print("Predicted authenticity:", authenticity)
    print("Confidence:", conf)

    if live_speed <= 3 and authenticity == "verified":
        print("✅ Incident aligns with real congestion data.")
    elif live_speed >= 7 and authenticity == "verified":
        print("⚠️ Possible false alarm: road is clear despite report.")
    elif authenticity == "false":
        print("⚠️ Report seems unreliable.")
    else:
        print("ℹ️ No major red flags.")

def fetch_road_names():
    headers = {"AccountKey": ACCOUNT_KEY, "accept": "application/json"}
    try:
        resp = requests.get(BASE_URL, headers=headers)
        data = resp.json().get("value", [])

        # Extract unique road names
        road_names = list({entry["RoadName"] for entry in data})
        return road_names

    except Exception as e:
        print("⚠️ Error fetching LTA data:", e)
        return []

# Example usage
roads = fetch_road_names()
print("Roads from LTA API:", roads)

# === Generate sample test incidents ===
import random

road_names = fetch_road_names()
sample_incidents = []

# Pick 5 random roads to create test incidents
for road in random.sample(road_names, min(5, len(road_names))):
    # Create a sample description first
    description = f"Reported heavy traffic on {road} causing delays."

    # 85% of the time, infer type from description
    if random.random() < 0.85:
        incident_type = infer_type_from_message(description).lower()
    else:
        # 15% random
        incident_type = random.choice(["accident", "heavy traffic", "obstacle", "roadwork"])

    sample_incidents.append((description, road, incident_type))

# === Analyze sample incidents ===
for description, road_name, incident_type in sample_incidents:
    analyze_report(
        description=description,
        road_name=road_name,
        incident_type=incident_type
    )