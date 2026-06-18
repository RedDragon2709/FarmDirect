# FarmDirect

A farm-to-consumer direct marketplace with AI-assisted price suggestions. Farmers list produce, consumers browse and order, and an ML model trained on APMC mandi data suggests fair prices.

---

## Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**

---

### 1. Backend API

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The database is created automatically on first run. No setup needed.

---

### 2. ML Pricing Service

```bash
cd ml_service
pip install -r requirements-ml.txt
python run.py
```

The pre-trained model is included in the repo. It starts immediately — no retraining required.

---

### 3. Frontend

```bash
cd frontend
npm install
npx expo start --clear
```

Scan the QR code with **Expo Go** on your phone, or press `w` for web.

---

### One-Command Start (Windows)

Run everything at once from the project root:

```powershell
.\start-dev.ps1
```

This opens three terminal windows — one for each service.

---

## Project Structure

```
farmdirect/
├── backend/          ← FastAPI REST API (port 8000)
│   ├── server.py     ← All API routes
│   └── requirements.txt
│
├── ml_service/       ← ML price prediction service (port 8001)
│   ├── ml_server.py  ← FastAPI prediction endpoint
│   ├── run.py        ← Start script (skips training if model exists)
│   └── models/       ← Pre-trained XGBoost model + encoders
│
├── frontend/         ← React Native app (Expo)
│   ├── app/          ← Screens (Expo Router)
│   └── src/          ← API client, theme, utilities
│
└── start-dev.ps1     ← One-command dev launcher (Windows)
```

---

## API Endpoints

| Service | URL |
|---------|-----|
| Backend API | http://localhost:8000 |
| ML Pricing | http://localhost:8001 |
| API Docs | http://localhost:8000/docs |
