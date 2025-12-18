# scripts/smart-deploy.py

import argparse
import asyncio
import json
from typing import Any

import structlog

from ai_deployment.orchestrator import AIDeploymentOrchestrator

logger = structlog.get_logger()

async def main() -> None:
    parser = argparse.ArgumentParser(description="AI-powered smart deployment.")
    parser.add_argument("--version", required=True, help="Git reference or version label to deploy.")
    parser.add_argument(
        "--strategy",
        choices=["canary", "blue-green", "rolling"],
        default="canary",
        help="Deployment strategy.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Do not perform real changes, just simulate.",
    )
    args = parser.parse_args()

    orchestrator = AIDeploymentOrchestrator(dry_run=args.dry_run)
    result: Any = await orchestrator.smart_deploy(version=args.version, strategy=args.strategy)
    print(json.dumps(result, default=str, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
