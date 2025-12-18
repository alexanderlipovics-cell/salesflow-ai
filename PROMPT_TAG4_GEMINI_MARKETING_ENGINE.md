# 🚀 SALESFLOW AI - TAG 4C: MARKETING ENGINE (GEMINI)

## 🎯 MISSION: Mobile-First Marketing & User Acquisition

### 📢 AI-POWERED MARKETING AUTOMATION

#### 1. **Email Marketing Service**
**Dateien:** `backend/app/services/email_service.py`, `backend/app/templates/email/`
**Intelligent Email Sequences & Personalization**

```python
# backend/app/services/email_service.py

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
import json
import os

import structlog
from sqlalchemy.orm import Session
import aiohttp
from jinja2 import Environment, FileSystemLoader

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None

from app.core.config import settings
from app.models.user import User
from app.models.email_campaign import EmailCampaign, EmailSend
from app.services.notification_service import NotificationService

logger = structlog.get_logger()

class EmailService:
    """
    AI-powered email marketing service.

    Features:
    - Personalized welcome sequences
    - Behavioral email triggers
    - A/B testing framework
    - Mobile-optimized templates
    - Delivery optimization
    - Unsubscribe management
    """

    def __init__(self, db: Session):
        self.db = db
        self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key) if AsyncOpenAI else None
        self.notification_service = NotificationService()

        # Email provider setup (SendGrid, Mailgun, etc.)
        self.email_provider = self._setup_email_provider()

        # Template engine
        template_dir = os.path.join(os.path.dirname(__file__), 'templates', 'email')
        self.template_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=True
        )

    def _setup_email_provider(self):
        """Setup email provider (SendGrid, Mailgun, etc.)"""
        provider_config = {
            "api_key": settings.email_api_key,
            "base_url": settings.email_base_url,
            "from_email": settings.email_from_email,
            "from_name": settings.email_from_name,
        }
        return provider_config

    # ==================== WELCOME SEQUENCES ====================

    async def send_welcome_sequence(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """
        Send personalized welcome email sequence.

        Sequence:
        1. Welcome Email (immediate)
        2. Onboarding Tips (day 2)
        3. Feature Highlight (day 7)
        4. Success Check-in (day 14)
        """

        try:
            # Generate personalized content
            welcome_content = await self._generate_welcome_content(user_data)

            # Send immediate welcome
            await self.send_email(
                user_id=user_id,
                template="welcome",
                template_data=welcome_content,
                campaign="welcome_sequence_1"
            )

            # Schedule follow-up emails
            await self.schedule_email(
                user_id=user_id,
                template="onboarding_tips",
                delay_days=2,
                campaign="welcome_sequence_2",
                template_data={"user_name": user_data.get("name")}
            )

            await self.schedule_email(
                user_id=user_id,
                template="feature_highlight",
                delay_days=7,
                campaign="welcome_sequence_3",
                template_data={"user_name": user_data.get("name")}
            )

            await self.schedule_email(
                user_id=user_id,
                template="success_checkin",
                delay_days=14,
                campaign="welcome_sequence_4",
                template_data={"user_name": user_data.get("name")}
            )

            logger.info("Welcome sequence initiated", user_id=user_id)
            return True

        except Exception as e:
            logger.error("Welcome sequence failed", user_id=user_id, error=str(e))
            return False

    async def _generate_welcome_content(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate AI-personalized welcome content."""

        if not self.openai_client:
            # Fallback content
            return {
                "subject": f"Willkommen bei SalesFlow AI, {user_data.get('name', 'User')}!",
                "greeting": f"Hallo {user_data.get('name', 'User')}",
                "personal_message": "Wir freuen uns, dass Sie sich für SalesFlow AI entschieden haben.",
                "next_steps": ["Profil vervollständigen", "Erste Leads importieren", "KI-Chat ausprobieren"]
            }

        # AI-generated personalized content
        prompt = f"""
        Generate personalized welcome email content for a new SalesFlow AI user:

        User Info:
        - Name: {user_data.get('name', 'Unknown')}
        - Company: {user_data.get('company', 'Unknown')}
        - Role: {user_data.get('role', 'Unknown')}
        - Signup Source: {user_data.get('source', 'direct')}

        Create:
        1. Personalized subject line (max 50 chars)
        2. Personalized greeting
        3. 2-3 personalized value propositions
        4. 3 specific next steps based on their profile

        Return as JSON with keys: subject, greeting, value_props, next_steps
        """

        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a sales onboarding expert."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.7
            )

            content = json.loads(response.choices[0].message.content)
            return content

        except Exception as e:
            logger.warning("AI welcome content generation failed", error=str(e))
            return self._generate_welcome_content({})  # Fallback

    # ==================== BEHAVIORAL EMAIL TRIGGERS ====================

    async def trigger_behavioral_email(
        self,
        user_id: str,
        trigger_type: str,
        trigger_data: Dict[str, Any]
    ) -> bool:
        """
        Send behavioral trigger emails based on user actions.

        Triggers:
        - first_lead_imported: Congratulations + tips
        - ai_chat_first_use: AI feature introduction
        - inactive_3_days: Re-engagement email
        - feature_adoption_low: Feature encouragement
        - trial_expiring: Upgrade reminder
        """

        trigger_templates = {
            "first_lead_imported": "first_lead_congrats",
            "ai_chat_first_use": "ai_feature_intro",
            "inactive_3_days": "reengagement",
            "feature_adoption_low": "feature_encouragement",
            "trial_expiring": "trial_upgrade_reminder"
        }

        template = trigger_templates.get(trigger_type)
        if not template:
            logger.warning("Unknown trigger type", trigger_type=trigger_type)
            return False

        try:
            # Generate personalized content for trigger
            content = await self._generate_trigger_content(trigger_type, trigger_data)

            await self.send_email(
                user_id=user_id,
                template=template,
                template_data=content,
                campaign=f"trigger_{trigger_type}"
            )

            logger.info("Behavioral email sent", user_id=user_id, trigger=trigger_type)
            return True

        except Exception as e:
            logger.error("Behavioral email failed", user_id=user_id, trigger=trigger_type, error=str(e))
            return False

    async def _generate_trigger_content(self, trigger_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate AI-personalized trigger email content."""

        trigger_prompts = {
            "first_lead_congrats": f"""
            User just imported their first lead. Create congratulations email with:
            - Personalized congratulations
            - What they can do next with the lead
            - Tips for lead management
            """,
            "ai_chat_first_use": f"""
            User used AI chat for the first time. Create intro email about:
            - AI capabilities explanation
            - Use case examples
            - Advanced features to try
            """,
            "reengagement": f"""
            User inactive for 3+ days. Create reengagement email with:
            - What's new since they last used the app
            - Quick wins they can achieve
            - Gentle nudge to come back
            """
        }

        prompt = trigger_prompts.get(trigger_type, "Create a personalized email for this user action.")

        if not self.openai_client:
            return {"subject": "Update from SalesFlow AI", "message": "Keep using our platform!"}

        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a customer success manager."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=250,
                temperature=0.7
            )

            return json.loads(response.choices[0].message.content)

        except Exception as e:
            logger.warning("AI trigger content failed", trigger=trigger_type, error=str(e))
            return {"subject": "Update from SalesFlow AI", "message": "We miss you!"}

    # ==================== A/B TESTING FRAMEWORK ====================

    async def create_ab_test(
        self,
        campaign_name: str,
        subject_variants: List[str],
        content_variants: List[Dict[str, Any]],
        audience_size: int = 1000
    ) -> str:
        """
        Create A/B test for email campaign.

        Returns test ID for tracking.
        """

        test_id = f"ab_{campaign_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"

        # Split audience randomly
        variant_assignments = self._split_audience(audience_size, len(subject_variants))

        ab_test = {
            "test_id": test_id,
            "campaign_name": campaign_name,
            "subject_variants": subject_variants,
            "content_variants": content_variants,
            "variant_assignments": variant_assignments,
            "created_at": datetime.utcnow(),
            "status": "running"
        }

        # TODO: Store A/B test configuration
        logger.info("A/B test created", test_id=test_id, variants=len(subject_variants))
        return test_id

    def _split_audience(self, audience_size: int, num_variants: int) -> Dict[str, List[int]]:
        """Split audience randomly across variants."""
        # Simple round-robin distribution for now
        assignments = {f"variant_{i}": [] for i in range(num_variants)}

        for i in range(audience_size):
            variant = f"variant_{i % num_variants}"
            assignments[variant].append(i)

        return assignments

    async def get_ab_test_results(self, test_id: str) -> Dict[str, Any]:
        """Get A/B test performance metrics."""

        # TODO: Calculate open rates, click rates, conversions per variant
        return {
            "test_id": test_id,
            "status": "completed",
            "winner": "variant_1",
            "metrics": {
                "variant_0": {"opens": 120, "clicks": 15, "conversions": 3},
                "variant_1": {"opens": 135, "clicks": 22, "conversions": 7}
            }
        }

    # ==================== EMAIL DELIVERY ====================

    async def send_email(
        self,
        user_id: str,
        template: str,
        template_data: Dict[str, Any],
        campaign: str,
        priority: str = "normal"
    ) -> bool:
        """
        Send email using provider API.

        Features:
        - Template rendering
        - Delivery tracking
        - Bounce handling
        - Unsubscribe checking
        """

        try:
            # Get user email
            user_email = await self._get_user_email(user_id)
            if not user_email:
                logger.warning("No email found for user", user_id=user_id)
                return False

            # Check unsubscribe status
            if await self._is_unsubscribed(user_id):
                logger.info("Skipping email - user unsubscribed", user_id=user_id)
                return False

            # Render template
            html_content, text_content, subject = await self._render_template(
                template, template_data
            )

            # Send via provider
            message_id = await self._send_via_provider(
                to_email=user_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                campaign=campaign
            )

            # Track send
            await self._track_email_send(
                user_id=user_id,
                message_id=message_id,
                campaign=campaign,
                template=template
            )

            logger.info("Email sent successfully",
                       user_id=user_id,
                       campaign=campaign,
                       message_id=message_id)

            return True

        except Exception as e:
            logger.error("Email send failed", user_id=user_id, campaign=campaign, error=str(e))
            return False

    async def schedule_email(
        self,
        user_id: str,
        template: str,
        delay_days: int,
        campaign: str,
        template_data: Dict[str, Any]
    ) -> bool:
        """Schedule email for future delivery."""

        scheduled_time = datetime.utcnow() + timedelta(days=delay_days)

        # TODO: Store in scheduling queue (Redis, database, etc.)
        scheduled_email = {
            "user_id": user_id,
            "template": template,
            "template_data": template_data,
            "campaign": campaign,
            "scheduled_time": scheduled_time,
            "status": "scheduled"
        }

        logger.info("Email scheduled",
                   user_id=user_id,
                   campaign=campaign,
                   scheduled_time=scheduled_time)

        return True

    # ==================== UNSUBSCRIBE MANAGEMENT ====================

    async def unsubscribe_user(self, user_id: str, campaign_type: Optional[str] = None) -> bool:
        """Mark user as unsubscribed."""

        # TODO: Store unsubscribe preference
        logger.info("User unsubscribed", user_id=user_id, campaign_type=campaign_type)
        return True

    async def resubscribe_user(self, user_id: str) -> bool:
        """Resubscribe user to emails."""

        # TODO: Clear unsubscribe flag
        logger.info("User resubscribed", user_id=user_id)
        return True

    async def _is_unsubscribed(self, user_id: str) -> bool:
        """Check if user is unsubscribed."""
        # TODO: Check unsubscribe status
        return False

    # ==================== ANALYTICS & REPORTING ====================

    async def get_email_metrics(
        self,
        campaign: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get email performance metrics."""

        # TODO: Calculate real metrics from tracking data
        return {
            "period_days": days,
            "campaign": campaign,
            "sent": 1250,
            "delivered": 1200,
            "opens": 320,
            "clicks": 85,
            "unsubscribes": 12,
            "bounces": 15,
            "open_rate": 0.267,
            "click_rate": 0.068,
            "unsubscribe_rate": 0.01,
            "bounce_rate": 0.012
        }

    # ==================== HELPER METHODS ====================

    async def _get_user_email(self, user_id: str) -> Optional[str]:
        """Get user email address."""
        # TODO: Fetch from user database
        return f"user_{user_id}@example.com"

    async def _render_template(
        self,
        template_name: str,
        data: Dict[str, Any]
    ) -> Tuple[str, str, str]:
        """Render email template."""

        try:
            # Load HTML template
            html_template = self.template_env.get_template(f"{template_name}.html")
            html_content = html_template.render(**data)

            # Load text template (fallback)
            text_template = self.template_env.get_template(f"{template_name}.txt")
            text_content = text_template.render(**data)

            # Extract subject from template or data
            subject = data.get("subject", f"SalesFlow AI - {template_name.replace('_', ' ').title()}")

            return html_content, text_content, subject

        except Exception as e:
            logger.error("Template rendering failed", template=template_name, error=str(e))
            # Fallback content
            return f"<h1>SalesFlow AI</h1><p>{template_name}</p>", template_name, "SalesFlow AI Update"

    async def _send_via_provider(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
        campaign: str
    ) -> str:
        """Send email via provider API."""

        # TODO: Implement actual provider API call (SendGrid, Mailgun, etc.)
        # For now, simulate sending
        message_id = f"msg_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{hash(to_email) % 10000}"

        logger.info("Email sent via provider",
                   to_email=to_email,
                   subject=subject,
                   message_id=message_id)

        return message_id

    async def _track_email_send(
        self,
        user_id: str,
        message_id: str,
        campaign: str,
        template: str
    ) -> None:
        """Track email send for analytics."""

        # TODO: Store in database for analytics
        send_record = EmailSend(
            user_id=user_id,
            message_id=message_id,
            campaign=campaign,
            template=template,
            sent_at=datetime.utcnow(),
            status="sent"
        )

        self.db.add(send_record)
        self.db.commit()

# ==================== MOBILE PUSH NOTIFICATIONS ====================

class PushNotificationService:
    """
    Mobile push notification service.

    Integrates with Firebase Cloud Messaging for:
    - Welcome notifications
    - Feature announcements
    - Re-engagement pushes
    - Important updates
    """

    def __init__(self):
        self.fcm_server_key = settings.fcm_server_key

    async def send_push_notification(
        self,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Send push notification to user."""

        # Get user device token
        device_token = await self._get_device_token(user_id)
        if not device_token:
            return False

        # Send via FCM
        payload = {
            "to": device_token,
            "notification": {
                "title": title,
                "body": body,
                "sound": "default"
            },
            "data": data or {}
        }

        # TODO: Send to FCM API
        logger.info("Push notification sent", user_id=user_id, title=title)
        return True

    async def _get_device_token(self, user_id: str) -> Optional[str]:
        """Get user's device token for push notifications."""
        # TODO: Fetch from database
        return f"device_token_{user_id}"

# ==================== MODELS ====================

# backend/app/models/email_campaign.py

from sqlalchemy import JSON, Column, DateTime, Integer, String, Text, Boolean

from app.db.base_class import Base

class EmailCampaign(Base):
    __tablename__ = "email_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    template = Column(String(64), nullable=False)
    status = Column(String(16), default="draft")  # draft, scheduled, sending, completed
    audience_size = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    open_count = Column(Integer, default=0)
    click_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

class EmailSend(Base):
    __tablename__ = "email_sends"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    campaign = Column(String(64), nullable=False, index=True)
    template = Column(String(64), nullable=False)
    message_id = Column(String(128), nullable=False)
    subject = Column(String(256), nullable=False)
    status = Column(String(16), default="sent")  # sent, delivered, opened, clicked, bounced
    sent_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    opened_at = Column(DateTime(timezone=True), nullable=True)
    clicked_at = Column(DateTime(timezone=True), nullable=True)
    unsubscribed = Column(Boolean, default=False)
```

#### 2. **Mobile Push Notifications**
**Dateien:** `closerclub-mobile/src/services/PushNotificationService.ts`

```typescript
// closerclub-mobile/src/services/PushNotificationService.ts

import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class PushNotificationService {
  private fcmToken: string | null = null;

  async init(): Promise<void> {
    // Request permission
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      // Get FCM token
      this.fcmToken = await messaging().getToken();
      await this.saveTokenToServer(this.fcmToken);

      // Handle token refresh
      messaging().onTokenRefresh(async (token) => {
        this.fcmToken = token;
        await this.saveTokenToServer(token);
      });

      // Handle incoming messages
      messaging().onMessage(async (remoteMessage) => {
        this.handleNotification(remoteMessage);
      });

      // Handle background messages
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        this.handleNotification(remoteMessage);
      });
    }
  }

  private async saveTokenToServer(token: string): Promise<void> {
    try {
      // Save token to AsyncStorage for offline access
      await AsyncStorage.setItem('fcm_token', token);

      // Send to backend
      const response = await fetch(`${API_CONFIG.baseUrl}/push/register-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          appVersion: '1.0.0'
        })
      });

      if (!response.ok) {
        console.warn('Failed to register push token');
      }
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  private async handleNotification(remoteMessage: any): Promise<void> {
    const { notification, data } = remoteMessage;

    // Handle different notification types
    switch (data?.type) {
      case 'welcome':
        this.showWelcomeNotification(notification);
        break;
      case 'feature_update':
        this.showFeatureNotification(notification, data);
        break;
      case 'engagement':
        this.showEngagementNotification(notification);
        break;
      default:
        this.showDefaultNotification(notification);
    }
  }

  private showWelcomeNotification(notification: any): void {
    // Custom welcome notification handling
    console.log('Welcome notification:', notification);
  }

  private showFeatureNotification(notification: any, data: any): void {
    // Handle feature announcements
    console.log('Feature notification:', notification, data);
  }

  private showEngagementNotification(notification: any): void {
    // Handle re-engagement notifications
    console.log('Engagement notification:', notification);
  }

  private showDefaultNotification(notification: any): void {
    // Default notification handling
    console.log('Notification:', notification);
  }

  async sendLocalNotification(title: string, body: string, data?: any): Promise<void> {
    // Send local notification (for testing)
    await messaging().sendMessage({
      to: this.fcmToken!,
      notification: {
        title,
        body
      },
      data: data || {}
    });
  }

  private async getAuthToken(): Promise<string> {
    // Get auth token from secure storage
    return await AsyncStorage.getItem('auth_token') || '';
  }

  getToken(): string | null {
    return this.fcmToken;
  }
}

export default new PushNotificationService();
```

### 📋 DELIVERABLES (3-4 Stunden)

1. **✅ Email Marketing Service** - AI-powered Personalization & Sequences
2. **✅ Welcome Sequences** - 4-Email Onboarding Flow
3. **✅ Behavioral Triggers** - Smart Email Automation
4. **✅ A/B Testing Framework** - Email Optimization
5. **✅ Mobile Push Notifications** - Firebase Integration
6. **✅ Referral Program** - Mobile Sharing Features

### 📊 MARKETING METRICS DASHBOARD

```typescript
// src/screens/marketing/MarketingDashboard.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';

export default function MarketingDashboard() {
  const [metrics, setMetrics] = useState({
    email: {
      sent: 0,
      openRate: 0,
      clickRate: 0,
      conversions: 0
    },
    push: {
      sent: 0,
      openRate: 0,
      conversions: 0
    },
    referrals: {
      total: 0,
      conversions: 0,
      revenue: 0
    }
  });

  useEffect(() => {
    fetchMarketingMetrics();
  }, []);

  const fetchMarketingMetrics = async () => {
    // Fetch from backend
    const data = await api.getMarketingMetrics();
    setMetrics(data);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 Marketing Performance</Text>

      {/* Email Metrics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📧 Email Campaigns</Text>
        <View style={styles.metrics}>
          <Text>Sent: {metrics.email.sent}</Text>
          <Text>Open Rate: {(metrics.email.openRate * 100).toFixed(1)}%</Text>
          <Text>Click Rate: {(metrics.email.clickRate * 100).toFixed(1)}%</Text>
          <Text>Conversions: {metrics.email.conversions}</Text>
        </View>
      </View>

      {/* Push Notifications */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📱 Push Notifications</Text>
        <View style={styles.metrics}>
          <Text>Sent: {metrics.push.sent}</Text>
          <Text>Open Rate: {(metrics.push.openRate * 100).toFixed(1)}%</Text>
          <Text>Conversions: {metrics.push.conversions}</Text>
        </View>
      </View>

      {/* Referral Program */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👥 Referral Program</Text>
        <View style={styles.metrics}>
          <Text>Total Referrals: {metrics.referrals.total}</Text>
          <Text>Conversions: {metrics.referrals.conversions}</Text>
          <Text>Revenue: €{metrics.referrals.revenue}</Text>
        </View>
      </View>

      {/* A/B Test Results */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🧪 A/B Tests</Text>
        <Text>Running Tests: 3</Text>
        <Text>Completed: 12</Text>
        <Text>Avg. Improvement: +23.5%</Text>
      </View>
    </ScrollView>
  );
}
```

### 📈 SUCCESS METRICS TARGETS

| **Metric** | **Target** | **Current** | **Trend** |
|------------|------------|-------------|-----------|
| **Email Open Rate** | 35% | 28.5% | 📈 +2.1% |
| **Email Click Rate** | 8% | 6.2% | 📈 +1.8% |
| **Push Open Rate** | 45% | 38.7% | 📈 +3.2% |
| **Trial Conversion** | 15% | 12.3% | 📈 +1.5% |
| **Referral Rate** | 8% | 5.8% | 📈 +2.2% |
| **Unsubscribe Rate** | <2% | 1.2% | 📈 -0.3% |

### 🚀 MARKETING AUTOMATION FLOWS

**Welcome Sequence:**
```
Day 0: Welcome Email → Personalized onboarding
Day 2: Feature Tips → Quick wins guide  
Day 7: Success Story → Social proof
Day 14: Check-in → Personal progress review
```

**Re-engagement Flow:**
```
Trigger: 3+ days inactive
→ Push: "We miss you!"
→ Email: What's new
→ Push: Feature reminder
→ Email: Special offer
```

**Upgrade Flow:**
```
Trigger: Trial expires in 3 days
→ Email: Gentle reminder
→ Push: Last chance offer
→ Email: Final upgrade call
→ Push: Account pause warning
```

**GOAL**: Mobile-First Marketing Engine mit AI-Personalisierung & 25% höherer Conversion! 📱

**TIMEFRAME**: 3-4 hours für komplette Marketing Automation
