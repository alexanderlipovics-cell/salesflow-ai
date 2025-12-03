"""
Playbook Engine Service
Handles playbook execution logic and step progression
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from supabase import Client
import logging

logger = logging.getLogger(__name__)


class PlaybookEngine:
    """
    Engine for executing and managing sales playbooks
    """
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
    
    async def start_playbook(
        self, 
        playbook_id: str, 
        lead_id: str
    ) -> Dict[str, Any]:
        """
        Start a playbook for a specific lead
        
        Args:
            playbook_id: UUID of the playbook
            lead_id: UUID of the lead
            
        Returns:
            playbook_run record
        """
        try:
            # Get playbook
            playbook_result = self.supabase.table("playbooks")\
                .select("*")\
                .eq("id", playbook_id)\
                .eq("is_active", True)\
                .single()\
                .execute()
            
            if not playbook_result.data:
                raise ValueError(f"Playbook {playbook_id} not found or inactive")
            
            playbook = playbook_result.data
            
            # Create playbook run
            run_data = {
                "playbook_id": playbook_id,
                "lead_id": lead_id,
                "status": "active",
                "current_step_index": 0,
                "start_date": datetime.now().isoformat(),
                "next_action_date": datetime.now().isoformat(),
                "history": []
            }
            
            result = self.supabase.table("playbook_runs")\
                .insert(run_data)\
                .execute()
            
            logger.info(f"Started playbook {playbook_id} for lead {lead_id}")
            
            return result.data[0] if result.data else None
            
        except Exception as e:
            logger.error(f"Error starting playbook: {repr(e)}")
            raise
    
    async def advance_step(
        self, 
        run_id: str, 
        outcome: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Advance a playbook run to the next step
        
        Args:
            run_id: UUID of the playbook run
            outcome: Optional outcome of current step
            
        Returns:
            Updated playbook_run record
        """
        try:
            # Get current run
            run_result = self.supabase.table("playbook_runs")\
                .select("*")\
                .eq("id", run_id)\
                .single()\
                .execute()
            
            if not run_result.data:
                raise ValueError(f"Playbook run {run_id} not found")
            
            run = run_result.data
            
            # Get playbook to check total steps
            playbook_result = self.supabase.table("playbooks")\
                .select("steps")\
                .eq("id", run["playbook_id"])\
                .single()\
                .execute()
            
            playbook = playbook_result.data
            steps = playbook.get("steps", [])
            total_steps = len(steps)
            
            current_index = run["current_step_index"]
            next_index = current_index + 1
            
            # Update history
            history = run.get("history", [])
            history.append({
                "step_index": current_index,
                "completed_at": datetime.now().isoformat(),
                "outcome": outcome
            })
            
            # Check if completed
            if next_index >= total_steps:
                status = "completed"
                next_action_date = None
            else:
                status = "active"
                # Schedule next action (example: +1 day)
                next_action_date = (datetime.now() + timedelta(days=1)).isoformat()
            
            # Update run
            update_data = {
                "current_step_index": next_index,
                "status": status,
                "last_action_date": datetime.now().isoformat(),
                "next_action_date": next_action_date,
                "history": history
            }
            
            result = self.supabase.table("playbook_runs")\
                .update(update_data)\
                .eq("id", run_id)\
                .execute()
            
            logger.info(f"Advanced playbook run {run_id} to step {next_index}")
            
            return result.data[0] if result.data else None
            
        except Exception as e:
            logger.error(f"Error advancing playbook step: {repr(e)}")
            raise
    
    async def get_due_actions(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get all playbook runs with due actions
        
        Args:
            limit: Maximum number of results
            
        Returns:
            List of playbook runs due for action
        """
        try:
            result = self.supabase.table("playbook_runs")\
                .select("*, playbooks(name), leads(name)")\
                .eq("status", "active")\
                .lte("next_action_date", datetime.now().isoformat())\
                .order("next_action_date")\
                .limit(limit)\
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Error fetching due actions: {repr(e)}")
            raise
    
    async def pause_playbook(self, run_id: str) -> Dict[str, Any]:
        """
        Pause a playbook run
        
        Args:
            run_id: UUID of the playbook run
            
        Returns:
            Updated playbook_run record
        """
        try:
            result = self.supabase.table("playbook_runs")\
                .update({"status": "paused"})\
                .eq("id", run_id)\
                .execute()
            
            logger.info(f"Paused playbook run {run_id}")
            
            return result.data[0] if result.data else None
            
        except Exception as e:
            logger.error(f"Error pausing playbook: {repr(e)}")
            raise
    
    async def resume_playbook(self, run_id: str) -> Dict[str, Any]:
        """
        Resume a paused playbook run
        
        Args:
            run_id: UUID of the playbook run
            
        Returns:
            Updated playbook_run record
        """
        try:
            result = self.supabase.table("playbook_runs")\
                .update({
                    "status": "active",
                    "next_action_date": datetime.now().isoformat()
                })\
                .eq("id", run_id)\
                .execute()
            
            logger.info(f"Resumed playbook run {run_id}")
            
            return result.data[0] if result.data else None
            
        except Exception as e:
            logger.error(f"Error resuming playbook: {repr(e)}")
            raise

