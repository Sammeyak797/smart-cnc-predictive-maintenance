# 🏭 Smart CNC Predictive Maintenance System

A full-stack, AI-powered predictive maintenance platform for CNC machine fleets. The system uses a Random Forest machine learning model trained on real industrial sensor data to predict equipment failures before they happen, calculate Remaining Useful Life (RUL), generate maintenance work orders, and alert engineers in real time.

**🌐 Live Demo:** [smart-cnc-predictive-maintenance.vercel.app](https://smart-cnc-predictive-maintenance.vercel.app)
**⚙️ Backend API:** [cnc-backend-ibzu.onrender.com](https://cnc-backend-ibzu.onrender.com)
**📦 Repository:** [github.com/Sammeyak797/smart-cnc-predictive-maintenance](https://github.com/Sammeyak797/smart-cnc-predictive-maintenance)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [ML Model](#ml-model)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Getting Started (Local)](#getting-started-local)
- [Environment Variables](#environment-variables)
- [Running Tests](#running-tests)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment](#deployment)
- [Screenshots](#screenshots)

---

## Overview

Traditional CNC maintenance is either **reactive** (fix after failure — expensive downtime) or **scheduled** (fix at fixed intervals — wasteful). This system enables **predictive maintenance** — using live sensor readings and a trained ML model to tell engineers _exactly when_ a machine needs attention, before it fails.

Each machine continuously reports six sensor readings. The system runs them through a Random Forest classifier every 3 seconds, produces a failure prediction, calculates a Remaining Useful Life (RUL) score (0–100), and surfaces everything in a real-time dashboard with alerts and automated work order creation.

---

## Features

### 🤖 Machine Learning

- **Failure prediction** across 5 failure types: Heat Dissipation, Power Failure, Overstrain, Tool Wear, and Random Failures
- **Confidence scoring** — every prediction includes how sure the model is (0–100%)
- **Multi-factor RUL** — Remaining Useful Life calculated from tool wear (55%), torque (20%), process temperature (15%), and RPM (10%)
- **Maintenance prioritisation** — URGENT / SCHEDULE SOON / OK based on confidence + RUL

### 📊 Dashboard

- **Real-time KPI cards** — failure type, confidence, RUL progress bar, priority
- **Live sensor trends** — RPM and tool wear charts, persisted to MongoDB so they survive page refreshes
- **Machine fleet cards** — status indicators for every CNC machine (Running / Idle / Failure)
- **Tabbed panel** — Insights, Work Orders, and Alerts in one view
- **Failure Analysis card** — AI-generated possible cause, recommendation, and severity

### 🔔 Alerts & Work Orders

- **Smart deduplication** — only one active alert per machine at a time, preventing spam
- **Auto work order creation** — generated automatically when a new failure condition is detected
- **Engineer assignment** — assign engineers to work orders directly from the dashboard
- **Work order lifecycle** — PENDING → IN_PROGRESS → COMPLETED

### 📈 Analytics

- **Maintenance history** — every simulation tick writes a timestamped record, building a full audit trail
- **Failure distribution chart** — breakdown of predicted failure types over time
- **Historical sensor trends** — RPM and tool wear trends pulled from the database
- **PDF report download** — generate and download a full diagnostic report for any machine

### 🚀 Other

- **Fleet Comparison page** — side-by-side RUL, status, and sensor snapshot for all machines
- **Responsive design** — works on mobile and desktop, including a slide-in drawer sidebar on mobile
- **Dark mode** — full dark/light toggle persisted in localStorage
- **JWT authentication** — login/register with token-based auth on every protected route

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                           │
│                                                                 │
│   React 18 + Vite + Tailwind CSS                                │
│   ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────────┐  │
│   │Dashboard │ │Analytics │ │WorkOrders │ │FleetComparison  │  │
│   └────┬─────┘ └────┬─────┘ └─────┬─────┘ └────────┬────────┘  │
│        └────────────┴─────────────┴────────────────┘            │
│                           │ Axios HTTP                          │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│              FLASK REST API  (Render.com)                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Route Blueprints                      │   │
│  │  /auth  /machines  /simulate  /analytics  /alerts       │   │
│  │  /workorders  /report  /predict                         │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                     │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │                    Service Layer                         │   │
│  │                                                          │   │
│  │  simulation_engine.py   → generates sensor readings      │   │
│  │  maintenance_engine.py  → calculates RUL, priority       │   │
│  │  failure_analysis_engine.py → produces cause + fix       │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                     │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │                    ML Model Layer                        │   │
│  │                                                          │   │
│  │  model.pkl      → Random Forest Classifier               │   │
│  │  le_type.pkl    → LabelEncoder for machine type          │   │
│  │  le_failure.pkl → LabelEncoder for failure classes       │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              MongoDB Atlas  (Cloud Database)                    │
│                                                                 │
│  Collections:                                                   │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │ users               │  │ machines                        │   │
│  │ predictions         │  │ maintenance_records (workorders)│   │
│  │ maintenance_history │  │ alerts                          │   │
│  └─────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow (Simulation Tick)

```
Browser (every 3s)
    │
    ▼
POST /api/simulate/ { machine_id: "CNC-01" }
    │
    ├─ 1. generate_sensor_data()      → fetches machine from DB,
    │                                   increments tool_wear, returns sensor dict
    │
    ├─ 2. predict_failure()           → encodes inputs, runs Random Forest,
    │                                   returns { failure_type, confidence }
    │
    ├─ 3. analyze_failure()           → rule-based engine maps sensor values
    │                                   to human-readable cause + recommendation
    │
    ├─ 4. calculate_rul()             → weighted multi-factor formula → 0–100
    │
    ├─ 5. determine_maintenance()     → priority logic based on confidence + RUL
    │
    ├─ 6. Write to predictions_collection        (every tick)
    ├─ 7. Write to maintenance_history_collection (every tick)
    ├─ 8. Conditionally write to alerts_collection (URGENT only, no duplicate)
    ├─ 9. Conditionally write to maintenance_collection (no open order exists)
    │
    └─ 10. Return JSON response to browser
```

---

## Tech Stack

### Frontend

| Technology                 | Version | Purpose                   |
| -------------------------- | ------- | ------------------------- |
| React                      | 18      | UI framework              |
| Vite                       | 5       | Build tool and dev server |
| Tailwind CSS               | 3       | Utility-first styling     |
| React Router               | 6       | Client-side routing       |
| Axios                      | 1.x     | HTTP client               |
| Chart.js + react-chartjs-2 | 4.x     | Trend charts              |
| react-hot-toast            | 2.x     | Toast notifications       |

### Backend

| Technology   | Version | Purpose                          |
| ------------ | ------- | -------------------------------- |
| Python       | 3.11    | Language                         |
| Flask        | 3.x     | Web framework                    |
| Flask-CORS   | 4.x     | Cross-origin resource sharing    |
| PyMongo      | 4.x     | MongoDB driver                   |
| scikit-learn | 1.x     | ML model (Random Forest)         |
| joblib       | 1.x     | Model serialisation (.pkl files) |
| PyJWT        | 2.x     | JSON Web Tokens for auth         |
| bcrypt       | 4.x     | Password hashing                 |
| ReportLab    | 4.x     | PDF report generation            |
| gunicorn     | 21.x    | Production WSGI server           |

### Database & Infrastructure

| Technology     | Purpose                              |
| -------------- | ------------------------------------ |
| MongoDB Atlas  | Cloud database (6 collections)       |
| Vercel         | Frontend hosting (CDN, auto HTTPS)   |
| Render         | Backend hosting (Python web service) |
| GitHub Actions | CI/CD pipeline                       |

### Testing

| Technology             | Purpose                            |
| ---------------------- | ---------------------------------- |
| Vitest                 | Frontend unit + component tests    |
| @testing-library/react | React component rendering in tests |
| pytest                 | Backend unit + integration tests   |
| pytest-flask           | Flask test client integration      |

---

## ML Model

### Dataset

- **Source:** AI4I 2020 Predictive Maintenance Dataset
- **File:** `backend/data/predictive_maintenance.csv`
- **Size:** 10,000 rows, 14 features
- **Target:** 6 failure classes

### Class Distribution (Imbalanced)

| Failure Type             | Count | %     |
| ------------------------ | ----- | ----- |
| No Failure               | 9,652 | 96.5% |
| Heat Dissipation Failure | 112   | 1.1%  |
| Power Failure            | 95    | 0.9%  |
| Overstrain Failure       | 78    | 0.8%  |
| Tool Wear Failure        | 45    | 0.5%  |
| Random Failures          | 18    | 0.2%  |

### Model Details

- **Algorithm:** Random Forest Classifier
- **Trees:** 200 estimators
- **Max Depth:** 15
- **Class Weighting:** `balanced` (compensates for the 96.5% "No Failure" majority)
- **Stratified Split:** 80% train / 20% test, stratified by class
- **Feature Columns:** Type, Air Temperature, Process Temperature, RPM, Torque, Tool Wear

### RUL Formula

```
RUL = (1 - degradation_score) × 100

Where degradation_score =
    0.55 × (tool_wear / 253)          ← primary factor
  + 0.20 × (torque / 80)             ← mechanical stress
  + 0.15 × (process_temp - 295) / 37 ← thermal stress above ambient
  + 0.10 × (rpm / 3000)              ← speed factor

Result clamped to [0, 100]
```

### Training

```bash
cd backend
python model/train.py
```

This saves three files to `backend/model/`:

- `model.pkl` — the trained classifier
- `le_type.pkl` — LabelEncoder for machine type (L/M/H)
- `le_failure.pkl` — LabelEncoder for failure class names

---

## Project Structure

```
smart-cnc-predictive-maintenance/
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml              ← GitHub Actions CI/CD pipeline
│
├── frontend/                      ← React + Vite application
│   ├── public/
│   │   └── vite.svg
│   ├── src/
│   │   ├── assets/
│   │   ├── components/            ← Reusable UI components
│   │   │   ├── __tests__/         ← Component unit tests
│   │   │   ├── AlertPanel.jsx
│   │   │   ├── FailureChart.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── MachineControl.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── SummaryCards.jsx
│   │   │   ├── TrendChart.jsx
│   │   │   └── WorkOrderTable.jsx
│   │   ├── context/
│   │   │   └── AppContext.jsx     ← Global state (selected machine, simulation)
│   │   ├── pages/                 ← Route-level page components
│   │   │   ├── Analytics.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── MachineCompare.jsx
│   │   │   └── WorkOrders.jsx
│   │   ├── services/
│   │   │   └── api.js             ← Axios instance with auth interceptor
│   │   ├── test/
│   │   │   └── setup.js           ← Vitest + Testing Library setup
│   │   ├── utils/
│   │   ├── App.jsx                ← Router + layout wrapper
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── backend/                       ← Flask REST API
│   ├── data/
│   │   └── predictive_maintenance.csv   ← Training dataset
│   ├── database/
│   │   └── db.py                  ← MongoDB client + collection handles
│   ├── middleware/
│   │   └── auth_middleware.py     ← JWT token_required decorator
│   ├── model/
│   │   ├── generate_synthetic_data.py
│   │   ├── le_failure.pkl         ← Trained LabelEncoder (failure types)
│   │   ├── le_type.pkl            ← Trained LabelEncoder (machine types)
│   │   ├── model.pkl              ← Trained Random Forest model
│   │   ├── predict.py             ← Inference function
│   │   └── train.py               ← Training script
│   ├── routes/
│   │   ├── alert_routes.py
│   │   ├── analytics_routes.py
│   │   ├── auth_routes.py
│   │   ├── machine_routes.py
│   │   ├── predict_routes.py
│   │   ├── report_routes.py
│   │   ├── simulate_routes.py
│   │   └── workorder_routes.py
│   ├── services/
│   │   ├── failure_analysis_engine.py   ← Rule-based cause + recommendation
│   │   ├── maintenance_engine.py        ← RUL calculation + priority logic
│   │   └── simulation_engine.py         ← Sensor data generation
│   ├── tests/
│   │   ├── conftest.py            ← Shared fixtures + MongoDB mock
│   │   ├── test_auth.py
│   │   └── test_routes.py
│   ├── .env                       ← Local environment variables (not committed)
│   ├── app.py                     ← Flask app factory + blueprint registration
│   ├── config.py                  ← Configuration class (reads from .env)
│   ├── pytest.ini                 ← Pytest configuration
│   ├── requirements.txt           ← Production dependencies
│   ├── requirements-dev.txt       ← Development + testing dependencies
│   ├── seed_machines.py           ← Seeds the machines collection
│   └── test_predict.py            ← Manual prediction test script
│
├── .gitignore
└── README.md                      ← You are here
```

---

## API Reference

All endpoints are prefixed with `/api`. Protected endpoints require:

```
Authorization: Bearer <jwt_token>
```

### Auth

| Method | Endpoint         | Body                     | Description              |
| ------ | ---------------- | ------------------------ | ------------------------ |
| POST   | `/auth/register` | `{ username, password }` | Register a new user      |
| POST   | `/auth/login`    | `{ username, password }` | Login, returns JWT token |

### Machines

| Method | Endpoint            | Auth | Description                                               |
| ------ | ------------------- | ---- | --------------------------------------------------------- |
| GET    | `/machines/`        | ✅   | List all machines                                         |
| GET    | `/machines/compare` | ✅   | Fleet comparison snapshot (latest prediction per machine) |

### Simulation

| Method | Endpoint     | Body             | Description                                                                                           |
| ------ | ------------ | ---------------- | ----------------------------------------------------------------------------------------------------- |
| POST   | `/simulate/` | `{ machine_id }` | Run one simulation tick. Returns sensor data, prediction, RUL, maintenance info, and failure analysis |

### Analytics

| Method | Endpoint                 | Query                 | Description                     |
| ------ | ------------------------ | --------------------- | ------------------------------- |
| GET    | `/analytics/summary`     | `machine_id`          | Failure type counts (for chart) |
| GET    | `/analytics/maintenance` | `machine_id`, `limit` | Maintenance history records     |
| GET    | `/analytics/trends`      | `machine_id`, `limit` | RPM + tool wear time series     |
| GET    | `/analytics/predictions` | `machine_id`          | Raw prediction records          |

### Alerts & Work Orders

| Method | Endpoint               | Description                                 |
| ------ | ---------------------- | ------------------------------------------- |
| GET    | `/alerts/`             | All active alerts                           |
| POST   | `/alerts/acknowledge`  | `{ machine_id }` — acknowledge active alert |
| GET    | `/workorders/`         | All work orders                             |
| POST   | `/workorders/assign`   | `{ work_order_id, engineer }`               |
| POST   | `/workorders/complete` | `{ work_order_id }`                         |

### Report

| Method | Endpoint   | Body                                | Description                      |
| ------ | ---------- | ----------------------------------- | -------------------------------- |
| POST   | `/report/` | `{ machine_id, ...simulationData }` | Generate and return a PDF report |

---

## Getting Started (Local)

### Prerequisites

- Node.js 20+
- Python 3.11+
- MongoDB (local) or MongoDB Atlas account
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Sammeyak797/smart-cnc-predictive-maintenance.git
cd smart-cnc-predictive-maintenance
```

### 2. Set up the backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure backend environment

Create a `.env` file in the `backend/` folder:

```env
MONGO_URI=mongodb://localhost:27017/predictive_maintenance_db
JWT_SECRET=your-super-secret-key-minimum-32-characters
FLASK_DEBUG=true
FRONTEND_ORIGIN=http://localhost:5173
JWT_EXPIRATION=24
```

### 4. Train the ML model

```bash
# Still inside backend/ with venv active
python model/train.py
```

This creates `model.pkl`, `le_type.pkl`, and `le_failure.pkl` in `backend/model/`.

### 5. Seed the machines collection

```bash
python seed_machines.py
```

### 6. Start the backend

```bash
python app.py
# API is now running at http://localhost:5000
```

### 7. Set up the frontend

```bash
# In a new terminal
cd frontend
npm install
```

Create a `.env` file in the `frontend/` folder:

```env
VITE_API_URL=http://localhost:5000/api
```

### 8. Start the frontend

```bash
npm run dev
# App is now running at http://localhost:5173
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable          | Description                                      | Example                        |
| ----------------- | ------------------------------------------------ | ------------------------------ |
| `MONGO_URI`       | MongoDB connection string                        | `mongodb://localhost:27017/db` |
| `JWT_SECRET`      | Secret key for signing JWT tokens (min 32 chars) | `my-secret-key-abc-xyz-2025`   |
| `JWT_EXPIRATION`  | Token expiry in hours                            | `24`                           |
| `FLASK_DEBUG`     | Enable Flask debug mode                          | `true` / `false`               |
| `FRONTEND_ORIGIN` | Allowed CORS origin                              | `http://localhost:5173`        |

### Frontend (`frontend/.env`)

| Variable       | Description               | Example                     |
| -------------- | ------------------------- | --------------------------- |
| `VITE_API_URL` | Base URL of the Flask API | `http://localhost:5000/api` |

> ⚠️ Never commit `.env` files. They are listed in `.gitignore`.

---

## Running Tests

### Backend tests

```bash
cd backend
# Activate your venv first
venv\Scripts\activate       # Windows
source venv/bin/activate    # macOS/Linux

pytest
```

Runs all tests in `backend/tests/`. MongoDB is automatically mocked via `conftest.py` — no real database needed.

Expected output:

```
tests/test_auth.py   ........   [ 53%]
tests/test_routes.py .......   [100%]
15 passed in X.XXs
```

### Frontend tests

```bash
cd frontend
npm test          # watch mode (for development)
npm test -- --run # run once and exit (used in CI)
```

### Run everything at once (from repo root)

```bash
# Backend
cd backend && pytest && cd ..

# Frontend
cd frontend && npm test -- --run && cd ..
```

---

## CI/CD Pipeline

The GitHub Actions workflow at `.github/workflows/ci-cd.yml` runs automatically:

```
Pull Request opened/updated
        │
        ├─── 🐍 Backend Tests ──────────────────────► Pass or Fail
        │        Install Python deps
        │        Mock MongoDB via conftest.py
        │        Run pytest
        │
        └─── ⚛️ Frontend Tests ─────────────────────► Pass or Fail
                 Install Node deps                         │
                 Run Vitest                                │
                           │                              │
                           ▼ (frontend tests pass)        │
                    🔨 Build Frontend                      │
                         npm run build                     │
                                                          │
Push to main (PR merged)                                  │
        │  (all three jobs above must pass first)         │
        ▼                                                  │
   🚀 Deploy                                              │
        ├─ Deploy frontend → Vercel (vercel CLI)          │
        └─ Trigger backend → Render (deploy hook)         │
```

### GitHub Secrets Required

| Secret                   | Where to get it                                   |
| ------------------------ | ------------------------------------------------- |
| `VERCEL_TOKEN`           | vercel.com → Account Settings → Tokens            |
| `VITE_API_URL`           | Your Render backend URL + `/api`                  |
| `RENDER_DEPLOY_HOOK_URL` | Render dashboard → Service Settings → Deploy Hook |

---

## Deployment

### Frontend — Vercel

| Setting              | Value                                                    |
| -------------------- | -------------------------------------------------------- |
| Framework            | Vite                                                     |
| Root Directory       | `frontend`                                               |
| Build Command        | `npm run build`                                          |
| Output Directory     | `dist`                                                   |
| Environment Variable | `VITE_API_URL=https://cnc-backend-ibzu.onrender.com/api` |

### Backend — Render

| Setting               | Value                                                             |
| --------------------- | ----------------------------------------------------------------- |
| Runtime               | Python 3                                                          |
| Root Directory        | `backend`                                                         |
| Build Command         | `pip install -r requirements.txt`                                 |
| Start Command         | `gunicorn app:app`                                                |
| Environment Variables | `MONGO_URI`, `JWT_SECRET`, `FLASK_DEBUG=false`, `FRONTEND_ORIGIN` |

> **Free tier note:** Render's free tier spins down after 15 minutes of inactivity. The first request after a spin-down takes 30–60 seconds. Add [UptimeRobot](https://uptimerobot.com) (free) to ping the backend every 14 minutes and keep it awake.

---

## Screenshots

| Dashboard                                    | Analytics                                 | Fleet Comparison                   |
| -------------------------------------------- | ----------------------------------------- | ---------------------------------- |
| Live KPI cards, machine fleet, sensor trends | Maintenance history, failure distribution | Side-by-side machine health scores |

| Work Orders                    | Mobile View                  | Dark Mode               |
| ------------------------------ | ---------------------------- | ----------------------- |
| Assign engineers, track status | Responsive drawer navigation | Full dark theme support |

---

## Author

**Sammeyak797**

- GitHub: [@Sammeyak797](https://github.com/Sammeyak797)
- Project: [smart-cnc-predictive-maintenance](https://github.com/Sammeyak797/smart-cnc-predictive-maintenance)

---

## License

This project is open source and available under the [MIT License](LICENSE).
