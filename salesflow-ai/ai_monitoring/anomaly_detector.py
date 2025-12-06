# ai_monitoring/anomaly_detector.py

from __future__ import annotations

from datetime import datetime
from typing import Dict, List

import numpy as np
import pandas as pd
import structlog
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

logger = structlog.get_logger()

class AIAnomalyDetector:
    """
    AI-powered anomaly detection for production monitoring.
    Uses IsolationForest + engineered features on metric time series.
    """

    def __init__(self, contamination: float = 0.1) -> None:
        self.models: Dict[str, IsolationForest] = {}
        self.scalers: Dict[str, StandardScaler] = {}
        self.contamination = contamination

    def train_on_historical_data(self, metric_name: str, data: List[float]) -> None:
        """Train anomaly detection model on historical data."""

        if len(data) < 50:
            logger.warning("Not enough data to train anomaly model", metric=metric_name, n=len(data))
            return

        df = pd.DataFrame({"value": data})
        df["rolling_mean"] = df["value"].rolling(window=10).mean()
        df["rolling_std"] = df["value"].rolling(window=10).std()
        df["diff"] = df["value"].diff()

        df = df.dropna()
        features = ["value", "rolling_mean", "rolling_std", "diff"]

        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(df[features])

        model = IsolationForest(
            contamination=self.contamination,
            random_state=42,
            n_estimators=100,
        )
        model.fit(scaled_data)

        self.models[metric_name] = model
        self.scalers[metric_name] = scaler

        logger.info("Trained anomaly detection model", metric=metric_name, n_samples=len(df))

    async def detect_anomalies(self, metric_name: str, current_values: List[float]) -> List[Dict]:
        """Detect anomalies in current metric values."""

        if metric_name not in self.models:
            logger.warning("No anomaly model for metric", metric=metric_name)
            return []

        model = self.models[metric_name]
        scaler = self.scalers[metric_name]

        df = pd.DataFrame({"value": current_values})
        df["rolling_mean"] = df["value"].rolling(window=10).mean()
        df["rolling_std"] = df["value"].rolling(window=10).std()
        df["diff"] = df["value"].diff()

        if len(df.dropna()) < 10:
            logger.warning("Not enough data for anomaly detection", metric=metric_name)
            return []

        df = df.dropna()
        features = ["value", "rolling_mean", "rolling_std", "diff"]
        scaled_data = scaler.transform(df[features])

        predictions = model.predict(scaled_data)
        scores = model.score_samples(scaled_data)

        anomalies: List[Dict] = []
        for i, (pred, score) in enumerate(zip(predictions, scores)):
            if pred == -1:
                idx = df.index[i]
                anomalies.append(
                    {
                        "timestamp": datetime.utcnow(),
                        "metric": metric_name,
                        "value": current_values[idx],
                        "anomaly_score": float(score),
                        "severity": self.calculate_severity(score),
                        "context": self.get_context(metric_name, current_values, idx),
                    }
                )

        return anomalies

    def calculate_severity(self, anomaly_score: float) -> str:
        """Calculate anomaly severity based on IsolationForest score."""
        if anomaly_score < -0.5:
            return "critical"
        elif anomaly_score < -0.3:
            return "high"
        elif anomaly_score < -0.1:
            return "medium"
        else:
            return "low"

    def get_context(self, metric_name: str, values: List[float], index: int) -> Dict:
        """Get contextual information about the anomaly."""
        window_size = 10
        start_idx = max(0, index - window_size)
        end_idx = min(len(values), index + window_size + 1)
        window_values = values[start_idx:end_idx]

        mean = float(np.mean(window_values))
        std = float(np.std(window_values)) or 1.0
        current = float(values[index])

        return {
            "baseline_avg": mean,
            "baseline_std": std,
            "current_value": current,
            "deviation_sigma": (current - mean) / std,
            "trend": "increasing" if current > mean else "decreasing",
        }
