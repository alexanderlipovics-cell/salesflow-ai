"""
Storybook Analytics Service
Tracking und Analyse für Stories, Produkte und Compliance
"""

from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import date, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import text


class StorybookAnalyticsService:
    """
    Service für Storybook Analytics
    - Story-Nutzung tracken
    - Compliance-Verstöße loggen
    - Performance-Metriken berechnen
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # =========================================================================
    # STORY USAGE TRACKING
    # =========================================================================
    
    def log_story_usage(
        self,
        story_id: UUID,
        user_id: UUID,
        company_id: UUID,
        usage_type: str,
        lead_id: Optional[UUID] = None,
        channel: Optional[str] = None,
        content_length: Optional[str] = None,
    ) -> UUID:
        """
        Loggt die Nutzung einer Story.
        
        Args:
            story_id: ID der Story
            user_id: ID des Users
            company_id: ID der Company
            usage_type: 'viewed', 'copied', 'used_in_chat', 'sent_to_lead'
            lead_id: Optional Lead-ID
            channel: Optional Kanal ('whatsapp', 'instagram', etc.)
            content_length: Optional Länge ('30s', '1min', '2min', 'full')
            
        Returns:
            ID des Log-Eintrags
        """
        result = self.db.execute(
            text("""
                INSERT INTO story_usage_logs (
                    story_id, user_id, company_id, usage_type,
                    lead_id, channel, content_length
                ) VALUES (
                    :story_id, :user_id, :company_id, :usage_type,
                    :lead_id, :channel, :content_length
                )
                RETURNING id
            """),
            {
                "story_id": str(story_id),
                "user_id": str(user_id),
                "company_id": str(company_id),
                "usage_type": usage_type,
                "lead_id": str(lead_id) if lead_id else None,
                "channel": channel,
                "content_length": content_length,
            }
        )
        self.db.commit()
        return result.fetchone()[0]
    
    def update_story_outcome(
        self,
        log_id: UUID,
        outcome: str,
    ):
        """
        Aktualisiert das Outcome eines Story-Usages.
        
        Args:
            log_id: ID des Log-Eintrags
            outcome: 'reply', 'positive_reply', 'meeting', 'deal', 'no_response'
        """
        self.db.execute(
            text("""
                UPDATE story_usage_logs
                SET outcome = :outcome
                WHERE id = :id
            """),
            {"id": str(log_id), "outcome": outcome}
        )
        self.db.commit()
    
    # =========================================================================
    # COMPLIANCE LOGGING
    # =========================================================================
    
    def log_compliance_check(
        self,
        user_id: UUID,
        checked_text: str,
        was_compliant: bool,
        violations: List[Dict],
        company_id: Optional[UUID] = None,
        text_type: Optional[str] = None,
        was_sent: bool = False,
    ) -> UUID:
        """
        Loggt einen Compliance-Check.
        
        Args:
            user_id: ID des Users
            checked_text: Der geprüfte Text
            was_compliant: War der Text compliant?
            violations: Liste der Verstöße
            company_id: Optional Company-ID
            text_type: 'message', 'post', 'ad', 'bio', 'other'
            was_sent: Wurde der Text trotzdem gesendet?
            
        Returns:
            ID des Log-Eintrags
        """
        import json
        
        has_blockers = any(v.get("severity") == "block" for v in violations)
        
        result = self.db.execute(
            text("""
                INSERT INTO compliance_violations_log (
                    user_id, company_id, checked_text, text_type,
                    was_compliant, violation_count, had_blockers,
                    violations, was_sent
                ) VALUES (
                    :user_id, :company_id, :checked_text, :text_type,
                    :was_compliant, :violation_count, :had_blockers,
                    :violations, :was_sent
                )
                RETURNING id
            """),
            {
                "user_id": str(user_id),
                "company_id": str(company_id) if company_id else None,
                "checked_text": checked_text[:1000],  # Limit
                "text_type": text_type,
                "was_compliant": was_compliant,
                "violation_count": len(violations),
                "had_blockers": has_blockers,
                "violations": json.dumps(violations),
                "was_sent": was_sent,
            }
        )
        self.db.commit()
        return result.fetchone()[0]
    
    def log_guardrail_trigger(
        self,
        guardrail_id: UUID,
        user_id: UUID,
        matched_text: str,
        matched_pattern: Optional[str] = None,
        suggestion_shown: Optional[str] = None,
        suggestion_accepted: Optional[bool] = None,
        company_id: Optional[UUID] = None,
    ):
        """
        Loggt wann eine Guardrail getriggert wurde.
        """
        self.db.execute(
            text("""
                INSERT INTO guardrail_triggers_log (
                    guardrail_id, user_id, company_id,
                    matched_text, matched_pattern,
                    suggestion_shown, suggestion_accepted
                ) VALUES (
                    :guardrail_id, :user_id, :company_id,
                    :matched_text, :matched_pattern,
                    :suggestion_shown, :suggestion_accepted
                )
            """),
            {
                "guardrail_id": str(guardrail_id),
                "user_id": str(user_id),
                "company_id": str(company_id) if company_id else None,
                "matched_text": matched_text[:500],
                "matched_pattern": matched_pattern,
                "suggestion_shown": suggestion_shown,
                "suggestion_accepted": suggestion_accepted,
            }
        )
        self.db.commit()
    
    # =========================================================================
    # PRODUCT USAGE
    # =========================================================================
    
    def log_product_usage(
        self,
        product_id: UUID,
        user_id: UUID,
        company_id: UUID,
        usage_type: str,
        lead_id: Optional[UUID] = None,
        objection_handled: Optional[str] = None,
    ):
        """
        Loggt die Nutzung eines Produkts.
        
        Args:
            product_id: ID des Produkts
            user_id: ID des Users
            company_id: ID der Company
            usage_type: 'viewed', 'pitch_copied', 'mentioned_in_chat', 'objection_handled'
            lead_id: Optional Lead-ID
            objection_handled: Optional Einwand der behandelt wurde
        """
        self.db.execute(
            text("""
                INSERT INTO product_usage_logs (
                    product_id, user_id, company_id,
                    usage_type, lead_id, objection_handled
                ) VALUES (
                    :product_id, :user_id, :company_id,
                    :usage_type, :lead_id, :objection_handled
                )
            """),
            {
                "product_id": str(product_id),
                "user_id": str(user_id),
                "company_id": str(company_id),
                "usage_type": usage_type,
                "lead_id": str(lead_id) if lead_id else None,
                "objection_handled": objection_handled,
            }
        )
        self.db.commit()
    
    # =========================================================================
    # ANALYTICS QUERIES
    # =========================================================================
    
    def get_top_stories(
        self,
        company_id: UUID,
        days: int = 30,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Holt die Top-Stories nach Performance.
        """
        result = self.db.execute(
            text("""
                SELECT * FROM story_performance_summary
                WHERE company_id = :company_id
                ORDER BY sends_30d DESC, copies_30d DESC
                LIMIT :limit
            """),
            {"company_id": str(company_id), "limit": limit}
        ).fetchall()
        
        return [dict(row._mapping) for row in result]
    
    def get_story_stats(
        self,
        story_id: UUID,
        days: int = 30,
    ) -> Dict[str, Any]:
        """
        Holt detaillierte Stats für eine Story.
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        result = self.db.execute(
            text("""
                SELECT 
                    cs.title,
                    cs.story_type,
                    cs.times_used,
                    COALESCE(SUM(spd.views), 0) as views,
                    COALESCE(SUM(spd.copies), 0) as copies,
                    COALESCE(SUM(spd.uses_in_chat), 0) as uses_in_chat,
                    COALESCE(SUM(spd.sends_to_lead), 0) as sends,
                    COALESCE(SUM(spd.replies), 0) as replies,
                    COALESCE(SUM(spd.deals), 0) as deals
                FROM company_stories cs
                LEFT JOIN story_performance_daily spd 
                    ON cs.id = spd.story_id
                    AND spd.date BETWEEN :start_date AND :end_date
                WHERE cs.id = :story_id
                GROUP BY cs.id, cs.title, cs.story_type, cs.times_used
            """),
            {
                "story_id": str(story_id),
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            }
        ).fetchone()
        
        if not result:
            return {}
        
        row = dict(result._mapping)
        
        # Raten berechnen
        if row["sends"] > 0:
            row["reply_rate"] = round(row["replies"] / row["sends"] * 100, 1)
            row["conversion_rate"] = round(row["deals"] / row["sends"] * 100, 1)
        else:
            row["reply_rate"] = None
            row["conversion_rate"] = None
        
        return row
    
    def get_compliance_stats(
        self,
        company_id: UUID,
        days: int = 30,
    ) -> Dict[str, Any]:
        """
        Holt Compliance-Statistiken.
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        result = self.db.execute(
            text("""
                SELECT 
                    COUNT(*) as total_checks,
                    SUM(CASE WHEN was_compliant THEN 1 ELSE 0 END) as compliant,
                    SUM(CASE WHEN NOT was_compliant THEN 1 ELSE 0 END) as violations,
                    SUM(CASE WHEN had_blockers THEN 1 ELSE 0 END) as blockers,
                    ROUND(
                        SUM(CASE WHEN was_compliant THEN 1 ELSE 0 END)::NUMERIC 
                        / NULLIF(COUNT(*), 0) * 100, 
                        1
                    ) as compliance_rate
                FROM compliance_violations_log
                WHERE company_id = :company_id
                  AND created_at::DATE BETWEEN :start_date AND :end_date
            """),
            {
                "company_id": str(company_id),
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            }
        ).fetchone()
        
        return dict(result._mapping) if result else {}
    
    def get_most_triggered_guardrails(
        self,
        company_id: UUID,
        days: int = 30,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Holt die am häufigsten getriggerten Guardrails.
        """
        result = self.db.execute(
            text("""
                SELECT 
                    cg.rule_name,
                    cg.severity,
                    COUNT(*) as trigger_count,
                    SUM(CASE WHEN gtl.suggestion_accepted THEN 1 ELSE 0 END) as accepted_count
                FROM guardrail_triggers_log gtl
                JOIN company_guardrails cg ON gtl.guardrail_id = cg.id
                WHERE (gtl.company_id = :company_id OR cg.company_id = :company_id)
                  AND gtl.created_at >= NOW() - :days * INTERVAL '1 day'
                GROUP BY cg.id, cg.rule_name, cg.severity
                ORDER BY trigger_count DESC
                LIMIT :limit
            """),
            {
                "company_id": str(company_id),
                "days": days,
                "limit": limit,
            }
        ).fetchall()
        
        return [dict(row._mapping) for row in result]
    
    def get_channel_performance(
        self,
        company_id: UUID,
        days: int = 30,
    ) -> List[Dict[str, Any]]:
        """
        Holt Performance nach Channel.
        """
        result = self.db.execute(
            text("""
                SELECT 
                    channel,
                    COUNT(*) as total_sends,
                    COUNT(*) FILTER (WHERE outcome = 'reply') as replies,
                    COUNT(*) FILTER (WHERE outcome = 'positive_reply') as positive_replies,
                    COUNT(*) FILTER (WHERE outcome = 'deal') as deals,
                    ROUND(
                        COUNT(*) FILTER (WHERE outcome IN ('reply', 'positive_reply'))::NUMERIC 
                        / NULLIF(COUNT(*), 0) * 100, 
                        1
                    ) as reply_rate
                FROM story_usage_logs
                WHERE company_id = :company_id
                  AND usage_type = 'sent_to_lead'
                  AND channel IS NOT NULL
                  AND created_at >= NOW() - :days * INTERVAL '1 day'
                GROUP BY channel
                ORDER BY total_sends DESC
            """),
            {
                "company_id": str(company_id),
                "days": days,
            }
        ).fetchall()
        
        return [dict(row._mapping) for row in result]
    
    def get_audience_performance(
        self,
        company_id: UUID,
        days: int = 30,
    ) -> List[Dict[str, Any]]:
        """
        Holt Performance nach Zielgruppe.
        """
        result = self.db.execute(
            text("""
                SELECT 
                    cs.audience,
                    COUNT(*) as total_sends,
                    COUNT(*) FILTER (WHERE sul.outcome = 'reply') as replies,
                    COUNT(*) FILTER (WHERE sul.outcome = 'deal') as deals,
                    ROUND(
                        COUNT(*) FILTER (WHERE sul.outcome IN ('reply', 'positive_reply'))::NUMERIC 
                        / NULLIF(COUNT(*), 0) * 100, 
                        1
                    ) as reply_rate
                FROM story_usage_logs sul
                JOIN company_stories cs ON sul.story_id = cs.id
                WHERE sul.company_id = :company_id
                  AND sul.usage_type = 'sent_to_lead'
                  AND sul.created_at >= NOW() - :days * INTERVAL '1 day'
                GROUP BY cs.audience
                ORDER BY total_sends DESC
            """),
            {
                "company_id": str(company_id),
                "days": days,
            }
        ).fetchall()
        
        return [dict(row._mapping) for row in result]

