# codestrom

## MediResQ - AI Clinical Support, Medicine Finder & Emergency-First Healthcare System

MediResQ is a fast, reliable, AI-assisted healthcare navigation and emergency-priority platform.

### Architecture
- **Frontend**: React + Vite + Tailwind CSS + Lucide Icons
- **Backend**: Node.js + Express + MongoDB (Mongoose) + Geospatial Indexing
- **AI Services**: Python 3.12 + FastAPI + Pydantic + Uvicorn
- **Triage**: WHO 4-tier Emergency Screening Protocol (RED / YELLOW / GREEN / UNKNOWN)

### Getting Started

#### 1. Backend (Node.js)
```bash
cd codestrom/backend
npm install
npm run dev
```

#### 2. AI Services (FastAPI)
```bash
cd codestrom/ai_services
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m uvicorn main:app --port 8000 --reload
```

#### 3. Frontend (React)
```bash
cd codestrom/frontend
npm install
npm run dev
```
