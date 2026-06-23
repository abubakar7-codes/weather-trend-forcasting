import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisResult } from "../types";
import { BarometerGauge } from "./BarometerGauge";
import {
  CardTitle,
  ErrorIcon,
  UploadTrayIcon,
  formatFileSize,
  validateCsvFile,
} from "./ui";

interface Props {
  onAnalyze: (file: File, advanced: boolean) => Promise<void>;
  loading: boolean;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
}


const LOADING_STEPS = ["Cleaning", "EDA", "Anomalies", "Forecasting"];

export function UploadPanel({
  onAnalyze,
  loading,
  selectedFile,
  onFileSelect,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const err = validateCsvFile(file);
      if (err) {
        setLocalError(err);
        onFileSelect(null);
        return;
      }
      setLocalError(null);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFilePicker();
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingStep((s) => (s + 1) % LOADING_STEPS.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [loading]);

  const handleAnalyze = () => {
    if (!selectedFile || loading) return;
    onAnalyze(selectedFile, advanced);
  };

  const handleClear = () => {
    setLocalError(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const zoneClass = [
    "upload-zone",
    dragOver ? "drag-over" : "",
    selectedFile ? "file-selected" : "",
    localError ? "has-error" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="card">
      <CardTitle icon="upload">Upload dataset</CardTitle>

      <div
        className={zoneClass}
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file. Press Enter or Space to browse."
        onKeyDown={onKeyDown}
        onClick={openFilePicker}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => processFile(e.target.files?.[0])}
          onClick={(e) => e.stopPropagation()}
        />

        <div className="upload-icon-wrap">
          <UploadTrayIcon />
        </div>

        <div>
          <strong>Drop a CSV here</strong> or click to browse
        </div>
        <p className="upload-hint">
          Global Weather Repository format — same schema as the notebook
        </p>
        <p className="upload-formats">.csv only · max 50 MB</p>

        {selectedFile && !localError && (
          <div className="file-badge" onClick={(e) => e.stopPropagation()}>
            <span className="file-type-badge">CSV</span>
            <div className="file-badge-info">
              <span className="file-badge-name" title={selectedFile.name}>
                {selectedFile.name}
              </span>
              <span className="file-badge-size mono">
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
          </div>
        )}

        {localError && (
          <div className="upload-error-msg" onClick={(e) => e.stopPropagation()}>
            <ErrorIcon />
            <span>{localError}</span>
          </div>
        )}
      </div>

      <div className="controls">
        <label className="checkbox-label" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={advanced}
            disabled={loading}
            onChange={(e) => setAdvanced(e.target.checked)}
          />
          <span>
            <strong>Run advanced models</strong>
            <br />
            SARIMA, Prophet &amp; XGBoost — slower but matches notebook Section 5
          </span>
        </label>

        <div className="btn-group">
          <button
            className="btn"
            disabled={!selectedFile || loading || !!localError}
            onClick={handleAnalyze}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <BarometerGauge size={18} />
                <span className="sr-only">Analyzing</span>
                <span aria-hidden="true">Running pipeline…</span>
              </>
            ) : (
              "Run analysis"
            )}
          </button>
          {selectedFile && (
            <button
              className="btn btn-secondary"
              disabled={loading}
              onClick={handleClear}
              aria-label="Clear selected file"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading-status" role="status" aria-live="polite">
          <BarometerGauge size={22} />
          <div>
            <div>Processing your dataset through the full pipeline…</div>
            <div className="loading-steps">
              {LOADING_STEPS.map((step, i) => (
                <span
                  key={step}
                  className={`loading-step ${i === loadingStep ? "active" : ""}`}
                >
                  {step}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DatasetOverview({ data }: { data: AnalysisResult }) {
  return (
    <div className="card">
      <CardTitle icon="overview">Dataset overview</CardTitle>

      <div className="stats-grid">
        <div className="instrument-stat">
          <div className="instrument-stat-label">Rows</div>
          <div className="instrument-stat-value">
            {data.shape.rows.toLocaleString()}
          </div>
        </div>
        <div className="instrument-stat accent-teal">
          <div className="instrument-stat-label">Columns</div>
          <div className="instrument-stat-value">{data.shape.columns}</div>
        </div>
        {data.cleaning && (
          <div className="instrument-stat">
            <div className="instrument-stat-label">After cleaning</div>
            <div className="instrument-stat-value">
              {data.cleaning.rows_after_cleaning.toLocaleString()}
            </div>
          </div>
        )}
        {data.anomalies && (
          <div className="instrument-stat accent-coral">
            <div className="instrument-stat-label">Anomalies</div>
            <div className="instrument-stat-value">
              {data.anomalies.isolation_forest.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {data.anomalies && (
        <div className="anomaly-strip">
          <div className="anomaly-strip-item">
            <span className="anomaly-strip-label">Isolation Forest</span>
            <span className="anomaly-strip-value">
              {data.anomalies.isolation_forest}{" "}
              <span className="instrument-stat-unit">
                ({data.anomalies.pct_iforest}%)
              </span>
            </span>
          </div>
          <div className="anomaly-strip-item">
            <span className="anomaly-strip-label">Z-score (&gt;3σ)</span>
            <span className="anomaly-strip-value">
              {data.anomalies.zscore}{" "}
              <span className="instrument-stat-unit">
                ({data.anomalies.pct_zscore}%)
              </span>
            </span>
          </div>
        </div>
      )}

      <div className="column-map-section">
        <h3 className="column-map-title">Resolved column mapping</h3>
        <div className="column-map">
          {Object.entries(data.column_map).map(([key, val]) => (
            <div key={key} className="column-map-item">
              <span className="column-map-key">{key}</span>
              <span className={`column-map-val ${!val ? "missing" : ""}`}>
                {val ?? "not found"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PreviewTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) return null;
  const cols = Object.keys(rows[0]).slice(0, 8);

  return (
    <div className="card">
      <CardTitle icon="preview">Data preview</CardTitle>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.85rem" }}>
        First 5 rows · showing {cols.length} of {Object.keys(rows[0]).length} columns
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c} className="mono-cell">
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
