"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SEQUENCE SCHEDULER                                                        ║
║  Holt fällige Actions aus der Queue und führt sie aus                     ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Dict, Optional
from datetime import datetime, timedelta
import asyncio
import logging

logger = logging.getLogger(__name__)


class SequenceScheduler:
    """Scheduler für Sequence-Aktionen."""
    
    def __init__(self, supabase, executor):
        self.supabase = supabase
        self.executor = executor
        self.is_running = False
        self.worker_id = f"worker-{datetime.utcnow().timestamp()}"
    
    # =========================================================================
    # SCHEDULER LOOP
    # =========================================================================
    
    async def start(self, interval_seconds: int = 60):
        """Startet den Scheduler-Loop."""
        self.is_running = True
        logger.info(f"Scheduler started: {self.worker_id}")
        
        while self.is_running:
            try:
                await self.process_pending_actions()
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
            
            await asyncio.sleep(interval_seconds)
    
    def stop(self):
        """Stoppt den Scheduler."""
        self.is_running = False
        logger.info(f"Scheduler stopped: {self.worker_id}")
    
    # =========================================================================
    # PROCESSING
    # =========================================================================
    
    async def process_pending_actions(self, batch_size: int = 50) -> int:
        """Verarbeitet fällige Aktionen aus der Queue."""
        now = datetime.utcnow()
        
        # Fällige Actions holen und locken
        pending = self.supabase.table("sequence_action_queue").select("*").eq(
            "status", "pending"
        ).lte(
            "scheduled_at", now.isoformat()
        ).order("priority", desc=True).order(
            "scheduled_at"
        ).limit(batch_size).execute()
        
        if not pending.data:
            return 0
        
        processed = 0
        
        for queue_item in pending.data:
            try:
                # Lock item
                lock_result = self.supabase.table("sequence_action_queue").update({
                    "status": "processing",
                    "picked_up_at": datetime.utcnow().isoformat(),
                    "worker_id": self.worker_id,
                }).eq("id", queue_item["id"]).eq("status", "pending").execute()
                
                if not lock_result.data:
                    # Already picked up by another worker
                    continue
                
                # Process action
                success = await self._execute_action(queue_item)
                
                if success:
                    # Mark completed
                    self.supabase.table("sequence_action_queue").update({
                        "status": "completed",
                        "completed_at": datetime.utcnow().isoformat(),
                    }).eq("id", queue_item["id"]).execute()
                    
                    processed += 1
                else:
                    # Mark failed or retry
                    retry_count = queue_item.get("retry_count", 0) + 1
                    max_retries = queue_item.get("max_retries", 3)
                    
                    if retry_count >= max_retries:
                        self.supabase.table("sequence_action_queue").update({
                            "status": "failed",
                            "retry_count": retry_count,
                        }).eq("id", queue_item["id"]).execute()
                    else:
                        # Retry in 5 minutes
                        retry_at = datetime.utcnow() + timedelta(minutes=5 * retry_count)
                        self.supabase.table("sequence_action_queue").update({
                            "status": "pending",
                            "retry_count": retry_count,
                            "scheduled_at": retry_at.isoformat(),
                            "picked_up_at": None,
                            "worker_id": None,
                        }).eq("id", queue_item["id"]).execute()
                
            except Exception as e:
                logger.error(f"Error processing action {queue_item['id']}: {e}")
                
                # Reset to pending for retry
                self.supabase.table("sequence_action_queue").update({
                    "status": "pending",
                    "picked_up_at": None,
                    "worker_id": None,
                    "last_error": str(e),
                }).eq("id", queue_item["id"]).execute()
        
        if processed > 0:
            logger.info(f"Processed {processed} actions")
        
        return processed
    
    async def _execute_action(self, queue_item: Dict) -> bool:
        """Führt eine einzelne Action aus."""
        enrollment_id = queue_item["enrollment_id"]
        step_id = queue_item["step_id"]
        
        # Enrollment prüfen
        enrollment = self.supabase.table("sequence_enrollments").select("*").eq(
            "id", enrollment_id
        ).single().execute()
        
        if not enrollment.data or enrollment.data["status"] != "active":
            logger.info(f"Enrollment {enrollment_id} not active, skipping")
            return True  # Mark as completed (nothing to do)
        
        # Step laden
        step = self.supabase.table("sequence_steps").select("*").eq(
            "id", step_id
        ).single().execute()
        
        if not step.data or not step.data.get("is_active"):
            logger.info(f"Step {step_id} not active, skipping")
            return True
        
        # Execute via Executor
        result = await self.executor.execute_step(
            enrollment=enrollment.data,
            step=step.data,
        )
        
        if result["success"]:
            # Advance to next step
            from .enrollment_service import EnrollmentService
            enrollment_service = EnrollmentService(self.supabase)
            await enrollment_service.advance_to_next_step(enrollment_id)
        
        return result["success"]
    
    # =========================================================================
    # QUEUE MANAGEMENT
    # =========================================================================
    
    async def get_queue_stats(self) -> Dict:
        """Gibt Stats über die Queue zurück."""
        now = datetime.utcnow()
        
        # Pending count
        pending = self.supabase.table("sequence_action_queue").select(
            "id", count="exact"
        ).eq("status", "pending").execute()
        
        # Overdue count
        overdue = self.supabase.table("sequence_action_queue").select(
            "id", count="exact"
        ).eq("status", "pending").lt(
            "scheduled_at", now.isoformat()
        ).execute()
        
        # Processing count
        processing = self.supabase.table("sequence_action_queue").select(
            "id", count="exact"
        ).eq("status", "processing").execute()
        
        # Failed count (last 24h)
        failed = self.supabase.table("sequence_action_queue").select(
            "id", count="exact"
        ).eq("status", "failed").gte(
            "created_at", (now - timedelta(hours=24)).isoformat()
        ).execute()
        
        return {
            "pending": pending.count or 0,
            "overdue": overdue.count or 0,
            "processing": processing.count or 0,
            "failed_24h": failed.count or 0,
        }
    
    async def clear_stale_processing(self, timeout_minutes: int = 30) -> int:
        """Setzt stale "processing" items zurück."""
        stale_threshold = datetime.utcnow() - timedelta(minutes=timeout_minutes)
        
        result = self.supabase.table("sequence_action_queue").update({
            "status": "pending",
            "picked_up_at": None,
            "worker_id": None,
        }).eq("status", "processing").lt(
            "picked_up_at", stale_threshold.isoformat()
        ).execute()
        
        count = len(result.data) if result.data else 0
        if count > 0:
            logger.info(f"Reset {count} stale processing items")
        
        return count

