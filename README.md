# FarmDirect — Project Structure Guide

## Where to put each file in VS Code

```
farmdirect/                          ← root folder (open this in VS Code)
│
├── backend/
│   ├── server.py                    ← FastAPI backend (all API routes)
│   ├── requirements.txt             ← Python dependencies
│   └── tests/
│       └── test_farmdirect_api.py   ← pytest test suite (27 tests)
│
├── frontend/
│   ├── app.json                     ← Expo config
│   ├── package.json                 ← JS dependencies
│   │
│   ├── src/
│   │   ├── api.ts                   ← All API calls (fetch wrapper)
│   │   └── theme.ts                 ← Colors, spacing, fonts
│   │
│   └── app/                         ← Expo Router screens
│       ├── index.tsx                ← Welcome screen
│       ├── login.tsx                ← Login screen
│       ├── register.tsx             ← Register (2-step)
│       │
│       ├── onboarding/
│       │   └── select-type.tsx      ← Google login user type picker
│       │
│       ├── farmer/
│       │   ├── _layout.tsx          ← Farmer tab bar
│       │   ├── index.tsx            ← Add Produce
│       │   ├── my-produce.tsx       ← My Produce list
│       │   ├── orders.tsx           ← Incoming orders
│       │   └── earnings.tsx         ← Earnings + chart
│       │
│       ├── consumer/
│       │   ├── _layout.tsx          ← Consumer tab bar
│       │   ├── index.tsx            ← Browse produce
│       │   ├── orders.tsx           ← My orders
│       │   └── profile.tsx          ← Profile + logout
│       │
│       └── product/
│           └── [id].tsx             ← Product detail + Buy Now
│
└── memory/
    └── test_credentials.md          ← Test login credentials
```

## Setup Instructions

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npx expo start
```
Scan QR with Expo Go app on your phone, or press `w` for web.

### Run Tests
```bash
cd backend
pytest tests/test_farmdirect_api.py -v
```

## Notes
- The `BASE_URL` in `frontend/src/api.ts` points to your Emergent preview URL.
  Change it to `http://localhost:8000` when running the backend locally.
- Images are stored as base64 in MongoDB.
- All payments are Cash on Delivery (mocked).
