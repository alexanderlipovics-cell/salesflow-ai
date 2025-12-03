"""
Sequence Engine - Core Logic für Multi-Touch Sales Campaigns
Handles enrollment, scheduling, execution, and auto-optimization
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings
from supabase import create_client

logger = logging.getLogger(__name__)

class SequenceEngine:
    """Core engine for sequence automation"""
    
    def __init__(self):
        """Initialize Supabase connection"""
        self.supabase = create_client(
            settings.SUPABASE_URL, 
            settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
        )
    
    async def enroll_lead(
        self, 
        lead_id: str, 
        sequence_id: str,
        start_immediately: bool = True
    ) -> Dict[str, Any]:
        """
        Enroll a lead into a sequence
        
        Args:
            lead_id: UUID of the lead
            sequence_id: UUID of the sequence
            start_immediately: If True, first step executes within delay_hours
            
        Returns:
            Enrollment details
        """
        try:
            logger.info(f"📝 Enrolling lead {lead_id} into sequence {sequence_id}")
            
            # Check if lead is already enrolled
            existing = self.supabase.table('enrollments').select('*').match({
                'lead_id': lead_id,
                'sequence_id': sequence_id
            }).execute()
            
            if existing.data:
                logger.warning(f"⚠️  Lead already enrolled in this sequence")
                return {
                    "status": "already_enrolled",
                    "enrollment": existing.data[0]
                }
            
            # Get first step
            first_step = self.supabase.table('sequence_steps').select('*').match({
                'sequence_id': sequence_id,
                'step_order': 1
            }).single().execute()
            
            if not first_step.data:
                raise Exception("Sequence has no steps")
            
            # Calculate next step time
            delay_hours = first_step.data['delay_hours']
            next_step_at = datetime.utcnow() + timedelta(hours=delay_hours)
            
            # Create enrollment
            enrollment_data = {
                'lead_id': lead_id,
                'sequence_id': sequence_id,
                'status': 'active',
                'current_step_order': 0,  # 0 = nicht gestartet
                'next_step_at': next_step_at.isoformat(),
                'enrolled_at': datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table('enrollments').insert(enrollment_data).execute()
            
            logger.info(f"✅ Lead enrolled successfully. Next step at: {next_step_at}")
            
            return {
                "status": "enrolled",
                "enrollment": result.data[0],
                "next_step_at": next_step_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error enrolling lead: {e}")
            raise
    
    async def process_due_steps(self) -> Dict[str, Any]:
        """
        SCHEDULER: Process all enrollments that have a due next_step_at
        This should be called by a cron job or manual trigger
        
        Returns:
            Summary of processed steps
        """
        try:
            logger.info("⏰ Starting scheduler - checking for due steps...")
            
            # Get all due enrollments using the view
            due = self.supabase.table('due_enrollments').select('*').execute()
            
            if not due.data:
                logger.info("✅ No due steps found")
                return {
                    "status": "no_due_steps",
                    "processed": 0
                }
            
            logger.info(f"📋 Found {len(due.data)} due enrollments")
            
            processed = 0
            errors = 0
            
            for enrollment_data in due.data:
                try:
                    await self._execute_next_step(enrollment_data)
                    processed += 1
                except Exception as e:
                    logger.error(f"❌ Error processing enrollment {enrollment_data['id']}: {e}")
                    errors += 1
                    continue
            
            logger.info(f"✅ Scheduler complete: {processed} processed, {errors} errors")
            
            return {
                "status": "completed",
                "processed": processed,
                "errors": errors,
                "total_due": len(due.data)
            }
            
        except Exception as e:
            logger.error(f"❌ Scheduler error: {e}")
            raise
    
    async def _execute_next_step(self, enrollment_data: Dict[str, Any]) -> None:
        """
        Execute the next step for an enrollment
        
        Args:
            enrollment_data: Full enrollment data from due_enrollments view
        """
        try:
            enrollment_id = enrollment_data['id']
            current_step_order = enrollment_data['current_step_order']
            next_step_order = current_step_order + 1
            
            logger.info(f"⚡ Executing step {next_step_order} for enrollment {enrollment_id}")
            
            # Get the step details
            step = self.supabase.table('sequence_steps').select('*').match({
                'sequence_id': enrollment_data['sequence_id'],
                'step_order': next_step_order
            }).single().execute()
            
            if not step.data:
                # No more steps - complete the enrollment
                logger.info(f"✅ Sequence completed for enrollment {enrollment_id}")
                self.supabase.table('enrollments').update({
                    'status': 'completed',
                    'completed_at': datetime.utcnow().isoformat(),
                    'outcome': 'completed'
                }).eq('id', enrollment_id).execute()
                return
            
            step_data = step.data
            
            # Log this step execution in history
            history_entry = {
                'enrollment_id': enrollment_id,
                'step_id': step_data['id'],
                'status': 'sent',
                'executed_at': datetime.utcnow().isoformat(),
                'channel': step_data['type']
            }
            
            self.supabase.table('enrollment_history').insert(history_entry).execute()
            
            # Update step stats
            await self._update_step_stats(step_data['id'], 'total_sent')
            
            # Calculate next step time
            next_step = self.supabase.table('sequence_steps').select('*').match({
                'sequence_id': enrollment_data['sequence_id'],
                'step_order': next_step_order + 1
            }).execute()
            
            if next_step.data:
                # There's another step
                delay_hours = next_step.data[0]['delay_hours']
                next_step_at = datetime.utcnow() + timedelta(hours=delay_hours)
                
                self.supabase.table('enrollments').update({
                    'current_step_order': next_step_order,
                    'next_step_at': next_step_at.isoformat(),
                    'steps_completed': enrollment_data.get('steps_completed', 0) + 1
                }).eq('id', enrollment_id).execute()
                
                logger.info(f"✅ Step {next_step_order} executed. Next: {next_step_at}")
            else:
                # This was the last step
                self.supabase.table('enrollments').update({
                    'current_step_order': next_step_order,
                    'status': 'completed',
                    'completed_at': datetime.utcnow().isoformat(),
                    'next_step_at': None,
                    'outcome': 'completed',
                    'steps_completed': enrollment_data.get('steps_completed', 0) + 1
                }).eq('id', enrollment_id).execute()
                
                logger.info(f"✅ Sequence completed for enrollment {enrollment_id}")
            
        except Exception as e:
            logger.error(f"❌ Error executing step: {e}")
            
            # Log failed execution
            self.supabase.table('enrollment_history').insert({
                'enrollment_id': enrollment_data['id'],
                'step_id': step_data.get('id') if 'step_data' in locals() else None,
                'status': 'failed',
                'executed_at': datetime.utcnow().isoformat(),
                'error_message': str(e)
            }).execute()
            
            raise
    
    async def handle_interaction(
        self, 
        lead_id: str, 
        interaction_type: str
    ) -> Dict[str, Any]:
        """
        Handle lead interaction (reply, meeting, opt-out)
        Auto-pauses or completes sequences based on interaction
        
        Args:
            lead_id: UUID of the lead
            interaction_type: 'reply', 'meeting_booked', 'opt_out', 'bounced'
            
        Returns:
            Status of updated enrollments
        """
        try:
            logger.info(f"🎯 Handling {interaction_type} for lead {lead_id}")
            
            # Get all active enrollments for this lead
            enrollments = self.supabase.table('enrollments').select('*').match({
                'lead_id': lead_id,
                'status': 'active'
            }).execute()
            
            if not enrollments.data:
                logger.info("ℹ️  No active enrollments for this lead")
                return {"status": "no_active_enrollments"}
            
            updated_count = 0
            
            for enrollment in enrollments.data:
                # Determine action based on interaction type
                if interaction_type == 'reply':
                    # Pause sequence - they responded!
                    self.supabase.table('enrollments').update({
                        'status': 'paused',
                        'paused_at': datetime.utcnow().isoformat(),
                        'outcome': 'reply_received',
                        'outcome_note': 'Lead replied - sequence auto-paused'
                    }).eq('id', enrollment['id']).execute()
                    
                    logger.info(f"✅ Paused enrollment {enrollment['id']} - lead replied")
                    updated_count += 1
                    
                elif interaction_type == 'meeting_booked':
                    # Complete sequence - goal achieved!
                    self.supabase.table('enrollments').update({
                        'status': 'completed',
                        'completed_at': datetime.utcnow().isoformat(),
                        'outcome': 'meeting_booked',
                        'outcome_note': 'Meeting booked - sequence goal achieved'
                    }).eq('id', enrollment['id']).execute()
                    
                    logger.info(f"✅ Completed enrollment {enrollment['id']} - meeting booked")
                    updated_count += 1
                    
                elif interaction_type == 'opt_out':
                    # Cancel sequence - they opted out
                    self.supabase.table('enrollments').update({
                        'status': 'cancelled',
                        'completed_at': datetime.utcnow().isoformat(),
                        'outcome': 'opt_out',
                        'outcome_note': 'Lead opted out'
                    }).eq('id', enrollment['id']).execute()
                    
                    logger.info(f"✅ Cancelled enrollment {enrollment['id']} - opt out")
                    updated_count += 1
                    
                elif interaction_type == 'bounced':
                    # Mark as bounced
                    self.supabase.table('enrollments').update({
                        'status': 'bounced',
                        'outcome': 'bounced',
                        'outcome_note': 'Email bounced - invalid address'
                    }).eq('id', enrollment['id']).execute()
                    
                    logger.info(f"✅ Bounced enrollment {enrollment['id']}")
                    updated_count += 1
            
            return {
                "status": "success",
                "updated_enrollments": updated_count,
                "interaction_type": interaction_type
            }
            
        except Exception as e:
            logger.error(f"❌ Error handling interaction: {e}")
            raise
    
    async def _update_step_stats(self, step_id: str, field: str) -> None:
        """
        Increment a stat field on a sequence step
        
        Args:
            step_id: UUID of the step
            field: Field to increment ('total_sent', 'total_opened', 'total_replied', 'total_completed')
        """
        try:
            # Fetch current value
            step = self.supabase.table('sequence_steps').select(field).eq('id', step_id).single().execute()
            
            if not step.data:
                logger.warning(f"⚠️  Step {step_id} not found")
                return
            
            current_value = step.data.get(field, 0)
            new_value = current_value + 1
            
            # Update
            self.supabase.table('sequence_steps').update({
                field: new_value
            }).eq('id', step_id).execute()
            
            logger.debug(f"📊 Updated {field} for step {step_id}: {current_value} → {new_value}")
            
        except Exception as e:
            logger.error(f"❌ Error updating step stats: {e}")
            # Don't raise - stats update failure shouldn't break the flow
    
    async def pause_enrollment(self, enrollment_id: str, reason: str = None) -> Dict[str, Any]:
        """
        Manually pause an enrollment
        
        Args:
            enrollment_id: UUID of the enrollment
            reason: Optional reason for pausing
            
        Returns:
            Updated enrollment
        """
        try:
            logger.info(f"⏸️  Pausing enrollment {enrollment_id}")
            
            result = self.supabase.table('enrollments').update({
                'status': 'paused',
                'paused_at': datetime.utcnow().isoformat(),
                'outcome_note': reason or 'Manually paused'
            }).eq('id', enrollment_id).execute()
            
            return {
                "status": "paused",
                "enrollment": result.data[0] if result.data else None
            }
            
        except Exception as e:
            logger.error(f"❌ Error pausing enrollment: {e}")
            raise
    
    async def resume_enrollment(self, enrollment_id: str) -> Dict[str, Any]:
        """
        Resume a paused enrollment
        
        Args:
            enrollment_id: UUID of the enrollment
            
        Returns:
            Updated enrollment
        """
        try:
            logger.info(f"▶️  Resuming enrollment {enrollment_id}")
            
            # Get enrollment
            enrollment = self.supabase.table('enrollments').select('*').eq(
                'id', enrollment_id
            ).single().execute()
            
            if not enrollment.data:
                raise Exception("Enrollment not found")
            
            # Recalculate next step time
            current_order = enrollment.data['current_step_order']
            next_order = current_order + 1
            
            next_step = self.supabase.table('sequence_steps').select('*').match({
                'sequence_id': enrollment.data['sequence_id'],
                'step_order': next_order
            }).execute()
            
            if not next_step.data:
                raise Exception("No next step available")
            
            delay_hours = next_step.data[0]['delay_hours']
            next_step_at = datetime.utcnow() + timedelta(hours=delay_hours)
            
            # Resume
            result = self.supabase.table('enrollments').update({
                'status': 'active',
                'next_step_at': next_step_at.isoformat(),
                'paused_at': None
            }).eq('id', enrollment_id).execute()
            
            logger.info(f"✅ Enrollment resumed. Next step at: {next_step_at}")
            
            return {
                "status": "resumed",
                "enrollment": result.data[0] if result.data else None
            }
            
        except Exception as e:
            logger.error(f"❌ Error resuming enrollment: {e}")
            raise
    
    async def get_sequence_analytics(self, sequence_id: str) -> Dict[str, Any]:
        """
        Get detailed analytics for a sequence
        
        Args:
            sequence_id: UUID of the sequence
            
        Returns:
            Analytics overview and per-step stats
        """
        try:
            logger.info(f"📊 Fetching analytics for sequence {sequence_id}")
            
            # Get sequence info
            sequence = self.supabase.table('sequences').select('*').eq(
                'id', sequence_id
            ).single().execute()
            
            if not sequence.data:
                raise Exception("Sequence not found")
            
            # Get enrollments stats
            enrollments = self.supabase.table('enrollments').select('*').eq(
                'sequence_id', sequence_id
            ).execute()
            
            total = len(enrollments.data)
            active = sum(1 for e in enrollments.data if e['status'] == 'active')
            completed = sum(1 for e in enrollments.data if e['status'] == 'completed')
            meetings = sum(1 for e in enrollments.data if e['outcome'] == 'meeting_booked')
            replies = sum(1 for e in enrollments.data if e['outcome'] == 'reply_received')
            
            # Get steps with stats
            steps = self.supabase.table('sequence_steps').select('*').eq(
                'sequence_id', sequence_id
            ).order('step_order').execute()
            
            step_stats = []
            for step in steps.data:
                sent = step.get('total_sent', 0)
                opened = step.get('total_opened', 0)
                replied = step.get('total_replied', 0)
                
                step_stats.append({
                    "step_order": step['step_order'],
                    "step_name": step['step_name'],
                    "type": step['type'],
                    "total_sent": sent,
                    "total_opened": opened,
                    "total_replied": replied,
                    "open_rate": round((opened / sent * 100), 2) if sent > 0 else 0,
                    "reply_rate": round((replied / sent * 100), 2) if sent > 0 else 0
                })
            
            return {
                "sequence": {
                    "id": sequence_id,
                    "name": sequence.data['name'],
                    "is_active": sequence.data['is_active']
                },
                "overview": {
                    "total_enrollments": total,
                    "active": active,
                    "completed": completed,
                    "meetings_booked": meetings,
                    "replies_received": replies,
                    "success_rate": round((meetings + replies) / total * 100, 2) if total > 0 else 0
                },
                "steps": step_stats
            }
            
        except Exception as e:
            logger.error(f"❌ Error fetching analytics: {e}")
            raise

# Singleton instance
sequence_engine = SequenceEngine()

