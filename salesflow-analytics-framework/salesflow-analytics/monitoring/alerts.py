"""
SalesFlow AI - Business Alerts System
======================================

Intelligent alerting system that connects technical metrics
to business impact and routes alerts to the right people.

Features:
- Multi-channel notifications (Slack, Email, SMS, PagerDuty)
- Alert routing based on severity and category
- Alert aggregation to prevent spam
- Escalation policies
- On-call schedule integration
- Business context enrichment

Author: SalesFlow AI Team
Version: 1.0.0
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Optional
from collections import defaultdict
import re

logger = logging.getLogger(__name__)


# =============================================================================
# ENUMS & CONSTANTS
# =============================================================================

class AlertChannel(str, Enum):
    """Available alert notification channels."""
    SLACK = "slack"
    EMAIL = "email"
    SMS = "sms"
    PAGERDUTY = "pagerduty"
    WEBHOOK = "webhook"
    IN_APP = "in_app"
    TEAMS = "teams"


class AlertSeverity(str, Enum):
    """Alert severity levels."""
    INFO = "info"           # FYI - no action needed
    LOW = "low"             # Should be looked at eventually
    MEDIUM = "medium"       # Should be addressed today
    HIGH = "high"           # Needs attention soon
    CRITICAL = "critical"   # Drop everything
    PAGE = "page"           # Wake someone up


class AlertStatus(str, Enum):
    """Current status of an alert."""
    FIRING = "firing"       # Alert is active
    RESOLVED = "resolved"   # Alert has been resolved
    ACKNOWLEDGED = "acknowledged"  # Someone is looking at it
    SILENCED = "silenced"   # Temporarily suppressed
    ESCALATED = "escalated" # Has been escalated


class AlertCategory(str, Enum):
    """Business categories for alert routing."""
    INFRASTRUCTURE = "infrastructure"
    PERFORMANCE = "performance"
    BUSINESS_METRIC = "business_metric"
    SECURITY = "security"
    COMPLIANCE = "compliance"
    USER_EXPERIENCE = "user_experience"
    AI_QUALITY = "ai_quality"
    INTEGRATION = "integration"
    BILLING = "billing"


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class AlertRule:
    """
    Definition of an alert rule.
    
    Attributes:
        name: Unique identifier for the rule
        description: Human-readable description
        category: Business category
        severity: Default severity
        condition: Lambda/callable that returns True when alert should fire
        message_template: Template for alert message
        channels: Which channels to notify
        cooldown_minutes: Minimum time between alerts
        auto_resolve: Whether alert auto-resolves when condition clears
        escalation_minutes: Time until escalation (None = no escalation)
        runbook_url: Link to runbook for this alert
        tags: Additional tags for filtering
    """
    name: str
    description: str
    category: AlertCategory
    severity: AlertSeverity
    condition: Optional[Callable[..., bool]] = None
    message_template: str = "{description}"
    channels: list[AlertChannel] = field(default_factory=lambda: [AlertChannel.SLACK])
    cooldown_minutes: int = 5
    auto_resolve: bool = True
    escalation_minutes: Optional[int] = None
    runbook_url: Optional[str] = None
    tags: dict[str, str] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Alert:
    """
    An active or historical alert instance.
    
    Attributes:
        alert_id: Unique identifier
        rule_name: Name of the rule that triggered this
        status: Current status
        severity: Current severity (can be escalated)
        category: Business category
        title: Short title
        message: Detailed message
        context: Additional context data
        fired_at: When alert first fired
        resolved_at: When alert was resolved
        acknowledged_at: When someone acknowledged
        acknowledged_by: Who acknowledged
        escalated_at: When escalated
        escalation_level: Current escalation level
        notification_history: Log of notifications sent
        tenant_id: Affected tenant
        fingerprint: Unique hash for deduplication
    """
    alert_id: str
    rule_name: str
    status: AlertStatus
    severity: AlertSeverity
    category: AlertCategory
    title: str
    message: str
    context: dict[str, Any] = field(default_factory=dict)
    fired_at: datetime = field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    escalated_at: Optional[datetime] = None
    escalation_level: int = 0
    notification_history: list[dict] = field(default_factory=list)
    tenant_id: Optional[str] = None
    fingerprint: str = ""
    
    def __post_init__(self):
        if not self.fingerprint:
            # Generate fingerprint from rule name and key context
            fp_data = f"{self.rule_name}:{self.tenant_id}:{self.category.value}"
            self.fingerprint = hashlib.md5(fp_data.encode()).hexdigest()[:12]
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "alert_id": self.alert_id,
            "rule_name": self.rule_name,
            "status": self.status.value,
            "severity": self.severity.value,
            "category": self.category.value,
            "title": self.title,
            "message": self.message,
            "context": self.context,
            "fired_at": self.fired_at.isoformat(),
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "acknowledged_at": self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            "acknowledged_by": self.acknowledged_by,
            "escalation_level": self.escalation_level,
            "tenant_id": self.tenant_id,
            "fingerprint": self.fingerprint
        }


@dataclass
class NotificationResult:
    """Result of sending a notification."""
    channel: AlertChannel
    success: bool
    timestamp: datetime
    error_message: Optional[str] = None
    response_data: Optional[dict] = None


@dataclass
class EscalationPolicy:
    """
    Escalation policy for alerts.
    
    Defines how alerts escalate over time if not acknowledged.
    """
    name: str
    levels: list[dict]  # [{delay_minutes: 15, channels: [...], recipients: [...]}]
    repeat_last_level: bool = True
    repeat_interval_minutes: int = 30


@dataclass
class OnCallSchedule:
    """On-call schedule for a team."""
    team: str
    current_oncall: str  # User ID or email
    backup_oncall: Optional[str] = None
    schedule_url: Optional[str] = None


# =============================================================================
# NOTIFICATION PROVIDERS
# =============================================================================

class NotificationProvider(ABC):
    """Base class for notification providers."""
    
    @property
    @abstractmethod
    def channel(self) -> AlertChannel:
        """Return the channel this provider handles."""
        pass
    
    @abstractmethod
    async def send(self, alert: Alert, recipients: list[str]) -> NotificationResult:
        """Send notification for an alert."""
        pass


class SlackNotificationProvider(NotificationProvider):
    """Slack notification provider."""
    
    def __init__(self, webhook_url: str, default_channel: str = "#alerts"):
        self._webhook_url = webhook_url
        self._default_channel = default_channel
    
    @property
    def channel(self) -> AlertChannel:
        return AlertChannel.SLACK
    
    async def send(self, alert: Alert, recipients: list[str]) -> NotificationResult:
        """Send Slack notification."""
        try:
            # Build Slack message blocks
            severity_emoji = {
                AlertSeverity.INFO: "ℹ️",
                AlertSeverity.LOW: "📝",
                AlertSeverity.MEDIUM: "⚠️",
                AlertSeverity.HIGH: "🔶",
                AlertSeverity.CRITICAL: "🚨",
                AlertSeverity.PAGE: "🆘"
            }.get(alert.severity, "❓")
            
            status_color = {
                AlertStatus.FIRING: "#dc3545",
                AlertStatus.RESOLVED: "#28a745",
                AlertStatus.ACKNOWLEDGED: "#ffc107",
                AlertStatus.SILENCED: "#6c757d",
                AlertStatus.ESCALATED: "#fd7e14"
            }.get(alert.status, "#6c757d")
            
            blocks = [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": f"{severity_emoji} {alert.title}",
                        "emoji": True
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Status:*\n{alert.status.value.upper()}"},
                        {"type": "mrkdwn", "text": f"*Severity:*\n{alert.severity.value.upper()}"},
                        {"type": "mrkdwn", "text": f"*Category:*\n{alert.category.value}"},
                        {"type": "mrkdwn", "text": f"*Alert ID:*\n`{alert.alert_id}`"}
                    ]
                },
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": alert.message}
                },
                {
                    "type": "context",
                    "elements": [
                        {"type": "mrkdwn", "text": f"Fired at: {alert.fired_at.isoformat()}"}
                    ]
                }
            ]
            
            # Add mention for high severity
            if alert.severity in [AlertSeverity.CRITICAL, AlertSeverity.PAGE]:
                mention_text = " ".join(f"<@{r}>" for r in recipients if r)
                if mention_text:
                    blocks.insert(1, {
                        "type": "section",
                        "text": {"type": "mrkdwn", "text": f"👀 {mention_text}"}
                    })
            
            payload = {
                "channel": recipients[0] if recipients else self._default_channel,
                "attachments": [{
                    "color": status_color,
                    "blocks": blocks
                }]
            }
            
            # In production, would use httpx to post to webhook
            # For now, log the payload
            logger.info(f"Slack notification: {json.dumps(payload, indent=2)}")
            
            return NotificationResult(
                channel=AlertChannel.SLACK,
                success=True,
                timestamp=datetime.utcnow(),
                response_data={"payload": payload}
            )
            
        except Exception as e:
            logger.error(f"Slack notification failed: {e}")
            return NotificationResult(
                channel=AlertChannel.SLACK,
                success=False,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )


class EmailNotificationProvider(NotificationProvider):
    """Email notification provider."""
    
    def __init__(
        self,
        smtp_host: str = "localhost",
        smtp_port: int = 587,
        from_address: str = "alerts@salesflow.ai"
    ):
        self._smtp_host = smtp_host
        self._smtp_port = smtp_port
        self._from_address = from_address
    
    @property
    def channel(self) -> AlertChannel:
        return AlertChannel.EMAIL
    
    async def send(self, alert: Alert, recipients: list[str]) -> NotificationResult:
        """Send email notification."""
        try:
            severity_badge = {
                AlertSeverity.INFO: "[INFO]",
                AlertSeverity.LOW: "[LOW]",
                AlertSeverity.MEDIUM: "[MEDIUM]",
                AlertSeverity.HIGH: "[HIGH]",
                AlertSeverity.CRITICAL: "[CRITICAL]",
                AlertSeverity.PAGE: "[PAGE]"
            }.get(alert.severity, "[ALERT]")
            
            subject = f"{severity_badge} {alert.title}"
            
            body = f"""
Alert: {alert.title}
=====================================

Status: {alert.status.value.upper()}
Severity: {alert.severity.value.upper()}
Category: {alert.category.value}
Alert ID: {alert.alert_id}

Details:
{alert.message}

Context:
{json.dumps(alert.context, indent=2)}

Fired at: {alert.fired_at.isoformat()}

---
SalesFlow AI Monitoring
            """.strip()
            
            # In production, would send via SMTP
            logger.info(f"Email notification to {recipients}: {subject}")
            
            return NotificationResult(
                channel=AlertChannel.EMAIL,
                success=True,
                timestamp=datetime.utcnow(),
                response_data={"subject": subject, "recipients": recipients}
            )
            
        except Exception as e:
            logger.error(f"Email notification failed: {e}")
            return NotificationResult(
                channel=AlertChannel.EMAIL,
                success=False,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )


class WebhookNotificationProvider(NotificationProvider):
    """Generic webhook notification provider."""
    
    def __init__(self, webhook_urls: dict[str, str]):
        """
        Args:
            webhook_urls: Mapping of recipient names to webhook URLs
        """
        self._webhook_urls = webhook_urls
    
    @property
    def channel(self) -> AlertChannel:
        return AlertChannel.WEBHOOK
    
    async def send(self, alert: Alert, recipients: list[str]) -> NotificationResult:
        """Send webhook notification."""
        try:
            payload = {
                "alert_id": alert.alert_id,
                "rule_name": alert.rule_name,
                "status": alert.status.value,
                "severity": alert.severity.value,
                "category": alert.category.value,
                "title": alert.title,
                "message": alert.message,
                "context": alert.context,
                "fired_at": alert.fired_at.isoformat(),
                "tenant_id": alert.tenant_id
            }
            
            # In production, would POST to each webhook URL
            for recipient in recipients:
                url = self._webhook_urls.get(recipient)
                if url:
                    logger.info(f"Webhook to {url}: {json.dumps(payload)}")
            
            return NotificationResult(
                channel=AlertChannel.WEBHOOK,
                success=True,
                timestamp=datetime.utcnow(),
                response_data={"payload": payload}
            )
            
        except Exception as e:
            logger.error(f"Webhook notification failed: {e}")
            return NotificationResult(
                channel=AlertChannel.WEBHOOK,
                success=False,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )


class PagerDutyNotificationProvider(NotificationProvider):
    """PagerDuty notification provider for critical alerts."""
    
    def __init__(self, routing_key: str):
        self._routing_key = routing_key
    
    @property
    def channel(self) -> AlertChannel:
        return AlertChannel.PAGERDUTY
    
    async def send(self, alert: Alert, recipients: list[str]) -> NotificationResult:
        """Create PagerDuty incident."""
        try:
            severity_map = {
                AlertSeverity.INFO: "info",
                AlertSeverity.LOW: "warning",
                AlertSeverity.MEDIUM: "warning",
                AlertSeverity.HIGH: "error",
                AlertSeverity.CRITICAL: "critical",
                AlertSeverity.PAGE: "critical"
            }
            
            event_action = "trigger" if alert.status == AlertStatus.FIRING else "resolve"
            
            payload = {
                "routing_key": self._routing_key,
                "event_action": event_action,
                "dedup_key": alert.fingerprint,
                "payload": {
                    "summary": alert.title,
                    "severity": severity_map.get(alert.severity, "warning"),
                    "source": "salesflow-ai-monitoring",
                    "component": alert.category.value,
                    "group": alert.tenant_id or "global",
                    "class": alert.rule_name,
                    "custom_details": {
                        "message": alert.message,
                        "context": alert.context,
                        "alert_id": alert.alert_id
                    }
                }
            }
            
            # In production, would POST to PagerDuty Events API v2
            logger.info(f"PagerDuty event: {json.dumps(payload)}")
            
            return NotificationResult(
                channel=AlertChannel.PAGERDUTY,
                success=True,
                timestamp=datetime.utcnow(),
                response_data={"dedup_key": alert.fingerprint}
            )
            
        except Exception as e:
            logger.error(f"PagerDuty notification failed: {e}")
            return NotificationResult(
                channel=AlertChannel.PAGERDUTY,
                success=False,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )


# =============================================================================
# ALERT MANAGER
# =============================================================================

class AlertManager:
    """
    Central alert management system.
    
    Handles alert lifecycle, deduplication, escalation, and routing.
    """
    
    def __init__(self):
        self._rules: dict[str, AlertRule] = {}
        self._active_alerts: dict[str, Alert] = {}  # fingerprint -> Alert
        self._alert_history: list[Alert] = []
        self._providers: dict[AlertChannel, NotificationProvider] = {}
        self._escalation_policies: dict[str, EscalationPolicy] = {}
        self._routing_rules: list[tuple[Callable[[Alert], bool], list[str]]] = []
        self._last_notification: dict[str, datetime] = {}  # fingerprint -> last notify time
        self._silenced_alerts: set[str] = set()  # fingerprints
        self._max_history = 10000
        
        # Default routing
        self._default_recipients: dict[AlertCategory, list[str]] = {
            AlertCategory.INFRASTRUCTURE: ["#ops-alerts"],
            AlertCategory.SECURITY: ["#security-alerts", "security-team@salesflow.ai"],
            AlertCategory.BUSINESS_METRIC: ["#business-alerts"],
            AlertCategory.AI_QUALITY: ["#ai-alerts"],
            AlertCategory.COMPLIANCE: ["#compliance-alerts", "compliance@salesflow.ai"],
        }
    
    def register_provider(self, provider: NotificationProvider) -> None:
        """Register a notification provider."""
        self._providers[provider.channel] = provider
        logger.info(f"Registered notification provider: {provider.channel.value}")
    
    def register_rule(self, rule: AlertRule) -> None:
        """Register an alert rule."""
        self._rules[rule.name] = rule
        logger.info(f"Registered alert rule: {rule.name}")
    
    def register_escalation_policy(self, policy: EscalationPolicy) -> None:
        """Register an escalation policy."""
        self._escalation_policies[policy.name] = policy
        logger.info(f"Registered escalation policy: {policy.name}")
    
    def add_routing_rule(
        self,
        condition: Callable[[Alert], bool],
        recipients: list[str]
    ) -> None:
        """Add a routing rule for alert recipients."""
        self._routing_rules.append((condition, recipients))
    
    async def fire_alert(
        self,
        rule_name: str,
        title: str,
        message: str,
        context: Optional[dict] = None,
        tenant_id: Optional[str] = None,
        severity_override: Optional[AlertSeverity] = None
    ) -> Alert:
        """
        Fire an alert based on a rule.
        
        Handles deduplication - if an alert with the same fingerprint
        is already active, it won't create a new one.
        """
        rule = self._rules.get(rule_name)
        if not rule:
            raise ValueError(f"Unknown alert rule: {rule_name}")
        
        # Create alert
        import uuid
        alert = Alert(
            alert_id=str(uuid.uuid4())[:8],
            rule_name=rule_name,
            status=AlertStatus.FIRING,
            severity=severity_override or rule.severity,
            category=rule.category,
            title=title,
            message=message,
            context=context or {},
            tenant_id=tenant_id
        )
        
        # Check for existing alert with same fingerprint
        existing = self._active_alerts.get(alert.fingerprint)
        if existing:
            logger.debug(f"Alert already active: {alert.fingerprint}")
            return existing
        
        # Check if silenced
        if alert.fingerprint in self._silenced_alerts:
            logger.debug(f"Alert silenced: {alert.fingerprint}")
            alert.status = AlertStatus.SILENCED
            self._alert_history.append(alert)
            return alert
        
        # Check cooldown
        last_notify = self._last_notification.get(alert.fingerprint)
        if last_notify:
            cooldown = timedelta(minutes=rule.cooldown_minutes)
            if datetime.utcnow() - last_notify < cooldown:
                logger.debug(f"Alert in cooldown: {alert.fingerprint}")
                return alert
        
        # Store active alert
        self._active_alerts[alert.fingerprint] = alert
        
        # Send notifications
        await self._send_notifications(alert, rule)
        
        # Add to history
        self._alert_history.append(alert)
        self._trim_history()
        
        logger.info(f"Alert fired: {alert.alert_id} - {title}")
        return alert
    
    async def resolve_alert(
        self,
        fingerprint: str,
        resolution_message: Optional[str] = None
    ) -> Optional[Alert]:
        """Resolve an active alert."""
        alert = self._active_alerts.get(fingerprint)
        if not alert:
            return None
        
        alert.status = AlertStatus.RESOLVED
        alert.resolved_at = datetime.utcnow()
        
        if resolution_message:
            alert.message += f"\n\nResolution: {resolution_message}"
        
        # Send resolution notification
        rule = self._rules.get(alert.rule_name)
        if rule:
            await self._send_notifications(alert, rule)
        
        # Remove from active
        del self._active_alerts[fingerprint]
        
        logger.info(f"Alert resolved: {alert.alert_id}")
        return alert
    
    async def acknowledge_alert(
        self,
        fingerprint: str,
        acknowledged_by: str
    ) -> Optional[Alert]:
        """Acknowledge an alert."""
        alert = self._active_alerts.get(fingerprint)
        if not alert:
            return None
        
        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_at = datetime.utcnow()
        alert.acknowledged_by = acknowledged_by
        
        logger.info(f"Alert acknowledged: {alert.alert_id} by {acknowledged_by}")
        return alert
    
    def silence_alert(
        self,
        fingerprint: str,
        duration_minutes: int = 60
    ) -> None:
        """Silence an alert for a duration."""
        self._silenced_alerts.add(fingerprint)
        logger.info(f"Alert silenced: {fingerprint} for {duration_minutes}m")
        
        # Schedule unsilence
        async def unsilence():
            await asyncio.sleep(duration_minutes * 60)
            self._silenced_alerts.discard(fingerprint)
            logger.info(f"Alert unsilenced: {fingerprint}")
        
        asyncio.create_task(unsilence())
    
    async def escalate_alert(self, fingerprint: str) -> Optional[Alert]:
        """Manually escalate an alert."""
        alert = self._active_alerts.get(fingerprint)
        if not alert:
            return None
        
        alert.escalation_level += 1
        alert.escalated_at = datetime.utcnow()
        alert.status = AlertStatus.ESCALATED
        
        # Increase severity
        severity_order = [
            AlertSeverity.INFO,
            AlertSeverity.LOW,
            AlertSeverity.MEDIUM,
            AlertSeverity.HIGH,
            AlertSeverity.CRITICAL,
            AlertSeverity.PAGE
        ]
        current_idx = severity_order.index(alert.severity)
        if current_idx < len(severity_order) - 1:
            alert.severity = severity_order[current_idx + 1]
        
        # Send escalation notification
        rule = self._rules.get(alert.rule_name)
        if rule:
            await self._send_notifications(alert, rule)
        
        logger.info(f"Alert escalated: {alert.alert_id} to level {alert.escalation_level}")
        return alert
    
    def get_active_alerts(
        self,
        category: Optional[AlertCategory] = None,
        severity: Optional[AlertSeverity] = None,
        tenant_id: Optional[str] = None
    ) -> list[Alert]:
        """Get active alerts with optional filtering."""
        alerts = list(self._active_alerts.values())
        
        if category:
            alerts = [a for a in alerts if a.category == category]
        if severity:
            alerts = [a for a in alerts if a.severity == severity]
        if tenant_id:
            alerts = [a for a in alerts if a.tenant_id == tenant_id]
        
        return sorted(alerts, key=lambda a: a.fired_at, reverse=True)
    
    def get_alert_history(
        self,
        limit: int = 100,
        category: Optional[AlertCategory] = None,
        since: Optional[datetime] = None
    ) -> list[Alert]:
        """Get historical alerts."""
        alerts = self._alert_history
        
        if category:
            alerts = [a for a in alerts if a.category == category]
        if since:
            alerts = [a for a in alerts if a.fired_at >= since]
        
        return sorted(alerts, key=lambda a: a.fired_at, reverse=True)[:limit]
    
    def get_alert_stats(self) -> dict[str, Any]:
        """Get alert statistics."""
        active = self._active_alerts.values()
        
        by_severity = defaultdict(int)
        by_category = defaultdict(int)
        by_status = defaultdict(int)
        
        for alert in active:
            by_severity[alert.severity.value] += 1
            by_category[alert.category.value] += 1
            by_status[alert.status.value] += 1
        
        # Calculate MTTR (Mean Time to Resolve)
        resolved = [a for a in self._alert_history if a.resolved_at]
        if resolved:
            resolution_times = [
                (a.resolved_at - a.fired_at).total_seconds()
                for a in resolved
            ]
            mttr_seconds = sum(resolution_times) / len(resolution_times)
        else:
            mttr_seconds = 0
        
        return {
            "active_count": len(self._active_alerts),
            "by_severity": dict(by_severity),
            "by_category": dict(by_category),
            "by_status": dict(by_status),
            "silenced_count": len(self._silenced_alerts),
            "history_count": len(self._alert_history),
            "mttr_seconds": round(mttr_seconds, 1),
            "mttr_human": self._format_duration(mttr_seconds)
        }
    
    async def _send_notifications(self, alert: Alert, rule: AlertRule) -> None:
        """Send notifications for an alert."""
        recipients = self._get_recipients(alert, rule)
        
        for channel in rule.channels:
            provider = self._providers.get(channel)
            if not provider:
                logger.warning(f"No provider for channel: {channel.value}")
                continue
            
            channel_recipients = [
                r for r in recipients
                if self._recipient_matches_channel(r, channel)
            ]
            
            if channel_recipients:
                result = await provider.send(alert, channel_recipients)
                alert.notification_history.append({
                    "channel": channel.value,
                    "recipients": channel_recipients,
                    "success": result.success,
                    "timestamp": result.timestamp.isoformat(),
                    "error": result.error_message
                })
        
        self._last_notification[alert.fingerprint] = datetime.utcnow()
    
    def _get_recipients(self, alert: Alert, rule: AlertRule) -> list[str]:
        """Determine recipients for an alert."""
        recipients = []
        
        # Check custom routing rules
        for condition, rule_recipients in self._routing_rules:
            if condition(alert):
                recipients.extend(rule_recipients)
        
        # Add default recipients for category
        default = self._default_recipients.get(alert.category, [])
        recipients.extend(default)
        
        # Add recipients from rule metadata
        if rule.metadata.get("recipients"):
            recipients.extend(rule.metadata["recipients"])
        
        return list(set(recipients))  # Deduplicate
    
    def _recipient_matches_channel(self, recipient: str, channel: AlertChannel) -> bool:
        """Check if recipient matches channel type."""
        if channel == AlertChannel.SLACK:
            return recipient.startswith("#") or recipient.startswith("@")
        elif channel == AlertChannel.EMAIL:
            return "@" in recipient and not recipient.startswith("@")
        return True
    
    def _trim_history(self) -> None:
        """Trim alert history to max size."""
        if len(self._alert_history) > self._max_history:
            self._alert_history = self._alert_history[-self._max_history:]
    
    @staticmethod
    def _format_duration(seconds: float) -> str:
        """Format duration in human-readable form."""
        if seconds < 60:
            return f"{int(seconds)}s"
        elif seconds < 3600:
            return f"{int(seconds / 60)}m"
        elif seconds < 86400:
            return f"{seconds / 3600:.1f}h"
        else:
            return f"{seconds / 86400:.1f}d"


# =============================================================================
# PRE-DEFINED ALERT RULES FOR SALESFLOW
# =============================================================================

class SalesFlowAlertRules:
    """Pre-defined alert rules for SalesFlow AI."""
    
    # SLO-based alerts
    SLO_VIOLATION = AlertRule(
        name="slo_violation",
        description="Service Level Objective violated",
        category=AlertCategory.PERFORMANCE,
        severity=AlertSeverity.HIGH,
        channels=[AlertChannel.SLACK, AlertChannel.PAGERDUTY],
        cooldown_minutes=15,
        runbook_url="https://docs.salesflow.ai/runbooks/slo-violation"
    )
    
    ERROR_BUDGET_EXHAUSTED = AlertRule(
        name="error_budget_exhausted",
        description="Error budget exhausted for SLO",
        category=AlertCategory.PERFORMANCE,
        severity=AlertSeverity.CRITICAL,
        channels=[AlertChannel.SLACK, AlertChannel.PAGERDUTY, AlertChannel.EMAIL],
        cooldown_minutes=60,
        escalation_minutes=30
    )
    
    # Business alerts
    CONVERSION_DROP = AlertRule(
        name="conversion_drop",
        description="Significant drop in conversion rate detected",
        category=AlertCategory.BUSINESS_METRIC,
        severity=AlertSeverity.HIGH,
        channels=[AlertChannel.SLACK, AlertChannel.EMAIL],
        cooldown_minutes=30,
        metadata={"team": "growth"}
    )
    
    LEAD_PROCESSING_DELAY = AlertRule(
        name="lead_processing_delay",
        description="Leads not being processed within SLA",
        category=AlertCategory.BUSINESS_METRIC,
        severity=AlertSeverity.MEDIUM,
        channels=[AlertChannel.SLACK],
        cooldown_minutes=15
    )
    
    AI_QUALITY_DEGRADATION = AlertRule(
        name="ai_quality_degradation",
        description="AI response quality has degraded",
        category=AlertCategory.AI_QUALITY,
        severity=AlertSeverity.MEDIUM,
        channels=[AlertChannel.SLACK],
        cooldown_minutes=30
    )
    
    AI_COST_SPIKE = AlertRule(
        name="ai_cost_spike",
        description="Abnormal increase in AI API costs",
        category=AlertCategory.BILLING,
        severity=AlertSeverity.HIGH,
        channels=[AlertChannel.SLACK, AlertChannel.EMAIL],
        cooldown_minutes=60
    )
    
    # Infrastructure alerts
    HIGH_ERROR_RATE = AlertRule(
        name="high_error_rate",
        description="Error rate exceeds threshold",
        category=AlertCategory.INFRASTRUCTURE,
        severity=AlertSeverity.HIGH,
        channels=[AlertChannel.SLACK, AlertChannel.PAGERDUTY],
        cooldown_minutes=5
    )
    
    DATABASE_LATENCY = AlertRule(
        name="database_latency",
        description="Database response time elevated",
        category=AlertCategory.INFRASTRUCTURE,
        severity=AlertSeverity.MEDIUM,
        channels=[AlertChannel.SLACK],
        cooldown_minutes=10
    )
    
    QUEUE_BACKLOG = AlertRule(
        name="queue_backlog",
        description="Message queue backlog growing",
        category=AlertCategory.INFRASTRUCTURE,
        severity=AlertSeverity.MEDIUM,
        channels=[AlertChannel.SLACK],
        cooldown_minutes=10
    )
    
    # Security alerts
    SECURITY_VIOLATION = AlertRule(
        name="security_violation",
        description="Security policy violation detected",
        category=AlertCategory.SECURITY,
        severity=AlertSeverity.CRITICAL,
        channels=[AlertChannel.SLACK, AlertChannel.PAGERDUTY, AlertChannel.EMAIL],
        cooldown_minutes=0,  # Always alert
        escalation_minutes=15
    )
    
    RATE_LIMIT_ABUSE = AlertRule(
        name="rate_limit_abuse",
        description="Potential rate limit abuse detected",
        category=AlertCategory.SECURITY,
        severity=AlertSeverity.MEDIUM,
        channels=[AlertChannel.SLACK],
        cooldown_minutes=5
    )
    
    # Compliance alerts
    GDPR_REQUEST_OVERDUE = AlertRule(
        name="gdpr_request_overdue",
        description="GDPR request approaching or past deadline",
        category=AlertCategory.COMPLIANCE,
        severity=AlertSeverity.HIGH,
        channels=[AlertChannel.SLACK, AlertChannel.EMAIL],
        cooldown_minutes=60
    )
    
    CONSENT_ANOMALY = AlertRule(
        name="consent_anomaly",
        description="Unusual consent pattern detected",
        category=AlertCategory.COMPLIANCE,
        severity=AlertSeverity.MEDIUM,
        channels=[AlertChannel.SLACK],
        cooldown_minutes=30
    )
    
    @classmethod
    def get_all_rules(cls) -> list[AlertRule]:
        """Get all pre-defined alert rules."""
        return [
            cls.SLO_VIOLATION,
            cls.ERROR_BUDGET_EXHAUSTED,
            cls.CONVERSION_DROP,
            cls.LEAD_PROCESSING_DELAY,
            cls.AI_QUALITY_DEGRADATION,
            cls.AI_COST_SPIKE,
            cls.HIGH_ERROR_RATE,
            cls.DATABASE_LATENCY,
            cls.QUEUE_BACKLOG,
            cls.SECURITY_VIOLATION,
            cls.RATE_LIMIT_ABUSE,
            cls.GDPR_REQUEST_OVERDUE,
            cls.CONSENT_ANOMALY,
        ]


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

def create_alert_manager(
    slack_webhook: Optional[str] = None,
    pagerduty_key: Optional[str] = None,
    email_config: Optional[dict] = None
) -> AlertManager:
    """
    Create and configure alert manager.
    
    Example:
        manager = create_alert_manager(
            slack_webhook="https://hooks.slack.com/...",
            pagerduty_key="your-routing-key"
        )
        
        await manager.fire_alert(
            "slo_violation",
            title="Message Processing SLO Breached",
            message="99.5% target not met - currently at 98.2%",
            context={"current": 98.2, "target": 99.5},
            tenant_id="tenant-123"
        )
    """
    manager = AlertManager()
    
    # Register providers
    if slack_webhook:
        manager.register_provider(SlackNotificationProvider(slack_webhook))
    
    if pagerduty_key:
        manager.register_provider(PagerDutyNotificationProvider(pagerduty_key))
    
    if email_config:
        manager.register_provider(EmailNotificationProvider(**email_config))
    
    # Register webhook provider (always available)
    manager.register_provider(WebhookNotificationProvider({}))
    
    # Register all default rules
    for rule in SalesFlowAlertRules.get_all_rules():
        manager.register_rule(rule)
    
    return manager
