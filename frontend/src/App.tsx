import { useCallback, useState } from "react";
import { UploadPanel, DatasetOverview, PreviewTable } from "./components/UploadPanel";
import {
  ModelResults,
  ForecastChart,
  DailyTrendChart,
  CorrelationHeatmap,
  MissingValues,
} from "./components/Results";
import { IsobarBackground } from "./components/IsobarBackground";
import { ErrorIcon } from "./components/ui";
import type { AnalysisResult } from "./types";

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="section-divider" role="separator">
      <span>{label}</span>
    </div>
  );
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const onAnalyze = useCallback(async (file: File, advanced: boolean) => {
    setLoading(true);
    setApiError(null);
    setResult(null);

    const form = new FormData();
    form.append("file", file);
    form.append("advanced_models", String(advanced));

    try {
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setApiError(
          typeof data.detail === "string"
            ? data.detail
            : "The analysis could not be completed. Check your CSV format and try again."
        );
        return;
      }
      setResult(data as AnalysisResult);
    } catch {
      setApiError(
        "Could not reach the analysis server. Make sure the backend is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="app">
      <IsobarBackground>
        <header className="hero">
          <div className="hero-eyebrow">Atmospheric observatory</div>
          <h1>Weather Trend Forecasting</h1>
          <p>
            Upload a Global Weather Repository CSV to run the same cleaning, EDA,
            anomaly detection, and forecasting pipeline from your notebook — without
            re-running cells manually.
          </p>
          <div className="feature-pills" aria-label="Pipeline features">
            <span className="feature-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="9" />
              </svg>
              Data cleaning
            </span>
            <span className="feature-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 17l6-6 4 4 8-10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              EDA &amp; correlation
            </span>
            <span className="feature-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Anomaly detection
            </span>
            <span className="feature-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 17c3-4 6-10 9-10s6 6 9 10" strokeLinecap="round" />
              </svg>
              Forecasting models
            </span>
          </div>
        </header>
      </IsobarBackground>

      <UploadPanel
        onAnalyze={onAnalyze}
        loading={loading}
        selectedFile={selectedFile}
        onFileSelect={setSelectedFile}
      />

      {apiError && (
        <div className="error-banner" role="alert">
          <ErrorIcon />
          <div>
            <div className="error-banner-title">Analysis failed</div>
            <div>{apiError}</div>
          </div>
        </div>
      )}

      {result && (
        <>
          {result.errors.length > 0 && (
            <div className="error-banner" role="alert">
              <ErrorIcon />
              <div>
                <div className="error-banner-title">Partial results — some steps failed</div>
                {result.errors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            </div>
          )}

          <SectionDivider label="Dataset summary" />
          <DatasetOverview data={result} />
          <PreviewTable rows={result.preview} />
          <MissingValues data={result} />

          {result.forecasting && (
            <>
              <SectionDivider label="Forecasting results" />
              <ModelResults data={result} />
              <DailyTrendChart data={result} />
              <ForecastChart data={result} />
            </>
          )}

          {result.eda && (
            <>
              <SectionDivider label="Exploratory analysis" />
              <CorrelationHeatmap data={result} />
            </>
          )}
        </>
      )}

      {!result && !loading && !apiError && (
        <div className="card empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M4 14h16l-2 6H6l-2-6z" strokeLinejoin="round" />
            <path d="M8 14V8a4 4 0 018 0v6" strokeLinecap="round" />
          </svg>
          <p>
            Upload a CSV and click <strong>Run analysis</strong> to see dataset
            overview, forecasts, and correlation charts here.
          </p>
        </div>
      )}
    </div>
  );
}
