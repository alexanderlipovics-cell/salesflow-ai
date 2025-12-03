"""
LangGraph Callbacks

Logging und Metrics für Agent Runs.
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class LoggingCallback:
    """
    Callback für strukturiertes Logging von Agent Runs.
    """
    
    def __init__(self, run_id: str):
        self.run_id = run_id
        self.step_count = 0
    
    def on_node_start(self, node_name: str, state: Dict[str, Any]) -> None:
        self.step_count += 1
        logger.info(f"[{self.run_id}] Step {self.step_count}: Starting '{node_name}'")
    
    def on_node_end(
        self,
        node_name: str,
        state: Dict[str, Any],
        duration_ms: float
    ) -> None:
        logger.info(
            f"[{self.run_id}] Step {self.step_count}: "
            f"'{node_name}' completed ({duration_ms:.0f}ms)"
        )
    
    def on_error(self, node_name: str, error: Exception) -> None:
        logger.error(f"[{self.run_id}] Error in '{node_name}': {error}")


class MetricsCallback:
    """
    Callback für Metrics Collection.
    """
    
    def __init__(self, run_id: str):
        self.run_id = run_id
        self.metrics = {
            "node_durations": {},
            "total_duration_ms": 0,
            "steps_executed": 0,
            "errors": [],
        }
        self.start_time: Optional[datetime] = None
    
    def on_run_start(self) -> None:
        self.start_time = datetime.utcnow()
    
    def on_node_end(self, node_name: str, duration_ms: float) -> None:
        self.metrics["node_durations"][node_name] = duration_ms
        self.metrics["steps_executed"] += 1
    
    def on_run_end(self) -> Dict[str, Any]:
        if self.start_time:
            total_ms = (datetime.utcnow() - self.start_time).total_seconds() * 1000
            self.metrics["total_duration_ms"] = total_ms
        
        return self.metrics

