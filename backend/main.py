"""FastAPI server for weather trend forecasting."""

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pipeline import analyze_csv

app = FastAPI(title="Weather Trend Forecasting API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze(
    file: UploadFile = File(...),
    advanced_models: bool = Form(False),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        return JSONResponse(
            status_code=400,
            content={"detail": "Please upload a CSV file."},
        )

    content = await file.read()
    if len(content) == 0:
        return JSONResponse(status_code=400, content={"detail": "Uploaded file is empty."})

    try:
        result = analyze_csv(content, advanced_models=advanced_models)
        return result
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"detail": str(exc)})
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Analysis failed: {exc}"},
        )
