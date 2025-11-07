# Admin AI Analysis Service

This folder contains a small Flask micro-service that powers the **AI Analysis**
modal in the admin console.  The service intentionally lives inside the
`admin-frontend/` workspace so we do not have to touch the driver-oriented
code paths.

## Running locally

```bash
cd admin-frontend/server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The API listens on `http://localhost:5000` by default.  When the React app is
running the modal will automatically call `POST /ai-analysis`.

## Endpoints

| Method | Path          | Description                              |
| ------ | ------------- | ---------------------------------------- |
| GET    | `/health`     | Lightweight readiness check              |
| POST   | `/ai-analysis`| Runs heuristic scoring on an incident    |

## Development notes

- The rule-based logic lives in `analyzer.py`.  It uses heuristics to produce
  scores, red flags, and recommendations so that we can iterate without large
  ML dependencies.
- Feel free to adjust the heuristic keywords or scoring weights to better fit
  the production dataset.
- Tests can simply call `AIReportAnalyzer.analyse()` with incident dictionaries
  to validate edge cases.
