"""
╔════════════════════════════════════════════════════════════════════════════╗
║  JOB WORKER                                                                ║
║  Background Worker Process for Job Execution                               ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    # Start worker as standalone process
    python -m app.services.jobs.job_worker
    
    # Or integrate with FastAPI background tasks
    from app.services.jobs import JobWorker
    
    worker = JobWorker()
    await worker.run_once()  # Process one batch
    await worker.run_forever()  # Continuous processing
"""

import asyncio
import signal
import logging
from typing import Optional, List, Callable, Dict, Any
from datetime import datetime

from .job_service import JobService, Job, JobType, JobStatus
from .job_handlers import get_handler, JOB_HANDLERS

logger = logging.getLogger(__name__)


class JobWorker:
    """
    Background worker that processes scheduled jobs.
    
    Features:
    - Concurrent job processing
    - Graceful shutdown
    - Error handling with retries
    - Configurable batch size and polling interval
    """
    
    def __init__(
        self,
        batch_size: int = 10,
        poll_interval: float = 5.0,
        job_types: Optional[List[JobType]] = None,
        max_concurrent: int = 5,
    ):
        """
        Initialize the job worker.
        
        Args:
            batch_size: Number of jobs to fetch per batch
            poll_interval: Seconds between polling for new jobs
            job_types: Filter for specific job types (None = all)
            max_concurrent: Max concurrent job executions
        """
        self.batch_size = batch_size
        self.poll_interval = poll_interval
        self.job_types = job_types
        self.max_concurrent = max_concurrent
        
        self.job_service = JobService()
        self._running = False
        self._shutdown_event = asyncio.Event()
        self._semaphore = asyncio.Semaphore(max_concurrent)
    
    # ─────────────────────────────────────────────────────────────────────────
    # MAIN LOOP
    # ─────────────────────────────────────────────────────────────────────────
    
    async def run_forever(self):
        """
        Main worker loop - runs until shutdown signal.
        
        Continuously polls for and processes pending jobs.
        """
        self._running = True
        logger.info(
            f"🚀 Job Worker started (batch={self.batch_size}, "
            f"interval={self.poll_interval}s, max_concurrent={self.max_concurrent})"
        )
        
        # Setup signal handlers for graceful shutdown
        self._setup_signal_handlers()
        
        while self._running:
            try:
                # Process one batch of jobs
                processed = await self.run_once()
                
                if processed == 0:
                    # No jobs found, wait before polling again
                    try:
                        await asyncio.wait_for(
                            self._shutdown_event.wait(),
                            timeout=self.poll_interval
                        )
                    except asyncio.TimeoutError:
                        pass
                    
            except Exception as e:
                logger.exception(f"Worker error: {e}")
                await asyncio.sleep(self.poll_interval)
        
        logger.info("👋 Job Worker stopped gracefully")
    
    async def run_once(self) -> int:
        """
        Process one batch of pending jobs.
        
        Returns:
            Number of jobs processed
        """
        # Fetch pending jobs
        jobs = await self.job_service.get_pending_jobs(
            limit=self.batch_size,
            job_types=self.job_types,
        )
        
        if not jobs:
            return 0
        
        logger.info(f"Processing {len(jobs)} jobs")
        
        # Execute jobs concurrently (with semaphore limiting)
        tasks = [self._execute_with_semaphore(job) for job in jobs]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Log results
        success = sum(1 for r in results if r is True)
        failed = sum(1 for r in results if r is False or isinstance(r, Exception))
        
        logger.info(f"Batch complete: {success} success, {failed} failed")
        
        return len(jobs)
    
    async def _execute_with_semaphore(self, job: Job) -> bool:
        """Execute a job with concurrency limiting."""
        async with self._semaphore:
            return await self._execute_job(job)
    
    # ─────────────────────────────────────────────────────────────────────────
    # JOB EXECUTION
    # ─────────────────────────────────────────────────────────────────────────
    
    async def _execute_job(self, job: Job) -> bool:
        """
        Execute a single job.
        
        Args:
            job: Job to execute
            
        Returns:
            True if successful, False if failed
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Executing job: {job.job_type.value} (ID: {job.id})")
            
            # Get handler for this job type
            handler = get_handler(job.job_type)
            
            if handler is None:
                raise ValueError(f"No handler registered for job type: {job.job_type.value}")
            
            # Execute the handler
            result = await handler(job)
            
            # Mark as complete
            await self.job_service.complete_job(job.id, result)
            
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            logger.info(
                f"✅ Job completed: {job.job_type.value} "
                f"(ID: {job.id}, time: {execution_time:.0f}ms)"
            )
            
            return True
            
        except Exception as e:
            error_msg = str(e)
            logger.exception(f"❌ Job failed: {job.job_type.value} (ID: {job.id})")
            
            try:
                await self.job_service.fail_job(job.id, error_msg)
            except Exception as fail_error:
                logger.error(f"Could not update job status: {fail_error}")
            
            return False
    
    # ─────────────────────────────────────────────────────────────────────────
    # LIFECYCLE
    # ─────────────────────────────────────────────────────────────────────────
    
    def _setup_signal_handlers(self):
        """Setup handlers for graceful shutdown."""
        try:
            loop = asyncio.get_event_loop()
            for sig in (signal.SIGTERM, signal.SIGINT):
                loop.add_signal_handler(sig, self._handle_shutdown)
        except (RuntimeError, NotImplementedError):
            # Signal handlers not supported (e.g., Windows)
            pass
    
    def _handle_shutdown(self):
        """Handle shutdown signal."""
        logger.info("Shutdown signal received, finishing current jobs...")
        self._running = False
        self._shutdown_event.set()
    
    async def shutdown(self):
        """Programmatically trigger shutdown."""
        self._running = False
        self._shutdown_event.set()


# ═══════════════════════════════════════════════════════════════════════════════
# CLI ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

async def main():
    """Main entry point for running the worker."""
    import os
    import sys
    
    # Add parent directory for imports
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    # Parse arguments
    import argparse
    parser = argparse.ArgumentParser(description="Sales Flow AI Job Worker")
    parser.add_argument("--batch-size", type=int, default=10, help="Jobs per batch")
    parser.add_argument("--interval", type=float, default=5.0, help="Poll interval (seconds)")
    parser.add_argument("--max-concurrent", type=int, default=5, help="Max concurrent jobs")
    parser.add_argument("--once", action="store_true", help="Run once then exit")
    args = parser.parse_args()
    
    # Create and run worker
    worker = JobWorker(
        batch_size=args.batch_size,
        poll_interval=args.interval,
        max_concurrent=args.max_concurrent,
    )
    
    if args.once:
        processed = await worker.run_once()
        print(f"Processed {processed} jobs")
    else:
        await worker.run_forever()


if __name__ == "__main__":
    asyncio.run(main())

