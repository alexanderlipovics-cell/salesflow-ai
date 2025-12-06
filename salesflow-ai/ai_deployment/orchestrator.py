# ai_deployment/orchestrator.py

from __future__ import annotations

import asyncio
import json
import os
import subprocess
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import structlog

try:
    from openai import AsyncOpenAI
except ImportError:  # Fallback, falls lib noch nicht installiert
    AsyncOpenAI = None  # type: ignore

logger = structlog.get_logger()

@dataclass
class DeploymentStepResult:
    percentage: int
    metrics: Dict[str, Any]
    timestamp: datetime

class AIDeploymentOrchestrator:
    """
    AI-powered Deployment Orchestrator:
    - Smart rollout strategies
    - Automated canary deployments
    - Performance-based scaling decisions
    - Intelligent rollback detection
    """

    def __init__(
        self,
        openai_api_key: Optional[str] = None,
        dry_run: bool = False,
    ) -> None:
        self.dry_run = dry_run

        if AsyncOpenAI and (openai_api_key or os.getenv("OPENAI_API_KEY")):
            self.openai_client = AsyncOpenAI(
                api_key=openai_api_key or os.getenv("OPENAI_API_KEY")
            )
        else:
            self.openai_client = None

        # TODO: echte Clients einbauen:
        self.kubernetes_client = None  # Platzhalter
        self.monitoring_client = None  # Platzhalter (Prometheus, Datadog, etc.)

    # ---------- Top-Level API ----------

    async def smart_deploy(self, version: str, strategy: str = "canary") -> Dict[str, Any]:
        """
        AI-driven deployment with multiple strategies:
        - blue-green: Zero-downtime deployment
        - canary: Progressive rollout with monitoring
        - rolling: Update instances incrementally
        """

        logger.info("Starting smart deployment", version=version, strategy=strategy)

        analysis = await self.analyze_deployment_risks(version)

        if analysis["risk_level"] == "high":
            logger.warning("High-risk deployment detected", analysis=analysis)

        if strategy == "canary":
            result = await self.canary_deployment(version, analysis)
        elif strategy == "blue-green":
            result = await self.blue_green_deployment(version, analysis)
        else:
            result = await self.rolling_deployment(version, analysis)

        logger.info("Deployment finished", result=result)
        return result

    # ---------- Risk Analysis ----------

    async def analyze_deployment_risks(self, version: str) -> Dict[str, Any]:
        """AI analysis of deployment risks based on code changes & heuristics."""

        changes = await self.get_code_changes(version)
        performance_impact = await self.predict_performance_impact(changes)
        breaking_changes = await self.detect_breaking_changes(changes)
        risk_score = self.calculate_risk_score(changes, performance_impact, breaking_changes)

        recommendations = await self.generate_recommendations(risk_score, changes)

        return {
            "risk_level": "low" if risk_score < 30 else "medium" if risk_score < 70 else "high",
            "risk_score": risk_score,
            "performance_impact": performance_impact,
            "breaking_changes": breaking_changes,
            "recommendations": recommendations,
        }

    async def get_code_changes(self, version: str) -> Dict[str, Any]:
        """
        Lies Code-Changes aus Git.
        Vereinfachte Variante: Diff zwischen HEAD und Tag/Branch 'version'.
        """

        try:
            diff = subprocess.check_output(
                ["git", "diff", f"{version}..HEAD", "--stat", "--name-only"],
                stderr=subprocess.STDOUT,
            ).decode("utf-8")
        except subprocess.CalledProcessError as e:
            logger.warning("Failed to get git diff", error=str(e.output))
            diff = ""

        files_modified = [line.strip() for line in diff.splitlines() if line.strip()]

        database_changes = any("migrations" in f.lower() or "schema" in f.lower() for f in files_modified)
        api_changes = any("router" in f.lower() or "api" in f.lower() for f in files_modified)

        return {
            "version": version,
            "files_modified": files_modified,
            "database_changes": database_changes,
            "api_changes": api_changes,
            "raw_diff": diff,
        }

    async def predict_performance_impact(self, changes: Dict[str, Any]) -> Dict[str, str]:
        """AI prediction of performance impact based on code changes."""

        if not self.openai_client:
            # Fallback Heuristik
            many_files = len(changes.get("files_modified", [])) > 20
            db_changes = changes.get("database_changes", False)

            return {
                "cpu_impact": "medium" if many_files else "low",
                "memory_impact": "low",
                "db_impact": "high" if db_changes else "medium",
                "api_impact": "medium",
                "cache_impact": "low",
            }

        changes_text = "\n".join(changes.get("files_modified", []))[:4000]

        prompt = f"""
        Analyze these code changes for performance impact:

        Changed files:
        {changes_text}

        Predict:
        1. CPU usage impact (low/medium/high)
        2. Memory usage impact (low/medium/high)
        3. Database query impact (low/medium/high)
        4. API response time impact (low/medium/high)
        5. Cache effectiveness impact (low/medium/high)

        Respond as JSON with keys:
        cpu_impact, memory_impact, db_impact, api_impact, cache_impact.
        """

        resp = await self.openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a performance engineer."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=256,
        )
        content = resp.choices[0].message.content or "{}"

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            logger.warning("Could not parse AI performance impact JSON", content=content)
            data = {}

        return {
            "cpu_impact": data.get("cpu_impact", "medium"),
            "memory_impact": data.get("memory_impact", "medium"),
            "db_impact": data.get("db_impact", "medium"),
            "api_impact": data.get("api_impact", "medium"),
            "cache_impact": data.get("cache_impact", "medium"),
        }

    async def detect_breaking_changes(self, changes: Dict[str, Any]) -> List[str]:
        """Sehr grobe Heuristik für Breaking Changes."""

        breaking: List[str] = []

        files = changes.get("files_modified", [])
        if any("models/" in f or "schemas/" in f for f in files):
            breaking.append("Potential model/schema changes – check backward compatibility.")
        if changes.get("database_changes"):
            breaking.append("Database migrations present – verify data migration safety.")
        if changes.get("api_changes"):
            breaking.append("API changes detected – ensure clients are updated.")

        return breaking

    async def generate_recommendations(self, risk_score: int, changes: Dict[str, Any]) -> List[str]:
        """Generate AI-powered deployment recommendations."""

        recommendations: List[str] = []

        if risk_score > 70:
            recommendations.extend(
                [
                    "Implement feature flags for new functionality.",
                    "Prepare immediate rollback plan.",
                    "Increase monitoring granularity (per-endpoint, per-tenant).",
                    "Consider phased rollout over multiple days.",
                    "Have engineering team on standby during deployment window.",
                ]
            )

        changes_str = " ".join(changes.get("files_modified", [])).lower()
        if "migration" in changes_str or "schema" in changes_str or changes.get("database_changes"):
            recommendations.append("Monitor database connection pool usage & query latency.")
            recommendations.append("Prepare database rollback/migration scripts.")

        if "cache" in changes_str or "redis" in changes_str:
            recommendations.append("Monitor cache hit rates post-deployment.")
            recommendations.append("Prepare cache warming strategy for cold start.")

        return recommendations

    def calculate_risk_score(
        self,
        changes: Dict[str, Any],
        performance: Dict[str, str],
        breaking: List[str],
    ) -> int:
        """Calculate deployment risk score (0-100)."""

        score = 0

        num_files = len(changes.get("files_modified", []))
        if num_files > 20:
            score += 30
        elif num_files > 10:
            score += 20
        elif num_files > 5:
            score += 10

        if changes.get("database_changes", False):
            score += 25
        if changes.get("api_changes", False):
            score += 15

        score += len(breaking) * 10

        perf_map = {
            "low": 0,
            "medium": 5,
            "high": 10,
        }
        score += perf_map.get(performance.get("cpu_impact", "medium"), 5)
        score += perf_map.get(performance.get("memory_impact", "medium"), 5)
        score += perf_map.get(performance.get("db_impact", "medium"), 7)
        score += perf_map.get(performance.get("api_impact", "medium"), 5)

        return min(100, score)

    # ---------- Canary Deployment ----------

    async def canary_deployment(self, version: str, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Intelligent canary deployment with automated monitoring."""

        canary_config = {
            "initial_percentage": 5,
            "step_percentage": 5,
            "monitoring_duration": 300,  # 5 min
            "success_criteria": {
                "error_rate_threshold": 0.01,   # 1%
                "latency_p95_threshold": 500,   # ms
                "success_rate_threshold": 0.99, # 99%
            },
        }

        if analysis["risk_level"] == "high":
            canary_config["initial_percentage"] = 1
            canary_config["monitoring_duration"] = 600

        results: List[DeploymentStepResult] = []
        current_percentage = canary_config["initial_percentage"]

        while current_percentage <= 100:
            logger.info("Canary step", percentage=current_percentage)

            await self.deploy_to_percentage(version, current_percentage)

            metrics = await self.monitor_deployment(canary_config["monitoring_duration"])
            step_result = DeploymentStepResult(
                percentage=current_percentage,
                metrics=metrics,
                timestamp=datetime.utcnow(),
            )
            results.append(step_result)

            if self.meets_success_criteria(metrics, canary_config["success_criteria"]):
                current_percentage += canary_config["step_percentage"]
            else:
                await self.rollback_deployment(version)
                return {
                    "status": "failed",
                    "strategy": "canary",
                    "rollback_reason": "success_criteria_not_met",
                    "results": [r.__dict__ for r in results],
                }

        return {
            "status": "success",
            "strategy": "canary",
            "final_percentage": 100,
            "results": [r.__dict__ for r in results],
        }

    async def deploy_to_percentage(self, version: str, percentage: int) -> None:
        """
        Redeploy K8s Deployment mit Traffic-Split bzw. HPA/Ingress-Anpassung.
        Für MVP: nur Logging / dry_run.
        """
        if self.dry_run:
            logger.info("DRY RUN: would deploy version to percentage", version=version, percentage=percentage)
            return

        logger.info("Deploying canary", version=version, percentage=percentage)
        # TODO: Hier per Kubernetes-Client Traffic-Split/Deployment anpassen.

    async def monitor_deployment(self, duration_seconds: int) -> Dict[str, float]:
        """
        Monitoring über externes System (Prometheus, Datadog, etc.).
        Für MVP: Dummy-Werte mit leichten Zufallsschwankungen.
        """
        await asyncio.sleep(1)  # simulate query delay

        # TODO: echte Metriken aus Monitoring ziehen.
        metrics = {
            "error_rate": 0.005,     # 0.5%
            "latency_p95_ms": 320.0, # 320ms
            "success_rate": 0.995,   # 99.5%
        }
        logger.info("Monitoring metrics", metrics=metrics)
        return metrics

    def meets_success_criteria(self, metrics: Dict[str, float], criteria: Dict[str, float]) -> bool:
        return (
            metrics["error_rate"] <= criteria["error_rate_threshold"]
            and metrics["latency_p95_ms"] <= criteria["latency_p95_threshold"]
            and metrics["success_rate"] >= criteria["success_rate_threshold"]
        )

    async def rollback_deployment(self, version: str) -> None:
        """Rollback auf vorherige stabile Version."""
        logger.warning("Rolling back deployment", version=version)
        if self.dry_run:
            return
        # TODO: K8s-Rollback / Helm-Rollback aufrufen.

    # ---------- Blue-Green & Rolling Strategies ----------

    async def blue_green_deployment(self, version: str, analysis: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Starting blue-green deployment", version=version)
        if self.dry_run:
            return {"status": "success", "strategy": "blue-green", "version": version}

        # TODO:
        # - blue deployment = current
        # - green deployment = new version
        # - switch traffic via Ingress / Service bei Erfolg
        return {
            "status": "success",
            "strategy": "blue-green",
            "version": version,
            "analysis": analysis,
        }

    async def rolling_deployment(self, version: str, analysis: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Starting rolling deployment", version=version)
        if self.dry_run:
            return {"status": "success", "strategy": "rolling", "version": version}

        # TODO:
        # - K8s rolling update strategy verwenden
        return {
            "status": "success",
            "strategy": "rolling",
            "version": version,
            "analysis": analysis,
        }
