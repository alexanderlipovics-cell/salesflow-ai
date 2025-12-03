"""
Playbook Engine
Business logic for managing and executing sales playbooks
"""
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class PlaybookEngine:
    """
    Manages playbook enrollments, tracking, and recommendations
    """
    
    def __init__(self, supabase_client=None):
        """
        Initialize Playbook Engine
        
        Args:
            supabase_client: Optional Supabase client for database operations
        """
        self.supabase = supabase_client
    
    def recommend_playbook(
        self, 
        objection_category: str, 
        user_experience_level: str = "intermediate",
        lead_context: Optional[Dict] = None
    ) -> Optional[Dict]:
        """
        Recommend best playbook for given situation
        
        Args:
            objection_category: Category of objection (e.g., "Preis", "Zeit")
            user_experience_level: "beginner", "intermediate", "advanced"
            lead_context: Additional context about the lead
            
        Returns:
            Recommended playbook or None
        """
        try:
            # Map difficulty to experience level
            recommended_difficulty = {
                "beginner": ["beginner", "intermediate"],
                "intermediate": ["beginner", "intermediate", "advanced"],
                "advanced": ["intermediate", "advanced"]
            }.get(user_experience_level, ["intermediate"])
            
            # Mock recommendation logic - replace with actual database query
            playbooks = self._get_mock_playbooks()
            
            # Filter by category
            matches = [
                p for p in playbooks 
                if p["category"] == objection_category 
                and p["difficulty"] in recommended_difficulty
            ]
            
            if not matches:
                return None
            
            # Sort by success rate and return best match
            matches.sort(key=lambda x: x.get("success_rate", 0), reverse=True)
            
            return matches[0]
            
        except Exception as e:
            logger.error(f"Error recommending playbook: {repr(e)}")
            return None
    
    def enroll_user_in_playbook(
        self,
        user_id: str,
        playbook_id: str,
        lead_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Enroll user in a playbook for guided execution
        
        Args:
            user_id: User ID
            playbook_id: Playbook to enroll in
            lead_id: Optional lead this playbook is for
            
        Returns:
            Enrollment details
        """
        try:
            enrollment = {
                "id": f"enroll_{user_id}_{playbook_id}_{datetime.now().timestamp()}",
                "user_id": user_id,
                "playbook_id": playbook_id,
                "lead_id": lead_id,
                "status": "active",
                "current_step": 1,
                "started_at": datetime.now().isoformat(),
                "completed_steps": [],
                "notes": []
            }
            
            # TODO: Save to database
            logger.info(f"User {user_id} enrolled in playbook {playbook_id}")
            
            return enrollment
            
        except Exception as e:
            logger.error(f"Error enrolling in playbook: {repr(e)}")
            raise
    
    def get_due_tasks(self, user_id: str) -> List[Dict]:
        """
        Get playbook tasks that are due or overdue
        
        Args:
            user_id: User ID
            
        Returns:
            List of due playbook tasks
        """
        try:
            # Mock data - replace with actual database query
            now = datetime.now()
            
            due_tasks = [
                {
                    "enrollment_id": "enroll_123",
                    "playbook_id": "pb_1",
                    "playbook_title": "Preis-Einwand: Value Reframe",
                    "current_step": 2,
                    "step_title": "Reframe auf Opportunitätskosten",
                    "due_at": (now - timedelta(hours=2)).isoformat(),
                    "priority": "high",
                    "lead_name": "Max Mustermann"
                }
            ]
            
            return due_tasks
            
        except Exception as e:
            logger.error(f"Error getting due tasks: {repr(e)}")
            return []
    
    def execute_step(
        self,
        enrollment_id: str,
        step_number: int,
        outcome: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Mark a playbook step as executed
        
        Args:
            enrollment_id: Enrollment ID
            step_number: Step that was executed
            outcome: "success", "partial", "failed"
            notes: Optional notes about execution
            
        Returns:
            Updated enrollment status
        """
        try:
            # TODO: Update database
            result = {
                "enrollment_id": enrollment_id,
                "step_executed": step_number,
                "outcome": outcome,
                "executed_at": datetime.now().isoformat(),
                "next_step": step_number + 1 if outcome == "success" else step_number,
                "notes": notes
            }
            
            logger.info(f"Step {step_number} executed for enrollment {enrollment_id}: {outcome}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error executing step: {repr(e)}")
            raise
    
    def get_metrics(self, playbook_id: str) -> Dict[str, Any]:
        """
        Get analytics metrics for a playbook
        
        Args:
            playbook_id: Playbook ID
            
        Returns:
            Metrics dictionary
        """
        try:
            # Mock metrics - replace with actual database aggregation
            metrics = {
                "playbook_id": playbook_id,
                "total_enrollments": 47,
                "completed": 31,
                "in_progress": 12,
                "abandoned": 4,
                "avg_completion_time_hours": 18.5,
                "success_rate": 0.78,
                "most_common_exit_step": 3,
                "user_feedback_avg": 4.2,
                "monthly_trend": [
                    {"month": "Oct", "enrollments": 12, "completions": 9},
                    {"month": "Nov", "enrollments": 18, "completions": 14},
                    {"month": "Dec", "enrollments": 17, "completions": 8}
                ]
            }
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting metrics: {repr(e)}")
            return {}
    
    def _get_mock_playbooks(self) -> List[Dict]:
        """Get mock playbook data - replace with database query"""
        return [
            {
                "id": "pb_1",
                "title": "Preis-Einwand: Value Reframe",
                "category": "Preis",
                "difficulty": "beginner",
                "success_rate": 0.78
            },
            {
                "id": "pb_2",
                "title": "Zeit-Einwand: Urgency Builder",
                "category": "Zeit",
                "difficulty": "intermediate",
                "success_rate": 0.72
            },
            {
                "id": "pb_3",
                "title": "Vertrauen-Einwand: Social Proof Stack",
                "category": "Vertrauen",
                "difficulty": "beginner",
                "success_rate": 0.81
            },
            {
                "id": "pb_4",
                "title": "MLM-Pyramiden-Einwand",
                "category": "Network Marketing spezifisch",
                "difficulty": "advanced",
                "success_rate": 0.65
            }
        ]

