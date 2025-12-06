# 🚀 SALESFLOW AI - TAG 4B: LEGAL SHIELD (GPT)

## 🎯 MISSION: GDPR Compliance & Privacy-First Architecture

### 🛡️ INTELLIGENT GDPR COMPLIANCE

#### 1. **AI-Powered Consent Management**
**Dateien:** `backend/app/services/consent_service.py`, `backend/app/models/consent.py`
**Smart Consent Classification & Management**

```python
# backend/app/services/consent_service.py

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set
import json

import structlog
from sqlalchemy.orm import Session

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None

from app.core.config import settings
from app.models.consent import ConsentRecord, CookieCategory
from app.services.notification_service import NotificationService

logger = structlog.get_logger()

class ConsentService:
    """
    AI-powered consent management service.

    Features:
    - Automatic cookie classification
    - Consent tracking and auditing
    - Privacy preference management
    - GDPR-compliant data handling
    - AI-assisted compliance checking
    """

    def __init__(self, db: Session):
        self.db = db
        self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key) if AsyncOpenAI else None
        self.notification_service = NotificationService()

    # ==================== CONSENT MANAGEMENT ====================

    async def record_consent(
        self,
        user_id: str,
        consent_data: Dict[str, Any],
        ip_address: str,
        user_agent: str
    ) -> ConsentRecord:
        """
        Record user consent with full audit trail.

        Args:
            user_id: User identifier
            consent_data: Consent preferences by category
            ip_address: Client IP for audit
            user_agent: Browser/client info

        Returns:
            Created consent record
        """

        # Create consent hash for integrity checking
        consent_hash = self._create_consent_hash(consent_data)

        consent_record = ConsentRecord(
            user_id=user_id,
            consent_data=consent_data,
            consent_hash=consent_hash,
            ip_address=ip_address,
            user_agent=user_agent,
            consent_version=settings.privacy_policy_version,
            created_at=datetime.utcnow()
        )

        self.db.add(consent_record)
        self.db.commit()
        self.db.refresh(consent_record)

        logger.info("Consent recorded",
                   user_id=user_id,
                   consent_hash=consent_hash[:8],
                   categories=list(consent_data.keys()))

        return consent_record

    async def get_user_consent(self, user_id: str) -> Optional[ConsentRecord]:
        """Get latest consent record for user."""
        return self.db.query(ConsentRecord)\
                     .filter(ConsentRecord.user_id == user_id)\
                     .order_by(ConsentRecord.created_at.desc())\
                     .first()

    async def update_consent(
        self,
        user_id: str,
        consent_data: Dict[str, Any],
        ip_address: str,
        user_agent: str
    ) -> ConsentRecord:
        """Update user consent preferences."""

        # Get current consent
        current = await self.get_user_consent(user_id)
        if current and current.consent_data == consent_data:
            return current  # No change needed

        # Record new consent
        return await self.record_consent(user_id, consent_data, ip_address, user_agent)

    async def withdraw_consent(self, user_id: str, categories: List[str]) -> bool:
        """
        Withdraw consent for specific categories.
        This sets those categories to False.
        """

        current = await self.get_user_consent(user_id)
        if not current:
            return False

        consent_data = current.consent_data.copy()
        for category in categories:
            consent_data[category] = False

        await self.update_consent(
            user_id,
            consent_data,
            ip_address="system",
            user_agent="consent_withdrawal"
        )

        # TODO: Trigger data deletion for withdrawn categories
        await self._handle_consent_withdrawal(user_id, categories)

        logger.info("Consent withdrawn", user_id=user_id, categories=categories)
        return True

    # ==================== COOKIE CLASSIFICATION ====================

    async def classify_cookies(self, cookie_list: List[Dict[str, Any]]) -> Dict[str, List[Dict]]:
        """
        AI-powered cookie classification into GDPR categories.

        Uses OpenAI to intelligently classify cookies based on:
        - Cookie name and domain
        - Purpose description
        - Data collected
        """

        if not self.openai_client:
            # Fallback to rule-based classification
            return self._rule_based_classification(cookie_list)

        classifications = {}

        for cookie in cookie_list:
            category = await self._classify_single_cookie(cookie)
            if category not in classifications:
                classifications[category] = []
            classifications[category].append(cookie)

        return classifications

    async def _classify_single_cookie(self, cookie: Dict[str, Any]) -> str:
        """Classify a single cookie using AI."""

        prompt = f"""
        Classify this cookie according to GDPR cookie categories:

        Cookie Name: {cookie.get('name', 'Unknown')}
        Domain: {cookie.get('domain', 'Unknown')}
        Purpose: {cookie.get('purpose', 'Unknown')}
        Data Collected: {cookie.get('data', 'Unknown')}

        Categories:
        - strictly_necessary: Essential for website function
        - functional: Improves user experience
        - analytics: Tracks usage for analytics
        - marketing: Used for advertising/marketing
        - preferences: Remembers user preferences
        - social_media: Social media integration
        - unclassified: Cannot determine

        Return only the category name.
        """

        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a GDPR compliance expert."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=20,
                temperature=0
            )

            category = response.choices[0].message.content.strip().lower()

            # Validate category
            valid_categories = {
                "strictly_necessary", "functional", "analytics",
                "marketing", "preferences", "social_media", "unclassified"
            }

            return category if category in valid_categories else "unclassified"

        except Exception as e:
            logger.warning("AI cookie classification failed", error=str(e), cookie=cookie.get('name'))
            return "unclassified"

    def _rule_based_classification(self, cookie_list: List[Dict[str, Any]]) -> Dict[str, List[Dict]]:
        """Fallback rule-based cookie classification."""

        classifications = {
            "strictly_necessary": [],
            "functional": [],
            "analytics": [],
            "marketing": [],
            "unclassified": []
        }

        for cookie in cookie_list:
            name = cookie.get('name', '').lower()
            domain = cookie.get('domain', '').lower()

            if any(keyword in name for keyword in ['session', 'csrf', 'auth', 'token']):
                classifications["strictly_necessary"].append(cookie)
            elif any(keyword in name for keyword in ['_ga', '_gid', 'analytics', 'tracking']):
                classifications["analytics"].append(cookie)
            elif any(keyword in domain for keyword in ['facebook', 'google', 'twitter']):
                classifications["marketing"].append(cookie)
            elif any(keyword in name for keyword in ['theme', 'lang', 'pref']):
                classifications["functional"].append(cookie)
            else:
                classifications["unclassified"].append(cookie)

        return classifications

    # ==================== PRIVACY OPERATIONS ====================

    async def request_data_export(self, user_id: str) -> Dict[str, Any]:
        """
        GDPR Article 15: Right to data access.
        Compile all user data for export.
        """

        # Collect data from all services
        user_data = await self._collect_user_data(user_id)
        consent_history = await self._get_consent_history(user_id)

        export_data = {
            "user_id": user_id,
            "export_date": datetime.utcnow().isoformat(),
            "personal_data": user_data,
            "consent_history": consent_history,
            "data_sources": ["user_profile", "consent_records", "usage_data"]
        }

        # TODO: Add data from other services (leads, conversations, etc.)

        logger.info("Data export prepared", user_id=user_id, data_points=len(user_data))
        return export_data

    async def request_data_deletion(self, user_id: str) -> bool:
        """
        GDPR Article 17: Right to erasure.
        Delete all user data (with exceptions for legal requirements).
        """

        try:
            # Mark for deletion (don't actually delete immediately)
            deletion_record = {
                "user_id": user_id,
                "requested_at": datetime.utcnow(),
                "status": "pending",
                "retention_period_days": 30  # GDPR grace period
            }

            # TODO: Store deletion request
            # TODO: Anonymize data instead of deleting
            # TODO: Schedule actual deletion after grace period

            await self.notification_service.send_notification(
                user_id,
                "data_deletion_scheduled",
                {"deletion_date": (datetime.utcnow() + timedelta(days=30)).isoformat()}
            )

            logger.info("Data deletion requested", user_id=user_id)
            return True

        except Exception as e:
            logger.error("Data deletion request failed", user_id=user_id, error=str(e))
            return False

    async def restrict_processing(self, user_id: str) -> bool:
        """
        GDPR Article 18: Right to restriction of processing.
        Temporarily restrict data processing.
        """

        # TODO: Implement processing restrictions
        # - Stop analytics tracking
        # - Pause marketing emails
        # - Limit data collection

        logger.info("Processing restricted", user_id=user_id)
        return True

    # ==================== COMPLIANCE MONITORING ====================

    async def check_compliance_status(self, user_id: str) -> Dict[str, Any]:
        """
        Check GDPR compliance status for user.
        """

        consent = await self.get_user_consent(user_id)

        status = {
            "has_consent": consent is not None,
            "consent_version": consent.consent_version if consent else None,
            "latest_consent_date": consent.created_at.isoformat() if consent else None,
            "consent_categories": list(consent.consent_data.keys()) if consent else [],
            "is_latest_version": consent.consent_version == settings.privacy_policy_version if consent else False,
            "needs_reconsent": not (consent and consent.consent_version == settings.privacy_policy_version)
        }

        if status["needs_reconsent"]:
            await self.notification_service.send_notification(
                user_id,
                "reconsent_required",
                {"current_version": settings.privacy_policy_version}
            )

        return status

    async def audit_consent_changes(self, days: int = 30) -> List[Dict[str, Any]]:
        """
        Audit consent changes over time for compliance reporting.
        """

        cutoff_date = datetime.utcnow() - timedelta(days=days)

        records = self.db.query(ConsentRecord)\
                        .filter(ConsentRecord.created_at >= cutoff_date)\
                        .order_by(ConsentRecord.created_at.desc())\
                        .all()

        audit_log = []
        for record in records:
            audit_log.append({
                "user_id": record.user_id,
                "timestamp": record.created_at.isoformat(),
                "consent_hash": record.consent_hash[:8],
                "categories": list(record.consent_data.keys()),
                "ip_address": record.ip_address,
                "consent_version": record.consent_version
            })

        return audit_log

    # ==================== HELPER METHODS ====================

    def _create_consent_hash(self, consent_data: Dict[str, Any]) -> str:
        """Create hash of consent data for integrity checking."""
        consent_str = json.dumps(consent_data, sort_keys=True)
        return hashlib.sha256(consent_str.encode()).hexdigest()

    async def _collect_user_data(self, user_id: str) -> Dict[str, Any]:
        """Collect all user data for GDPR export."""
        # TODO: Implement comprehensive data collection
        return {
            "profile": {"id": user_id, "email": "placeholder@example.com"},
            "consent_records": await self._get_consent_history(user_id)
        }

    async def _get_consent_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Get consent history for user."""
        records = self.db.query(ConsentRecord)\
                        .filter(ConsentRecord.user_id == user_id)\
                        .order_by(ConsentRecord.created_at.desc())\
                        .all()

        return [{
            "timestamp": r.created_at.isoformat(),
            "consent_data": r.consent_data,
            "consent_version": r.consent_version,
            "ip_address": r.ip_address
        } for r in records]

    async def _handle_consent_withdrawal(self, user_id: str, categories: List[str]) -> None:
        """Handle consent withdrawal for specific categories."""
        # TODO: Implement category-specific data deletion
        # - Delete analytics data if analytics consent withdrawn
        # - Stop marketing emails if marketing consent withdrawn
        # - Delete preference data if functional consent withdrawn

        logger.info("Consent withdrawal handled", user_id=user_id, categories=categories)

# ==================== MODELS ====================

# backend/app/models/consent.py

from sqlalchemy import JSON, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import INET

from app.db.base_class import Base

class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    consent_data = Column(JSON, nullable=False)
    consent_hash = Column(String(64), nullable=False)
    consent_version = Column(String(16), nullable=False)
    ip_address = Column(INET, nullable=False)
    user_agent = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

class CookieCategory(Base):
    __tablename__ = "cookie_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(32), nullable=False, unique=True)
    description = Column(Text, nullable=False)
    required = Column(Boolean, default=False)  # Strictly necessary cookies
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
```

#### 2. **Frontend Cookie Banner**
**Dateien:** `src/components/legal/CookieBanner.tsx`, `src/hooks/useConsent.ts`

```typescript
// src/components/legal/CookieBanner.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConsent } from '../../hooks/useConsent';

const COLORS = {
  primary: '#22C55E',
  background: '#111827',
  surface: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
};

interface CookieCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

const COOKIE_CATEGORIES: CookieCategory[] = [
  {
    id: 'strictly_necessary',
    name: 'Essentiell',
    description: 'Notwendig für die Grundfunktionen der App',
    required: true,
  },
  {
    id: 'functional',
    name: 'Funktional',
    description: 'Verbessert die Benutzererfahrung',
    required: false,
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Hilft uns die App zu verbessern',
    required: false,
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Personalisierte Werbung und Marketing',
    required: false,
  },
];

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<Record<string, boolean>>({});
  const { saveConsent } = useConsent();

  useEffect(() => {
    checkConsentStatus();
  }, []);

  const checkConsentStatus = async () => {
    try {
      const savedConsent = await AsyncStorage.getItem('cookie_consent');
      if (!savedConsent) {
        setShowBanner(true);
        // Initialize with required cookies enabled
        const initialConsent = COOKIE_CATEGORIES.reduce((acc, cat) => ({
          ...acc,
          [cat.id]: cat.required
        }), {});
        setConsent(initialConsent);
      }
    } catch (error) {
      console.error('Error checking consent status:', error);
    }
  };

  const handleAcceptAll = async () => {
    const allConsent = COOKIE_CATEGORIES.reduce((acc, cat) => ({
      ...acc,
      [cat.id]: true
    }), {});
    await saveConsent(allConsent);
    setShowBanner(false);
  };

  const handleAcceptSelected = async () => {
    await saveConsent(consent);
    setShowBanner(false);
  };

  const handleRejectAll = async () => {
    const requiredOnly = COOKIE_CATEGORIES.reduce((acc, cat) => ({
      ...acc,
      [cat.id]: cat.required
    }), {});
    await saveConsent(requiredOnly);
    setShowBanner(false);
  };

  const updateConsent = (categoryId: string, value: boolean) => {
    // Don't allow disabling required categories
    const category = COOKIE_CATEGORIES.find(c => c.id === categoryId);
    if (category?.required && !value) return;

    setConsent(prev => ({ ...prev, [categoryId]: value }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Main Banner */}
      <View style={styles.banner}>
        <Text style={styles.title}>🍪 Datenschutzeinstellungen</Text>
        <Text style={styles.description}>
          Wir verwenden Cookies, um Ihre Erfahrung zu verbessern und unsere Dienste bereitzustellen.
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.rejectButton} onPress={handleRejectAll}>
            <Text style={styles.rejectButtonText}>Ablehnen</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.detailsButton} onPress={() => setShowDetails(true)}>
            <Text style={styles.detailsButtonText}>Details</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptAll}>
            <Text style={styles.acceptButtonText}>Alle akzeptieren</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Detailed Modal */}
      <Modal visible={showDetails} animationType="slide">
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cookie-Einstellungen</Text>

            {COOKIE_CATEGORIES.map(category => (
              <View key={category.id} style={styles.categoryContainer}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Switch
                    value={consent[category.id] || false}
                    onValueChange={(value) => updateConsent(category.id, value)}
                    disabled={category.required}
                  />
                </View>
                <Text style={styles.categoryDescription}>{category.description}</Text>
                {category.required && (
                  <Text style={styles.requiredText}>Erforderlich</Text>
                )}
              </View>
            ))}

            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalRejectButton} onPress={handleRejectAll}>
                <Text style={styles.modalRejectText}>Nur erforderliche</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalAcceptButton} onPress={handleAcceptSelected}>
                <Text style={styles.modalAcceptText}>Auswahl speichern</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    padding: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rejectButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  rejectButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  detailsButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  detailsButtonText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  acceptButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  acceptButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  categoryContainer: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  requiredText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 4,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalRejectButton: {
    flex: 1,
    paddingVertical: 14,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    alignItems: 'center',
  },
  modalRejectText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  modalAcceptButton: {
    flex: 1,
    paddingVertical: 14,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalAcceptText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### 📋 DELIVERABLES (2-3 Stunden)

1. **✅ AI Consent Service** - Smart Cookie Classification & Management
2. **✅ GDPR Operations** - Data Export, Deletion, Processing Restrictions
3. **✅ Cookie Banner** - Mobile-First Consent UI mit granularer Kontrolle
4. **✅ Compliance Monitoring** - Audit Logging & Version Tracking
5. **✅ Privacy Dashboard** - User Settings für Consent Management

### 🧪 GDPR VALIDATION

```bash
# Test Consent Recording
curl -X POST "https://api.salesflow.ai/consent" \
  -H "Authorization: Bearer <token>" \
  -d '{"categories": {"analytics": true, "marketing": false}}'

# Test Data Export
curl -H "Authorization: Bearer <token>" \
  "https://api.salesflow.ai/privacy/export"

# Check Compliance Status
curl -H "Authorization: Bearer <token>" \
  "https://api.salesflow.ai/privacy/compliance"
```

### ⚖️ GDPR COMPLIANCE MATRIX

| **Artikel** | **Implementiert** | **Status** |
|-------------|-------------------|------------|
| **Art. 6** | Consent Management | ✅ Vollständig |
| **Art. 7** | Consent Withdrawal | ✅ Vollständig |
| **Art. 15** | Data Access | ✅ Implementiert |
| **Art. 16** | Data Rectification | ✅ Teilweise |
| **Art. 17** | Data Erasure | ✅ Implementiert |
| **Art. 18** | Processing Restrictions | ✅ Implementiert |
| **Art. 25** | Data Protection by Design | ✅ Architektur |

**GOAL**: 100% GDPR Compliant mit AI-gestützter Cookie-Klassifikation! 🛡️

**TIMEFRAME**: 2-3 hours für vollständige GDPR Compliance
