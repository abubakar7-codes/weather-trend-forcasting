import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  ComposedChart,
} from "recharts";
import type { AnalysisResult } from "../types";
import { CardTitle } from "./ui";

const THEME = {
  grid: "#25334a",
  axis: "#8a9bb3",
  tooltipBg: "#121b2c",
  tooltipBorder: "#25334a",
  text: "#eef1f5",
};

const CHART_COLORS: Record<string, string> = {
  actual: "#eef1f5",
  naive: "#8a9bb3",
  linear_regression: "#4fd1c5",
  sarima: "#a78bfa",
  prophet: "#e2a53d",
  xgboost: "#fbbf24",
  ensemble: "#ff6b5b",
};

export function ModelResults({ data }: { data: AnalysisResult }) {
  const results = data.forecasting?.results ?? [];
  if (!results.length) return null;

  const bestRmse = Math.min(
    ...results.filter((r) => r.RMSE != null).map((r) => r.RMSE as number)
  );

  return (
    <div className="card">
      <CardTitle icon="model">Model performance</CardTitle>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.85rem" }}>
        Metrics on the held-out test window — lower RMSE / MAE is better
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>MAE</th>
              <th>RMSE</th>
              <th>MAPE %</th>
              <th>R²</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.model}>
                <td>
                  <strong>{r.model}</strong>
                  {r.RMSE === bestRmse && r.RMSE != null && (
                    <span className="tag" style={{ marginLeft: "0.5rem" }}>
                      best RMSE
                    </span>
                  )}
                </td>
                {r.error ? (
                  <td colSpan={4} className="metric-error">
                    {r.error}
                  </td>
                ) : (
                  <>
                    <td className="mono-cell">{r.MAE?.toFixed(3)}</td>
                    <td className="mono-cell">{r.RMSE?.toFixed(3)}</td>
                    <td className="mono-cell">{r.MAPE?.toFixed(2)}</td>
                    <td className={r.R2 && r.R2 > 0.5 ? "metric-good" : "metric-warn"}>
                      {r.R2?.toFixed(3)}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.forecasting && (
        <p className="chart-legend-note">
          Train window: {data.forecasting.train_size} days · Test window:{" "}
          {data.forecasting.test_size} days
        </p>
      )}
    </div>
  );
}

export function ForecastChart({ data }: { data: AnalysisResult }) {
  const chart = data.forecasting?.forecast_chart;
  if (!chart) return null;

  const seriesKeys = [
    "actual",
    "naive",
    "linear_regression",
    "sarima",
    "prophet",
    "xgboost",
    "ensemble",
  ] as const;

  const plotData = chart.dates.map((date, i) => {
    const point: Record<string, string | number> = { date };
    for (const key of seriesKeys) {
      const vals = chart[key];
      if (vals && vals[i] !== undefined) point[key] = vals[i];
    }
    return point;
  });

  const activeSeries = seriesKeys.filter((k) => chart[k]);

  return (
    <div className="card">
      <CardTitle icon="forecast">Forecast vs actual</CardTitle>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
        Test-set comparison — {activeSeries.length} series plotted
      </p>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={plotData}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: THEME.axis }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: THEME.axis }}
              unit="°C"
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              contentStyle={{
                background: THEME.tooltipBg,
                border: `1px solid ${THEME.tooltipBorder}`,
                borderRadius: 8,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12,
              }}
              labelStyle={{ color: THEME.text }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            {seriesKeys.map(
              (key) =>
                chart[key] && (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key.replace(/_/g, " ")}
                    stroke={CHART_COLORS[key]}
                    strokeWidth={key === "actual" ? 2.5 : 1.5}
                    strokeDasharray={key === "actual" ? undefined : "5 4"}
                    dot={false}
                  />
                )
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {chart.ensemble_weights && (
        <p className="chart-legend-note">
          Ensemble weights (inverse-RMSE):{" "}
          {Object.entries(chart.ensemble_weights)
            .map(([k, v]) => `${k}=${v}`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

export function DailyTrendChart({ data }: { data: AnalysisResult }) {
  const trend = data.forecasting?.daily_trend;
  if (!trend) return null;

  const plotData = trend.dates.map((date, i) => ({
    date,
    temp: trend.temp_mean[i],
    precip: trend.precip_sum[i],
  }));

  return (
    <div className="card">
      <CardTitle icon="trend">Global daily trend</CardTitle>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
        Mean temperature (line) and total precipitation (bars) aggregated by date
      </p>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={plotData}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.grid} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: THEME.axis }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="temp"
              tick={{ fontSize: 11, fill: THEME.axis }}
              unit="°C"
            />
            <YAxis
              yAxisId="precip"
              orientation="right"
              tick={{ fontSize: 11, fill: THEME.axis }}
              unit="mm"
            />
            <Tooltip
              contentStyle={{
                background: THEME.tooltipBg,
                border: `1px solid ${THEME.tooltipBorder}`,
                borderRadius: 8,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temp"
              name="Mean temp °C"
              stroke="#ff6b5b"
              dot={false}
              strokeWidth={2}
            />
            <Bar
              yAxisId="precip"
              dataKey="precip"
              name="Precip mm"
              fill="#4fd1c5"
              opacity={0.4}
              radius={[2, 2, 0, 0]}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CorrelationHeatmap({ data }: { data: AnalysisResult }) {
  const corr = data.eda?.correlation;
  if (!corr?.columns?.length) return null;

  const { columns, matrix } = corr;

  return (
    <div className="card">
      <CardTitle icon="correlation">Correlation matrix</CardTitle>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.85rem" }}>
        Pearson correlation between core weather variables — teal = positive, coral = negative
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th>
              {columns.map((c) => (
                <th key={c}>{c.replace(/_/g, " ")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((rowCol, i) => (
              <tr key={rowCol}>
                <th>{rowCol.replace(/_/g, " ")}</th>
                {matrix[i].map((val, j) => {
                  const intensity = Math.abs(val);
                  const bg =
                    val > 0
                      ? `rgba(79, 209, 197, ${intensity * 0.55})`
                      : `rgba(255, 107, 91, ${intensity * 0.55})`;
                  return (
                    <td
                      key={j}
                      className="mono-cell"
                      style={{
                        background: bg,
                        textAlign: "center",
                        fontWeight: i === j ? 600 : 400,
                      }}
                    >
                      {val.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MissingValues({ data }: { data: AnalysisResult }) {
  if (!data.missing_report.length) {
    return (
      <div className="card">
        <CardTitle icon="missing">Missing values</CardTitle>
        <span className="tag">No missing values detected in raw dataset</span>
      </div>
    );
  }

  const totalMissing = data.missing_report.reduce((s, r) => s + r.missing_count, 0);

  return (
    <div className="card">
      <CardTitle icon="missing">Missing values</CardTitle>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.85rem" }}>
        {data.missing_report.length} columns with gaps · {totalMissing.toLocaleString()} total
        missing cells (location-aware imputation applied during cleaning)
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Column</th>
              <th>Count</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {data.missing_report.slice(0, 15).map((row) => (
              <tr key={row.column}>
                <td>{row.column}</td>
                <td className="mono-cell">{row.missing_count.toLocaleString()}</td>
                <td className="mono-cell">{row.missing_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.missing_report.length > 15 && (
        <p className="chart-legend-note">
          Showing top 15 of {data.missing_report.length} columns with missing data
        </p>
      )}
    </div>
  );
}
