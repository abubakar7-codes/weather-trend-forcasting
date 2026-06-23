import type { ReactNode } from "react";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function validateCsvFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return "Only CSV files are supported. Please upload a file ending in .csv";
  }
  if (file.size === 0) {
    return "This file is empty. Choose a CSV with weather data.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File is too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(MAX_UPLOAD_BYTES)}.`;
  }
  return null;
}

export function CardIcon({ name }: { name: "upload" | "overview" | "preview" | "missing" | "model" | "trend" | "forecast" | "correlation" }) {
  const icons: Record<string, JSX.Element> = {
    upload: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 16V4m0 0L8 8m4-4 4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    overview: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    preview: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h16M4 10h16M4 14h10M4 18h6" strokeLinecap="round" />
      </svg>
    ),
    missing: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
      </svg>
    ),
    model: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 17l6-6 4 4 8-10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    trend: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 17c3-4 6-10 9-10s6 6 9 10" strokeLinecap="round" />
      </svg>
    ),
    forecast: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" strokeLinecap="round" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
    correlation: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="6" height="6" />
        <rect x="15" y="3" width="6" height="6" />
        <rect x="3" y="15" width="6" height="6" />
        <rect x="15" y="15" width="6" height="6" />
      </svg>
    ),
  };
  return <span className="card-title-icon">{icons[name]}</span>;
}

export function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
    </svg>
  );
}

export function UploadTrayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4 14h16l-2 6H6l-2-6z" strokeLinejoin="round" />
      <path d="M8 14V8a4 4 0 018 0v6" strokeLinecap="round" />
      <circle cx="12" cy="6" r="2" />
    </svg>
  );
}

export function CardTitle({ icon, children }: { icon: Parameters<typeof CardIcon>[0]["name"]; children: ReactNode }) {
  return (
    <h2 className="card-title">
      <CardIcon name={icon} />
      {children}
    </h2>
  );
}
