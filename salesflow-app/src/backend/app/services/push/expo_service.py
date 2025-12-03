"""
╔════════════════════════════════════════════════════════════════════════════╗
║  EXPO PUSH NOTIFICATION SERVICE                                            ║
║  Integration mit Expo Push API                                             ║
╚════════════════════════════════════════════════════════════════════════════╝

Sendet Push Notifications über Expo Push API.
Docs: https://docs.expo.dev/push-notifications/sending-notifications/

Features:
    - Single & Batch Push Sending
    - Receipt Tracking
    - Error Handling
    - Specialized Push Types (Morning, Evening, Achievement, etc.)
"""

import os
import httpx
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ExpoPushMessage:
    """Expo Push Nachricht."""
    to: str  # Expo push token (ExponentPushToken[xxx])
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None
    sound: str = "default"
    badge: Optional[int] = None
    channel_id: Optional[str] = None  # Android notification channel
    priority: str = "default"  # 'default', 'normal', 'high'
    ttl: int = 0  # Time to live in seconds (0 = no expiration)
    subtitle: Optional[str] = None  # iOS subtitle


@dataclass
class ExpoPushReceipt:
    """Empfangsbestätigung für Push."""
    id: str
    status: str  # 'ok' or 'error'
    message: Optional[str] = None
    details: Optional[Dict] = None


class ExpoPushService:
    """
    Expo Push Notification Service.
    
    Sendet Push Notifications über die Expo Push API.
    Unterstützt iOS, Android und Web.
    """
    
    EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
    EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts"
    
    # Notification Channels (Android)
    CHANNELS = {
        "morning": "Morning Briefing",
        "evening": "Evening Recap",
        "achievement": "Achievements",
        "reminder": "Reminders",
        "urgent": "Dringende Nachrichten",
        "streak": "Streak Warnungen",
    }
    
    def __init__(self):
        self.access_token = os.getenv("EXPO_ACCESS_TOKEN")  # Optional for higher limits
    
    def _get_headers(self) -> Dict[str, str]:
        """Erstellt Header für Expo API Requests."""
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Accept-Encoding": "gzip, deflate",
        }
        
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        
        return headers
    
    async def send_notification(self, message: ExpoPushMessage) -> Dict[str, Any]:
        """
        Sendet eine einzelne Push Notification.
        
        Args:
            message: ExpoPushMessage Objekt
        
        Returns:
            API Response mit ticket_id oder error
        """
        return await self.send_notifications([message])
    
    async def send_notifications(
        self, 
        messages: List[ExpoPushMessage],
    ) -> Dict[str, Any]:
        """
        Sendet mehrere Push Notifications (max 100 pro Request).
        
        Args:
            messages: Liste von ExpoPushMessage Objekten
        
        Returns:
            API Response mit ticket_ids oder errors
        """
        
        if not messages:
            return {"status": "error", "message": "Keine Nachrichten zum Senden"}
        
        # Chunk into batches of 100 (Expo limit)
        results = []
        for i in range(0, len(messages), 100):
            batch = messages[i:i+100]
            result = await self._send_batch(batch)
            results.append(result)
        
        return {
            "status": "ok",
            "batches": len(results),
            "results": results,
        }
    
    async def _send_batch(self, messages: List[ExpoPushMessage]) -> Dict[str, Any]:
        """Sendet einen Batch von Notifications."""
        
        # Format messages for Expo API
        payload = []
        for msg in messages:
            item = {
                "to": msg.to,
                "title": msg.title,
                "body": msg.body,
                "sound": msg.sound,
                "priority": msg.priority,
            }
            
            if msg.data:
                item["data"] = msg.data
            if msg.badge is not None:
                item["badge"] = msg.badge
            if msg.channel_id:
                item["channelId"] = msg.channel_id
            if msg.ttl > 0:
                item["ttl"] = msg.ttl
            if msg.subtitle:
                item["subtitle"] = msg.subtitle
            
            payload.append(item)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.EXPO_PUSH_URL,
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0,
                )
                
                response.raise_for_status()
                return response.json()
        
        except httpx.HTTPStatusError as e:
            return {
                "status": "error",
                "message": f"HTTP Error: {e.response.status_code}",
                "details": str(e),
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
            }
    
    async def get_receipts(self, ticket_ids: List[str]) -> Dict[str, ExpoPushReceipt]:
        """
        Holt Empfangsbestätigungen für gesendete Notifications.
        
        Args:
            ticket_ids: Liste von Ticket IDs aus send_notification Response
        
        Returns:
            Dict mit ticket_id → ExpoPushReceipt Mapping
        """
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.EXPO_RECEIPTS_URL,
                    json={"ids": ticket_ids},
                    headers=self._get_headers(),
                    timeout=30.0,
                )
                
                response.raise_for_status()
                data = response.json()
                
                receipts = {}
                for ticket_id, receipt in data.get("data", {}).items():
                    receipts[ticket_id] = ExpoPushReceipt(
                        id=ticket_id,
                        status=receipt.get("status", "unknown"),
                        message=receipt.get("message"),
                        details=receipt.get("details"),
                    )
                
                return receipts
        
        except Exception as e:
            print(f"Error getting receipts: {e}")
            return {}
    
    # =========================================================================
    # SPECIALIZED PUSH METHODS
    # =========================================================================
    
    async def send_morning_briefing(
        self,
        push_token: str,
        content: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Sendet Morning Briefing Push.
        
        Args:
            push_token: Expo Push Token
            content: Morning Briefing Content Dict
        """
        
        message = ExpoPushMessage(
            to=push_token,
            title=content.get("push_title", "Guten Morgen! ☀️"),
            body=content.get("push_body", "Dein tägliches Briefing wartet"),
            data={
                "type": "morning_briefing",
                "action": "open_daily_flow",
                "timestamp": datetime.utcnow().isoformat(),
            },
            channel_id="morning",
            priority="high",
        )
        
        return await self.send_notification(message)
    
    async def send_evening_recap(
        self,
        push_token: str,
        content: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Sendet Evening Recap Push.
        
        Args:
            push_token: Expo Push Token
            content: Evening Recap Content Dict
        """
        
        message = ExpoPushMessage(
            to=push_token,
            title=content.get("push_title", "Dein Tag in Zahlen 📊"),
            body=content.get("push_body", "Schau dir deinen Tagesrückblick an"),
            data={
                "type": "evening_recap",
                "action": "open_analytics",
                "timestamp": datetime.utcnow().isoformat(),
            },
            channel_id="evening",
        )
        
        return await self.send_notification(message)
    
    async def send_streak_warning(
        self,
        push_token: str,
        streak: int,
        user_name: str = "du",
    ) -> Dict[str, Any]:
        """
        Warnt User wenn Streak in Gefahr.
        
        Args:
            push_token: Expo Push Token
            streak: Aktuelle Streak-Länge
            user_name: Name des Users
        """
        
        if streak >= 30:
            urgency = "🚨"
            body = f"Deine {streak}-Tage-Streak ist in Gefahr! Schnell eine Nachricht senden!"
        elif streak >= 7:
            urgency = "⚠️"
            body = f"{streak} Tage Streak! Noch keine Aktivität heute. Los geht's!"
        else:
            urgency = "💪"
            body = f"Tag {streak} deiner Streak wartet. Mach weiter!"
        
        message = ExpoPushMessage(
            to=push_token,
            title=f"{urgency} Streak in Gefahr!",
            body=body,
            data={
                "type": "streak_warning",
                "action": "open_daily_flow",
                "streak": streak,
                "timestamp": datetime.utcnow().isoformat(),
            },
            channel_id="streak",
            priority="high",
        )
        
        return await self.send_notification(message)
    
    async def send_achievement_unlocked(
        self,
        push_token: str,
        achievement_name: str,
        achievement_emoji: str,
        achievement_description: str = "",
    ) -> Dict[str, Any]:
        """
        Benachrichtigt über freigeschaltetes Achievement.
        
        Args:
            push_token: Expo Push Token
            achievement_name: Name des Achievements
            achievement_emoji: Emoji für das Achievement
            achievement_description: Beschreibung
        """
        
        message = ExpoPushMessage(
            to=push_token,
            title=f"{achievement_emoji} Achievement freigeschaltet!",
            body=achievement_name,
            subtitle=achievement_description if achievement_description else None,
            data={
                "type": "achievement",
                "action": "open_achievements",
                "achievement_name": achievement_name,
                "timestamp": datetime.utcnow().isoformat(),
            },
            channel_id="achievement",
            sound="achievement.wav",  # Custom sound wenn vorhanden
        )
        
        return await self.send_notification(message)
    
    async def send_reminder(
        self,
        push_token: str,
        title: str,
        body: str,
        action: str = "open_app",
        data: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Sendet allgemeinen Reminder Push.
        
        Args:
            push_token: Expo Push Token
            title: Push Titel
            body: Push Body
            action: Action beim Tippen
            data: Zusätzliche Daten
        """
        
        push_data = {
            "type": "reminder",
            "action": action,
            "timestamp": datetime.utcnow().isoformat(),
        }
        if data:
            push_data.update(data)
        
        message = ExpoPushMessage(
            to=push_token,
            title=title,
            body=body,
            data=push_data,
            channel_id="reminder",
        )
        
        return await self.send_notification(message)
    
    async def send_hot_lead_alert(
        self,
        push_token: str,
        lead_name: str,
        reason: str,
    ) -> Dict[str, Any]:
        """
        Sendet Benachrichtigung über heißen Lead.
        
        Args:
            push_token: Expo Push Token
            lead_name: Name des Leads
            reason: Warum ist der Lead heiß?
        """
        
        message = ExpoPushMessage(
            to=push_token,
            title=f"🔥 Heißer Lead: {lead_name}",
            body=reason,
            data={
                "type": "hot_lead",
                "action": "open_lead",
                "lead_name": lead_name,
                "timestamp": datetime.utcnow().isoformat(),
            },
            channel_id="urgent",
            priority="high",
        )
        
        return await self.send_notification(message)
    
    # =========================================================================
    # BATCH OPERATIONS
    # =========================================================================
    
    async def send_bulk_morning_briefings(
        self,
        recipients: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Sendet Morning Briefings an mehrere User.
        
        Args:
            recipients: Liste von {"push_token": str, "content": dict}
        """
        
        messages = []
        for r in recipients:
            if r.get("push_token") and r.get("content"):
                messages.append(ExpoPushMessage(
                    to=r["push_token"],
                    title=r["content"].get("push_title", "Guten Morgen! ☀️"),
                    body=r["content"].get("push_body", ""),
                    data={
                        "type": "morning_briefing",
                        "action": "open_daily_flow",
                    },
                    channel_id="morning",
                ))
        
        return await self.send_notifications(messages)
    
    async def send_bulk_streak_warnings(
        self,
        at_risk_users: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Sendet Streak-Warnungen an mehrere User.
        
        Args:
            at_risk_users: Liste von {"push_token": str, "streak": int, "name": str}
        """
        
        messages = []
        for user in at_risk_users:
            if user.get("push_token"):
                streak = user.get("streak", 0)
                messages.append(ExpoPushMessage(
                    to=user["push_token"],
                    title="⚠️ Streak in Gefahr!",
                    body=f"Deine {streak}-Tage-Streak wartet auf dich!",
                    data={
                        "type": "streak_warning",
                        "action": "open_daily_flow",
                        "streak": streak,
                    },
                    channel_id="streak",
                    priority="high",
                ))
        
        return await self.send_notifications(messages)
    
    # =========================================================================
    # UTILITIES
    # =========================================================================
    
    @staticmethod
    def is_valid_expo_token(token: str) -> bool:
        """Prüft ob ein Token ein gültiges Expo Push Token ist."""
        return token.startswith("ExponentPushToken[") and token.endswith("]")
    
    @staticmethod
    def extract_token_id(token: str) -> Optional[str]:
        """Extrahiert die ID aus einem Expo Token."""
        if ExpoPushService.is_valid_expo_token(token):
            return token[len("ExponentPushToken["):-1]
        return None

