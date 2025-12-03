"""
LangGraph Checkpointer

State Persistence für Agent Runs.
"""

import logging
from typing import Optional

from langgraph.checkpoint.base import BaseCheckpointSaver

logger = logging.getLogger(__name__)


def get_checkpointer(
    db_connection_string: Optional[str] = None,
    use_memory: bool = False
) -> Optional[BaseCheckpointSaver]:
    """
    Erstellt einen Checkpointer für State Persistence.
    
    Args:
        db_connection_string: PostgreSQL Connection String
        use_memory: Ob In-Memory Checkpointer verwendet werden soll
    
    Returns:
        Checkpointer Instance oder None
    """
    if use_memory:
        try:
            from langgraph.checkpoint.memory import MemorySaver
            logger.info("Using MemorySaver checkpointer")
            return MemorySaver()
        except ImportError:
            logger.warning("MemorySaver not available")
            return None
    
    if db_connection_string:
        try:
            from langgraph.checkpoint.postgres import PostgresSaver
            checkpointer = PostgresSaver.from_conn_string(db_connection_string)
            logger.info("Using PostgresSaver checkpointer")
            return checkpointer
        except ImportError:
            logger.warning("PostgresSaver not available - install langgraph-checkpoint-postgres")
        except Exception as e:
            logger.error(f"Failed to create PostgresSaver: {e}")
    
    logger.info("No checkpointer configured")
    return None

