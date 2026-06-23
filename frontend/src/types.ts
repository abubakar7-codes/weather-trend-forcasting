export interface AnalysisResult {
  shape: { rows: number; columns: number };
  columns: string[];
  column_map: Record<string, string | null>;
  missing_report: { column: string; missing_count: number; missing_pct: number }[];
  preview: Record<string, unknown>[];
  cleaning: {
    outliers: Record<
      string,
      { lower_bound: number; upper_bound: number; n_outliers: number; pct_outliers: number }
    >;
    remaining_missing: number;
    rows_after_cleaning: number;
  } | null;
  eda: {
    correlation: {
      columns: string[];
      matrix: number[][];
    };
    descriptive_stats: Record<
      string,
      { mean: number; std: number; min: number; max: number }
    >;
    top_countries: { country: string; rows: number }[];
  } | null;
  forecasting: {
    results: ModelMetric[];
    forecast_chart: ForecastChart;
    daily_trend: DailyTrend;
    train_size: number;
    test_size: number;
  } | null;
  anomalies: {
    isolation_forest: number;
    zscore: number;
    pct_iforest: number;
    pct_zscore: number;
  } | null;
  errors: string[];
}

export interface ModelMetric {
  model: string;
  MAE?: number;
  RMSE?: number;
  MAPE?: number;
  R2?: number;
  error?: string;
}

export interface ForecastChart {
  dates: string[];
  actual: number[];
  naive: number[];
  linear_regression: number[];
  sarima?: number[];
  prophet?: number[];
  xgboost?: number[];
  ensemble?: number[];
  ensemble_weights?: Record<string, number>;
}

export interface DailyTrend {
  dates: string[];
  temp_mean: number[];
  precip_sum: number[];
}
