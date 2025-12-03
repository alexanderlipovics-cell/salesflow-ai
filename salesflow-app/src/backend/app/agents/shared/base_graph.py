"""
Base Agent Graph

Abstrakte Basisklasse für alle LangGraph Agenten.
"""

import logging
from abc import ABC, abstractmethod
from typing import TypeVar, Generic, Optional, Any, Dict
from datetime import datetime

from langgraph.graph import StateGraph

logger = logging.getLogger(__name__)

StateType = TypeVar("StateType")


class BaseAgentGraph(ABC, Generic[StateType]):
    """
    Abstrakte Basisklasse für LangGraph Agenten.
    
    Bietet:
    - Einheitliches Error Handling
    - Logging
    - Metrics Collection
    - State Persistence
    """
    
    def __init__(
        self,
        name: str,
        db_connection_string: Optional[str] = None
    ):
        self.name = name
        self.db_connection_string = db_connection_string
        self._graph: Optional[StateGraph] = None
        self._compiled = False
    
    @abstractmethod
    def _build_graph(self) -> StateGraph:
        """
        Baut den Graph auf.
        Muss von Subklassen implementiert werden.
        """
        pass
    
    @abstractmethod
    def create_initial_state(self, **kwargs) -> StateType:
        """
        Erstellt den initialen State.
        Muss von Subklassen implementiert werden.
        """
        pass
    
    def compile(self) -> StateGraph:
        """
        Kompiliert den Graph.
        """
        if self._compiled and self._graph:
            return self._graph
        
        logger.info(f"Compiling {self.name} graph...")
        self._graph = self._build_graph()
        self._compiled = True
        
        return self._graph
    
    async def run(
        self,
        initial_state: StateType,
        config: Optional[Dict[str, Any]] = None
    ) -> StateType:
        """
        Führt den Agenten aus.
        """
        if not self._compiled:
            self.compile()
        
        start_time = datetime.utcnow()
        run_id = config.get("run_id") if config else "unknown"
        
        logger.info(f"[{run_id}] Starting {self.name} execution")
        
        try:
            result = await self._graph.ainvoke(initial_state, config=config)
            
            duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            logger.info(
                f"[{run_id}] {self.name} completed in {duration_ms:.0f}ms"
            )
            
            return result
            
        except Exception as e:
            logger.exception(f"[{run_id}] {self.name} failed: {e}")
            raise

