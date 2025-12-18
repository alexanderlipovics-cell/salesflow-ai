# ai_deployment/predict_impact.py

import argparse
import asyncio
import json
from pathlib import Path

import structlog

from ai_deployment.orchestrator import AIDeploymentOrchestrator

logger = structlog.get_logger()

async def main() -> None:
    parser = argparse.ArgumentParser(description="Predict performance impact of changes.")
    parser.add_argument("--changes-file", required=True, help="Path to JSON with code changes.")
    args = parser.parse_args()

    path = Path(args.changes_file)
    changes = json.loads(path.read_text(encoding="utf-8"))

    orchestrator = AIDeploymentOrchestrator(dry_run=True)
    impact = await orchestrator.predict_performance_impact(changes)

    print(json.dumps(impact, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
