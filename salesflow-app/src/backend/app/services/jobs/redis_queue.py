"""
╔════════════════════════════════════════════════════════════════════════════╗
║  REDIS QUEUE SERVICE                                                       ║
║  Redis-basierte Job Queue für High-Performance Processing                  ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- Redis-basierte Queue für schnelles Processing
- Prioritäts-Queues (high, default, low)
- Delayed Jobs (schedule for later)
- Dead Letter Queue für Failed Jobs
- Retry mit exponential backoff

Usage:
    from app.services.jobs.redis_queue import RedisQueue
    
    queue = RedisQueue()
    
    # Enqueue a job
    job_id = await queue.enqueue(
        job_type="follow_up_reminder",
        payload={"contact_id": "...", "message": "..."},
        priority="high",
        delay_seconds=3600  # In 1 hour
    )
    
    # Process jobs (in worker)
    async for job in queue.dequeue():
        result = await process_job(job)
        await queue.complete(job)
"""

import json
import uuid
import logging
from typing import Optional, Dict, Any, AsyncIterator, List
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

class QueuePriority(str, Enum):
    """Queue Prioritäten."""
    HIGH = "high"
    DEFAULT = "default"
    LOW = "low"


# Queue Namen
QUEUE_NAMES = {
    QueuePriority.HIGH: "jobs:high",
    QueuePriority.DEFAULT: "jobs:default",
    QueuePriority.LOW: "jobs:low",
}

DELAYED_QUEUE = "jobs:delayed"
PROCESSING_QUEUE = "jobs:processing"
DEAD_LETTER_QUEUE = "jobs:dead"


# ═══════════════════════════════════════════════════════════════════════════════
# JOB DATA CLASS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class QueueJob:
    """Ein Job in der Queue."""
    id: str
    job_type: str
    payload: Dict[str, Any]
    priority: QueuePriority = QueuePriority.DEFAULT
    
    # Scheduling
    created_at: datetime = field(default_factory=datetime.utcnow)
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    
    # Retry
    attempts: int = 0
    max_attempts: int = 3
    last_error: Optional[str] = None
    
    # Metadata
    user_id: Optional[str] = None
    company_id: Optional[str] = None
    
    def to_json(self) -> str:
        """Serialisiert Job zu JSON."""
        return json.dumps({
            "id": self.id,
            "job_type": self.job_type,
            "payload": self.payload,
            "priority": self.priority.value,
            "created_at": self.created_at.isoformat(),
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "attempts": self.attempts,
            "max_attempts": self.max_attempts,
            "last_error": self.last_error,
            "user_id": self.user_id,
            "company_id": self.company_id,
        })
    
    @classmethod
    def from_json(cls, data: str) -> "QueueJob":
        """Deserialisiert Job von JSON."""
        d = json.loads(data)
        return cls(
            id=d["id"],
            job_type=d["job_type"],
            payload=d["payload"],
            priority=QueuePriority(d.get("priority", "default")),
            created_at=datetime.fromisoformat(d["created_at"]),
            scheduled_at=datetime.fromisoformat(d["scheduled_at"]) if d.get("scheduled_at") else None,
            started_at=datetime.fromisoformat(d["started_at"]) if d.get("started_at") else None,
            attempts=d.get("attempts", 0),
            max_attempts=d.get("max_attempts", 3),
            last_error=d.get("last_error"),
            user_id=d.get("user_id"),
            company_id=d.get("company_id"),
        )


# ═══════════════════════════════════════════════════════════════════════════════
# REDIS QUEUE (mit Fallback auf In-Memory)
# ═══════════════════════════════════════════════════════════════════════════════

class RedisQueue:
    """
    Redis-basierte Job Queue mit In-Memory Fallback.
    
    Wenn Redis nicht verfügbar ist, wird eine In-Memory Queue verwendet.
    Dies ermöglicht Entwicklung ohne Redis-Setup.
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialisiert die Queue.
        
        Args:
            redis_url: Redis Connection URL (optional, verwendet Settings wenn nicht angegeben)
        """
        self._redis = None
        self._redis_url = redis_url
        self._use_memory_fallback = False
        
        # In-Memory Fallback Queues
        self._memory_queues: Dict[str, List[str]] = {
            QUEUE_NAMES[QueuePriority.HIGH]: [],
            QUEUE_NAMES[QueuePriority.DEFAULT]: [],
            QUEUE_NAMES[QueuePriority.LOW]: [],
            DELAYED_QUEUE: [],
            PROCESSING_QUEUE: [],
            DEAD_LETTER_QUEUE: [],
        }
        self._delayed_scores: Dict[str, float] = {}
    
    async def _get_redis(self):
        """Lazy-load Redis Connection."""
        if self._redis is not None:
            return self._redis
        
        try:
            import redis.asyncio as redis
            from ...core.config import settings
            
            url = self._redis_url or getattr(settings, "REDIS_URL", None)
            
            if not url:
                logger.warning("No REDIS_URL configured, using in-memory fallback")
                self._use_memory_fallback = True
                return None
            
            self._redis = redis.from_url(url, decode_responses=True)
            
            # Test connection
            await self._redis.ping()
            logger.info("Connected to Redis")
            
            return self._redis
            
        except ImportError:
            logger.warning("redis package not installed, using in-memory fallback")
            self._use_memory_fallback = True
            return None
            
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}, using in-memory fallback")
            self._use_memory_fallback = True
            return None
    
    # ─────────────────────────────────────────────────────────────────────────
    # ENQUEUE
    # ─────────────────────────────────────────────────────────────────────────
    
    async def enqueue(
        self,
        job_type: str,
        payload: Dict[str, Any],
        priority: QueuePriority = QueuePriority.DEFAULT,
        delay_seconds: int = 0,
        user_id: Optional[str] = None,
        company_id: Optional[str] = None,
        max_attempts: int = 3,
    ) -> str:
        """
        Fügt einen Job zur Queue hinzu.
        
        Args:
            job_type: Art des Jobs
            payload: Job-Daten
            priority: Priorität (high, default, low)
            delay_seconds: Verzögerung in Sekunden (0 = sofort)
            user_id: User ID (optional)
            company_id: Company ID (optional)
            max_attempts: Max Retry-Versuche
            
        Returns:
            Job ID
        """
        job = QueueJob(
            id=str(uuid.uuid4()),
            job_type=job_type,
            payload=payload,
            priority=priority,
            scheduled_at=datetime.utcnow() + timedelta(seconds=delay_seconds) if delay_seconds > 0 else None,
            user_id=user_id,
            company_id=company_id,
            max_attempts=max_attempts,
        )
        
        redis = await self._get_redis()
        
        if redis and not self._use_memory_fallback:
            # Redis Queue
            if delay_seconds > 0:
                # Delayed Queue (Sorted Set by execution time)
                score = (datetime.utcnow() + timedelta(seconds=delay_seconds)).timestamp()
                await redis.zadd(DELAYED_QUEUE, {job.to_json(): score})
            else:
                # Immediate Queue
                queue_name = QUEUE_NAMES[priority]
                await redis.lpush(queue_name, job.to_json())
        else:
            # In-Memory Fallback
            if delay_seconds > 0:
                score = (datetime.utcnow() + timedelta(seconds=delay_seconds)).timestamp()
                job_json = job.to_json()
                self._memory_queues[DELAYED_QUEUE].append(job_json)
                self._delayed_scores[job.id] = score
            else:
                queue_name = QUEUE_NAMES[priority]
                self._memory_queues[queue_name].insert(0, job.to_json())
        
        logger.debug(f"Enqueued job: {job_type} (ID: {job.id}, delay: {delay_seconds}s)")
        return job.id
    
    # ─────────────────────────────────────────────────────────────────────────
    # DEQUEUE
    # ─────────────────────────────────────────────────────────────────────────
    
    async def dequeue(
        self,
        timeout: int = 5,
    ) -> Optional[QueueJob]:
        """
        Holt den nächsten Job aus der Queue.
        
        Prüft zuerst delayed Jobs, dann nach Priorität.
        
        Args:
            timeout: Timeout in Sekunden
            
        Returns:
            Job oder None wenn Queue leer
        """
        redis = await self._get_redis()
        
        # 1. Zuerst Delayed Jobs prüfen und verschieben
        await self._move_ready_delayed_jobs()
        
        if redis and not self._use_memory_fallback:
            # Redis: BRPOP von Queues in Prioritätsreihenfolge
            queues = [
                QUEUE_NAMES[QueuePriority.HIGH],
                QUEUE_NAMES[QueuePriority.DEFAULT],
                QUEUE_NAMES[QueuePriority.LOW],
            ]
            
            result = await redis.brpop(queues, timeout=timeout)
            
            if result:
                queue_name, job_json = result
                job = QueueJob.from_json(job_json)
                job.started_at = datetime.utcnow()
                job.attempts += 1
                
                # In Processing Queue verschieben
                await redis.hset(PROCESSING_QUEUE, job.id, job.to_json())
                
                return job
        else:
            # In-Memory Fallback
            for priority in [QueuePriority.HIGH, QueuePriority.DEFAULT, QueuePriority.LOW]:
                queue_name = QUEUE_NAMES[priority]
                if self._memory_queues[queue_name]:
                    job_json = self._memory_queues[queue_name].pop()
                    job = QueueJob.from_json(job_json)
                    job.started_at = datetime.utcnow()
                    job.attempts += 1
                    return job
        
        return None
    
    async def _move_ready_delayed_jobs(self):
        """Verschiebt fällige delayed Jobs in die Haupt-Queue."""
        now = datetime.utcnow().timestamp()
        redis = await self._get_redis()
        
        if redis and not self._use_memory_fallback:
            # Get ready jobs from sorted set
            ready_jobs = await redis.zrangebyscore(DELAYED_QUEUE, 0, now)
            
            for job_json in ready_jobs:
                job = QueueJob.from_json(job_json)
                queue_name = QUEUE_NAMES[job.priority]
                
                # Move to main queue
                await redis.lpush(queue_name, job_json)
                await redis.zrem(DELAYED_QUEUE, job_json)
        else:
            # In-Memory Fallback
            ready_ids = [
                job_id for job_id, score in self._delayed_scores.items()
                if score <= now
            ]
            
            for job_id in ready_ids:
                # Find and move job
                for i, job_json in enumerate(self._memory_queues[DELAYED_QUEUE]):
                    job = QueueJob.from_json(job_json)
                    if job.id == job_id:
                        self._memory_queues[DELAYED_QUEUE].pop(i)
                        queue_name = QUEUE_NAMES[job.priority]
                        self._memory_queues[queue_name].insert(0, job_json)
                        del self._delayed_scores[job_id]
                        break
    
    # ─────────────────────────────────────────────────────────────────────────
    # JOB COMPLETION
    # ─────────────────────────────────────────────────────────────────────────
    
    async def complete(self, job: QueueJob, result: Optional[Dict[str, Any]] = None):
        """Markiert einen Job als erfolgreich abgeschlossen."""
        redis = await self._get_redis()
        
        if redis and not self._use_memory_fallback:
            await redis.hdel(PROCESSING_QUEUE, job.id)
        
        logger.info(f"Job completed: {job.job_type} (ID: {job.id})")
    
    async def fail(self, job: QueueJob, error: str):
        """
        Markiert einen Job als fehlgeschlagen.
        
        Retry wenn noch Versuche übrig, sonst Dead Letter Queue.
        """
        redis = await self._get_redis()
        job.last_error = error
        
        should_retry = job.attempts < job.max_attempts
        
        if should_retry:
            # Exponential backoff: 30s, 60s, 120s, etc.
            delay = 30 * (2 ** (job.attempts - 1))
            
            if redis and not self._use_memory_fallback:
                await redis.hdel(PROCESSING_QUEUE, job.id)
                score = (datetime.utcnow() + timedelta(seconds=delay)).timestamp()
                await redis.zadd(DELAYED_QUEUE, {job.to_json(): score})
            else:
                score = (datetime.utcnow() + timedelta(seconds=delay)).timestamp()
                self._memory_queues[DELAYED_QUEUE].append(job.to_json())
                self._delayed_scores[job.id] = score
            
            logger.warning(f"Job will retry in {delay}s: {job.job_type} (ID: {job.id})")
        else:
            # Dead Letter Queue
            if redis and not self._use_memory_fallback:
                await redis.hdel(PROCESSING_QUEUE, job.id)
                await redis.lpush(DEAD_LETTER_QUEUE, job.to_json())
            else:
                self._memory_queues[DEAD_LETTER_QUEUE].insert(0, job.to_json())
            
            logger.error(f"Job failed permanently: {job.job_type} (ID: {job.id})")
    
    # ─────────────────────────────────────────────────────────────────────────
    # QUEUE STATS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_stats(self) -> Dict[str, Any]:
        """Gibt Queue-Statistiken zurück."""
        redis = await self._get_redis()
        
        if redis and not self._use_memory_fallback:
            return {
                "high": await redis.llen(QUEUE_NAMES[QueuePriority.HIGH]),
                "default": await redis.llen(QUEUE_NAMES[QueuePriority.DEFAULT]),
                "low": await redis.llen(QUEUE_NAMES[QueuePriority.LOW]),
                "delayed": await redis.zcard(DELAYED_QUEUE),
                "processing": await redis.hlen(PROCESSING_QUEUE),
                "dead": await redis.llen(DEAD_LETTER_QUEUE),
                "backend": "redis",
            }
        else:
            return {
                "high": len(self._memory_queues[QUEUE_NAMES[QueuePriority.HIGH]]),
                "default": len(self._memory_queues[QUEUE_NAMES[QueuePriority.DEFAULT]]),
                "low": len(self._memory_queues[QUEUE_NAMES[QueuePriority.LOW]]),
                "delayed": len(self._memory_queues[DELAYED_QUEUE]),
                "processing": 0,  # Not tracked in memory mode
                "dead": len(self._memory_queues[DEAD_LETTER_QUEUE]),
                "backend": "memory",
            }


# ═══════════════════════════════════════════════════════════════════════════════
# SINGLETON & CONVENIENCE
# ═══════════════════════════════════════════════════════════════════════════════

_queue: Optional[RedisQueue] = None


def get_redis_queue() -> RedisQueue:
    """Gibt die Singleton Queue Instanz zurück."""
    global _queue
    if _queue is None:
        _queue = RedisQueue()
    return _queue


async def enqueue_job(
    job_type: str,
    payload: Dict[str, Any],
    **kwargs
) -> str:
    """Convenience Function zum Enqueuen eines Jobs."""
    queue = get_redis_queue()
    return await queue.enqueue(job_type, payload, **kwargs)

