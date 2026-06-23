# Weather Trend Forecasting — Web App

[![Repository](https://img.shields.io/badge/GitHub-weather--trend--forcasting-blue)](https://github.com/abubakar7-codes/weather-trend-forcasting)

Test new **Global Weather Repository** CSV datasets through the same pipeline as `weather-trend-forecasting.ipynb`: cleaning, EDA, anomaly detection, and forecasting.

## Project structure

```
Weather Trend Forecasting/
├── weather-trend-forecasting.ipynb   # Original analysis notebook
├── backend/                          # FastAPI + pipeline
│   ├── main.py
│   ├── pipeline.py
│   └── requirements.txt
└── frontend/                         # React + Vite UI
    └── src/
```

## Quick start

### 1. Backend (Python)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Usage

1. Upload a CSV in **Global Weather Repository** format (same columns as the notebook).
2. Optionally enable **advanced models** (SARIMA, Prophet, XGBoost) — takes longer.
3. Click **Run analysis** to see:
   - Dataset shape and column mapping
   - Missing values and data preview
   - Model metrics (MAE, RMSE, MAPE, R²)
   - Daily temperature/precipitation trend
   - Forecast vs actual chart
   - Correlation matrix

## Expected CSV schema

Required columns (names are resolved flexibly):

| Logical field | Typical column name |
|---------------|---------------------|
| Datetime      | `last_updated`      |
| Temperature   | `temperature_celsius` |
| Country       | `country`           |
| Location      | `location_name`     |

Optional: `precip_mm`, `humidity`, `pressure_mb`, `wind_kph`, air quality fields, etc.

## Notes

- Basic analysis runs **Linear Regression** + naive baseline quickly.
- Advanced models need `statsmodels`, `prophet`, and `xgboost` installed (included in `requirements.txt`).
- Prophet can be slow on first run; SARIMA needs enough daily history (14+ unique dates).

## Deploy to GitHub

```bash
git clone https://github.com/abubakar7-codes/weather-trend-forcasting.git
cd weather-trend-forcasting
```

Then follow the Quick start steps above for backend and frontend.

## Live deployment (optional)

| Service | What to deploy | Notes |
|---------|----------------|-------|
| [Render](https://render.com) | `backend/` | Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| [Vercel](https://vercel.com) or [Netlify](https://netlify.com) | `frontend/` | Set build: `npm run build`, output: `dist` |
| Frontend API URL | Update `vite.config.ts` proxy or set `VITE_API_URL` to your Render backend URL |

The sample CSV (`GlobalWeatherRepository.csv`) is not in the repo due to size — upload your own file through the web UI.
