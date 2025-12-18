# ai_monitoring/train_models.py

import argparse
import json
from pathlib import Path
from typing import Dict, List

import structlog

from ai_monitoring.anomaly_detector import AIAnomalyDetector

logger = structlog.get_logger()

def load_historical_metrics(path: Path) -> Dict[str, List[float]]:
    """
    Erwartet JSON:

    {
      "metric_name_1": [0.1, 0.2, ...],
      "metric_name_2": [ ... ]
    }
    """
    data = json.loads(path.read_text(encoding="utf-8"))
    return {k: list(map(float, v)) for k, v in data.items()}

def main() -> None:
    parser = argparse.ArgumentParser(description="Train anomaly models on historical metrics.")
    parser.add_argument("--file", required=True, help="Path to JSON with historical metrics.")
    args = parser.parse_args()

    path = Path(args.file)
    metrics = load_historical_metrics(path)

    detector = AIAnomalyDetector()
    for metric_name, values in metrics.items():
        detector.train_on_historical_data(metric_name, values)

    logger.info("Training completed", metrics=list(metrics.keys()))

if __name__ == "__main__":
    main()
