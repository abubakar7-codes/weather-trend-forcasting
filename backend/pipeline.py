"""Weather trend forecasting pipeline — extracted from the notebook."""

from __future__ import annotations

import io
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

RANDOM_STATE = 42


def resolve_columns(df: pd.DataFrame) -> dict[str, str | None]:
    cols_lower = {c.lower(): c for c in df.columns}

    def get_col(*keys: str) -> str | None:
        for k in keys:
            if k in cols_lower:
                return cols_lower[k]
        for k in keys:
            for cl, orig in cols_lower.items():
                if k in cl:
                    return orig
        return None

    return {
        "datetime": get_col("last_updated"),
        "epoch": get_col("last_updated_epoch"),
        "country": get_col("country"),
        "location": get_col("location_name", "location"),
        "region": get_col("region"),
        "lat": get_col("latitude"),
        "lon": get_col("longitude"),
        "temp_c": get_col("temperature_celsius"),
        "temp_f": get_col("temperature_fahrenheit"),
        "precip_mm": get_col("precip_mm"),
        "humidity": get_col("humidity"),
        "pressure_mb": get_col("pressure_mb"),
        "wind_kph": get_col("wind_kph"),
        "uv": get_col("uv_index"),
        "cloud": get_col("cloud"),
        "condition": get_col("condition_text"),
        "pm25": get_col("air_quality_pm2.5"),
        "pm10": get_col("air_quality_pm10"),
        "co": get_col("air_quality_carbon_monoxide"),
        "o3": get_col("air_quality_ozone"),
        "no2": get_col("air_quality_nitrogen_dioxide"),
        "so2": get_col("air_quality_sulphur_dioxide"),
    }


def iqr_bounds(s: pd.Series, k: float = 1.5) -> tuple[float, float]:
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    return float(q1 - k * iqr), float(q3 + k * iqr)


def add_lag_features(
    frame: pd.DataFrame,
    col: str,
    lags: tuple[int, ...] = (1, 2, 3, 7),
    roll_windows: tuple[int, ...] = (3, 7),
) -> pd.DataFrame:
    frame = frame.copy()
    for lag in lags:
        frame[f"{col}_lag{lag}"] = frame[col].shift(lag)
    for w in roll_windows:
        frame[f"{col}_roll{w}_mean"] = frame[col].shift(1).rolling(w).mean()
        frame[f"{col}_roll{w}_std"] = frame[col].shift(1).rolling(w).std()
    return frame


def evaluate(y_true, y_pred, name: str) -> dict[str, Any]:
    y_true_arr = np.asarray(y_true, dtype=float)
    y_pred_arr = np.asarray(y_pred, dtype=float)
    mae = float(mean_absolute_error(y_true_arr, y_pred_arr))
    rmse = float(np.sqrt(mean_squared_error(y_true_arr, y_pred_arr)))
    mape = float(
        np.mean(
            np.abs(
                (y_true_arr - y_pred_arr)
                / np.where(y_true_arr == 0, 1e-6, y_true_arr)
            )
        )
        * 100
    )
    r2 = float(r2_score(y_true_arr, y_pred_arr))
    return {"model": name, "MAE": mae, "RMSE": rmse, "MAPE": mape, "R2": r2}


def clean_dataframe(df: pd.DataFrame, col: dict[str, str | None]) -> tuple[pd.DataFrame, dict[str, Any]]:
    dt = col["datetime"]
    if not dt:
        raise ValueError("Could not find a datetime column (expected 'last_updated').")

    df = df.copy()
    df[dt] = pd.to_datetime(df[dt], errors="coerce")
    df = df.dropna(subset=[dt])

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=["object"]).columns.tolist()

    if col["location"]:
        for c in numeric_cols:
            if df[c].isna().any():
                df[c] = df.groupby(col["location"])[c].transform(
                    lambda s: s.fillna(s.median())
                )

    for c in numeric_cols:
        if df[c].isna().any():
            df[c] = df[c].fillna(df[c].median())
    for c in categorical_cols:
        if df[c].isna().any():
            df[c] = df[c].fillna(df[c].mode().iloc[0])

    key_numeric = [
        c
        for c in [
            col["temp_c"],
            col["precip_mm"],
            col["humidity"],
            col["pressure_mb"],
            col["wind_kph"],
        ]
        if c
    ]

    outlier_summary: dict[str, Any] = {}
    df_clean = df.copy()
    for c in key_numeric:
        lo, hi = iqr_bounds(df[c])
        n_out = int(((df[c] < lo) | (df[c] > hi)).sum())
        outlier_summary[c] = {
            "lower_bound": round(lo, 2),
            "upper_bound": round(hi, 2),
            "n_outliers": n_out,
            "pct_outliers": round(n_out / len(df) * 100, 2),
        }
        df_clean[c] = df_clean[c].clip(lower=lo, upper=hi)

    df_clean["year"] = df_clean[dt].dt.year
    df_clean["month"] = df_clean[dt].dt.month
    df_clean["day"] = df_clean[dt].dt.day
    df_clean["dayofweek"] = df_clean[dt].dt.dayofweek
    df_clean["dayofyear"] = df_clean[dt].dt.dayofyear
    df_clean["date"] = df_clean[dt].dt.date

    if key_numeric:
        scaler = StandardScaler()
        scaled = scaler.fit_transform(df_clean[key_numeric])
        df_clean[[f"{c}_scaled" for c in key_numeric]] = scaled

    return df_clean, {"outliers": outlier_summary, "remaining_missing": int(df_clean.isna().sum().sum())}


def run_forecasting(
    df_clean: pd.DataFrame,
    col: dict[str, str | None],
    advanced: bool = False,
) -> dict[str, Any]:
    if not col["temp_c"]:
        raise ValueError("Could not find temperature column (expected 'temperature_celsius').")

    agg: dict = {"temp_mean": (col["temp_c"], "mean")}
    if col["precip_mm"]:
        agg["precip_sum"] = (col["precip_mm"], "sum")
    daily_global = df_clean.groupby("date").agg(**agg).reset_index()
    if "precip_sum" not in daily_global.columns:
        daily_global["precip_sum"] = 0.0
    daily_global["date"] = pd.to_datetime(daily_global["date"])

    if len(daily_global) < 14:
        raise ValueError(
            f"Need at least 14 unique dates for forecasting; found {len(daily_global)}."
        )

    ts = daily_global.sort_values("date").reset_index(drop=True)
    ts_feat = add_lag_features(ts, "temp_mean").dropna().reset_index(drop=True)

    if len(ts_feat) < 10:
        raise ValueError("Not enough data after lag feature engineering.")

    split_idx = int(len(ts_feat) * 0.8)
    train, test = ts_feat.iloc[:split_idx], ts_feat.iloc[split_idx:]
    feature_cols = [c for c in ts_feat.columns if c not in ["date", "temp_mean", "precip_sum"]]
    X_train, y_train = train[feature_cols], train["temp_mean"]
    X_test, y_test = test[feature_cols], test["temp_mean"]

    results: list[dict[str, Any]] = []
    baseline_pred = test["temp_mean_lag1"].values
    results.append(evaluate(y_test, baseline_pred, "Naive (t-1)"))

    lr = LinearRegression()
    lr.fit(X_train, y_train)
    lr_pred = lr.predict(X_test)
    results.append(evaluate(y_test, lr_pred, "Linear Regression"))

    forecast_chart = {
        "dates": test["date"].dt.strftime("%Y-%m-%d").tolist(),
        "actual": [round(float(v), 3) for v in y_test.values],
        "naive": [round(float(v), 3) for v in baseline_pred],
        "linear_regression": [round(float(v), 3) for v in lr_pred],
    }

    ensemble_preds: dict[str, list[float]] = {}

    if advanced:
        test_dates = test["date"].values
        y_full = ts.set_index("date")["temp_mean"]
        y_train_full = y_full.loc[y_full.index < test_dates[0]]
        y_test_full = y_full.loc[y_full.index.isin(test_dates)]

        try:
            from statsmodels.tsa.statespace.sarimax import SARIMAX

            sarima = SARIMAX(
                y_train_full,
                order=(1, 1, 1),
                seasonal_order=(1, 1, 1, 7),
                enforce_stationarity=False,
                enforce_invertibility=False,
            )
            sarima_fit = sarima.fit(disp=False)
            sarima_pred = sarima_fit.forecast(steps=len(y_test_full))
            sarima_pred.index = y_test_full.index
            results.append(evaluate(y_test_full, sarima_pred, "SARIMA(1,1,1)(1,1,1,7)"))
            forecast_chart["sarima"] = [
                round(float(v), 3) for v in sarima_pred.reindex(test["date"]).values
            ]
            ensemble_preds["sarima"] = sarima_pred
        except Exception as exc:
            results.append({"model": "SARIMA(1,1,1)(1,1,1,7)", "error": str(exc)})

        try:
            from prophet import Prophet

            prophet_train = y_train_full.reset_index().rename(
                columns={"date": "ds", "temp_mean": "y"}
            )
            m = Prophet(
                yearly_seasonality=False,
                weekly_seasonality=True,
                daily_seasonality=False,
            )
            m.fit(prophet_train)
            future = pd.DataFrame({"ds": y_test_full.index})
            fcst = m.predict(future)
            prophet_pred = pd.Series(fcst["yhat"].values, index=y_test_full.index)
            results.append(evaluate(y_test_full, prophet_pred, "Prophet"))
            forecast_chart["prophet"] = [
                round(float(v), 3) for v in prophet_pred.reindex(test["date"]).values
            ]
            ensemble_preds["prophet"] = prophet_pred
        except Exception as exc:
            results.append({"model": "Prophet", "error": str(exc)})

        try:
            from xgboost import XGBRegressor

            xgb = XGBRegressor(
                n_estimators=400,
                max_depth=4,
                learning_rate=0.03,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=RANDOM_STATE,
                n_jobs=-1,
            )
            xgb.fit(X_train, y_train)
            xgb_pred = pd.Series(xgb.predict(X_test), index=test["date"].values)
            results.append(
                evaluate(
                    y_test_full,
                    xgb_pred.reindex(y_test_full.index).values,
                    "XGBoost",
                )
            )
            forecast_chart["xgboost"] = [
                round(float(v), 3) for v in xgb_pred.reindex(test["date"]).values
            ]
            ensemble_preds["xgboost"] = xgb_pred.reindex(y_test_full.index)
        except Exception as exc:
            results.append({"model": "XGBoost", "error": str(exc)})

        valid_models = {
            k: v
            for k, v in ensemble_preds.items()
            if v is not None and not v.isna().all()
        }
        if len(valid_models) >= 2:
            pred_frame = pd.DataFrame({"actual": y_test_full})
            for name, pred in valid_models.items():
                pred_frame[name] = pred
            pred_frame = pred_frame.dropna()
            if len(pred_frame) > 0:
                rmses = {
                    c: float(np.sqrt(mean_squared_error(pred_frame["actual"], pred_frame[c])))
                    for c in valid_models
                }
                inv_w = {c: 1 / r for c, r in rmses.items()}
                total_w = sum(inv_w.values())
                weights = {c: w / total_w for c, w in inv_w.items()}
                ensemble = sum(pred_frame[c] * weights[c] for c in valid_models)
                results.append(
                    evaluate(pred_frame["actual"], ensemble, "Ensemble (weighted avg)")
                )
                forecast_chart["ensemble"] = [round(float(v), 3) for v in ensemble.values]
                forecast_chart["ensemble_weights"] = {
                    k: round(v, 3) for k, v in weights.items()
                }

    daily_trend = {
        "dates": ts["date"].dt.strftime("%Y-%m-%d").tolist(),
        "temp_mean": [round(float(v), 3) for v in ts["temp_mean"].values],
        "precip_sum": [round(float(v), 3) for v in ts["precip_sum"].values],
    }

    return {
        "results": results,
        "forecast_chart": forecast_chart,
        "daily_trend": daily_trend,
        "train_size": int(len(train)),
        "test_size": int(len(test)),
    }


def run_anomaly_detection(
    df_clean: pd.DataFrame, col: dict[str, str | None]
) -> dict[str, Any]:
    from sklearn.ensemble import IsolationForest
    from scipy.stats import zscore

    anomaly_features = [
        c
        for c in [
            col["temp_c"],
            col["precip_mm"],
            col["humidity"],
            col["pressure_mb"],
            col["wind_kph"],
        ]
        if c
    ]
    if not anomaly_features:
        return {"isolation_forest": 0, "zscore": 0, "pct_iforest": 0.0}

    X_anom = df_clean[anomaly_features].fillna(df_clean[anomaly_features].median())
    iso = IsolationForest(
        n_estimators=300,
        contamination=0.02,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    iforest_flags = iso.fit_predict(X_anom)
    z = np.abs(zscore(X_anom))
    zscore_flags = (z > 3).any(axis=1)

    n_iforest = int((iforest_flags == -1).sum())
    n_zscore = int(zscore_flags.sum())
    return {
        "isolation_forest": n_iforest,
        "zscore": n_zscore,
        "pct_iforest": round(n_iforest / len(df_clean) * 100, 2),
        "pct_zscore": round(n_zscore / len(df_clean) * 100, 2),
    }


def compute_eda_summary(df_clean: pd.DataFrame, col: dict[str, str | None]) -> dict[str, Any]:
    corr_cols = [
        c
        for c in [
            col["temp_c"],
            col["precip_mm"],
            col["humidity"],
            col["pressure_mb"],
            col["wind_kph"],
            col["uv"],
            col["cloud"],
        ]
        if c and c in df_clean.columns
    ]
    correlation = {}
    if len(corr_cols) >= 2:
        corr_df = df_clean[corr_cols].corr()
        correlation = {
            "columns": corr_cols,
            "matrix": [[round(float(v), 3) for v in row] for row in corr_df.values],
        }

    key_numeric = [c for c in corr_cols if c in [col["temp_c"], col["precip_mm"], col["humidity"], col["pressure_mb"], col["wind_kph"]] if c]
    stats = {}
    if key_numeric:
        desc = df_clean[key_numeric].describe().T
        stats = {
            col_name: {
                "mean": round(float(row["mean"]), 3),
                "std": round(float(row["std"]), 3),
                "min": round(float(row["min"]), 3),
                "max": round(float(row["max"]), 3),
            }
            for col_name, row in desc.iterrows()
        }

    country_col = col["country"]
    top_countries = []
    if country_col:
        top_countries = (
            df_clean[country_col]
            .value_counts()
            .head(10)
            .reset_index(name="rows")
            .rename(columns={country_col: "country"})
            .to_dict(orient="records")
        )

    return {"correlation": correlation, "descriptive_stats": stats, "top_countries": top_countries}


@dataclass
class AnalysisResult:
    shape: tuple[int, int]
    columns: list[str]
    column_map: dict[str, str | None]
    missing_report: list[dict[str, Any]]
    preview: list[dict[str, Any]]
    cleaning: dict[str, Any]
    eda: dict[str, Any]
    forecasting: dict[str, Any] | None = None
    anomalies: dict[str, Any] | None = None
    errors: list[str] = field(default_factory=list)


def analyze_csv(
    file_bytes: bytes,
    advanced_models: bool = False,
    preview_rows: int = 10,
) -> dict[str, Any]:
    errors: list[str] = []
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as exc:
        raise ValueError(f"Failed to read CSV: {exc}") from exc

    col = resolve_columns(df)
    missing = df.isna().sum().sort_values(ascending=False)
    missing_pct = (missing / len(df) * 100).round(2)
    missing_report = [
        {"column": name, "missing_count": int(count), "missing_pct": float(missing_pct[name])}
        for name, count in missing.items()
        if count > 0
    ]

    preview_df = df.head(preview_rows).replace({np.nan: None})
    for c in preview_df.select_dtypes(include=["datetime64"]).columns:
        preview_df[c] = preview_df[c].astype(str)

    result: dict[str, Any] = {
        "shape": {"rows": int(df.shape[0]), "columns": int(df.shape[1])},
        "columns": df.columns.tolist(),
        "column_map": col,
        "missing_report": missing_report,
        "preview": preview_df.to_dict(orient="records"),
        "cleaning": None,
        "eda": None,
        "forecasting": None,
        "anomalies": None,
        "errors": errors,
    }

    required = ["datetime", "temp_c"]
    missing_required = [k for k in required if not col.get(k)]
    if missing_required:
        result["errors"].append(
            f"Missing required columns: {', '.join(missing_required)}. "
            "Upload a Global Weather Repository-style CSV."
        )
        return result

    try:
        df_clean, cleaning_info = clean_dataframe(df, col)
        result["cleaning"] = {
            **cleaning_info,
            "rows_after_cleaning": int(len(df_clean)),
        }
    except Exception as exc:
        result["errors"].append(f"Cleaning failed: {exc}")
        return result

    try:
        result["eda"] = compute_eda_summary(df_clean, col)
    except Exception as exc:
        errors.append(f"EDA failed: {exc}")

    try:
        result["forecasting"] = run_forecasting(df_clean, col, advanced=advanced_models)
    except Exception as exc:
        result["errors"].append(f"Forecasting failed: {exc}")

    try:
        result["anomalies"] = run_anomaly_detection(df_clean, col)
    except Exception as exc:
        errors.append(f"Anomaly detection failed: {exc}")

    result["errors"].extend(errors)
    return result
