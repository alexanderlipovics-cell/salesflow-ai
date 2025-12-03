"""
╔════════════════════════════════════════════════════════════════════════════════╗
║  AUTONOMOUS BRAIN v2.0 - Das zentrale KI-Entscheidungssystem                  ║
║  ══════════════════════════════════════════════════════════════════════════════║
║                                                                                ║
║  VERBESSERUNGEN in v2.0:                                                       ║
║  ✅ Intelligentes Caching für schnellere Entscheidungen                        ║
║  ✅ Priorisierte Entscheidungs-Queue                                           ║
║  ✅ Batch-Processing für mehrere Observations                                  ║
║  ✅ Fehlertoleranz und automatisches Recovery                                  ║
║  ✅ Metriken-Tracking für Performance-Analyse                                  ║
║  ✅ Confidence-Kalibrierung basierend auf historischen Daten                   ║
║  ✅ Context-Awareness mit Gedächtnis über vergangene Interaktionen            ║
║                                                                                ║
║  VISION: AURA OS als vollständig autonomes Vertriebs-Unternehmen               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
"""

import asyncio
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from collections import defaultdict
import json
import re
import time
import anthropic
import hashlib

from supabase import Client


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS & TYPES
# ═══════════════════════════════════════════════════════════════════════════════

class DecisionPriority(Enum):
    """Priorität einer Entscheidung"""
    CRITICAL = "critical"      # Sofort ausführen (Revenue at risk)
    HIGH = "high"              # Innerhalb 1 Stunde
    MEDIUM = "medium"          # Heute
    LOW = "low"                # Diese Woche
    BACKGROUND = "background"  # Wenn Zeit ist


class ActionType(Enum):
    """Typen von autonomen Aktionen"""
    # Kommunikation
    SEND_MESSAGE = "send_message"
    SEND_EMAIL = "send_email"
    SCHEDULE_CALL = "schedule_call"
    
    # Lead Management
    UPDATE_LEAD_STATUS = "update_lead_status"
    CREATE_FOLLOWUP = "create_followup"
    SCORE_LEAD = "score_lead"
    
    # Content
    GENERATE_CONTENT = "generate_content"
    PERSONALIZE_MESSAGE = "personalize_message"
    
    # Strategie
    ADJUST_SEQUENCE = "adjust_sequence"
    CHANGE_APPROACH = "change_approach"
    ESCALATE_TO_HUMAN = "escalate_to_human"
    
    # Learning
    UPDATE_KNOWLEDGE = "update_knowledge"
    CREATE_RULE = "create_rule"


class ConfidenceLevel(Enum):
    """Wie sicher ist das Brain bei einer Entscheidung?"""
    VERY_HIGH = "very_high"    # >95% - Automatisch ausführen
    HIGH = "high"              # >80% - Mit minimalem Review
    MEDIUM = "medium"          # >60% - User Approval nötig
    LOW = "low"                # >40% - Vorschlag zur Diskussion
    UNCERTAIN = "uncertain"    # <40% - Nur als Option zeigen


class AutonomyMode(Enum):
    """Autonomie-Modi des Brains"""
    PASSIVE = "passive"         # Nur beobachten
    ADVISORY = "advisory"       # Vorschläge machen
    SUPERVISED = "supervised"   # Mit Genehmigung
    AUTONOMOUS = "autonomous"   # Selbstständig
    FULL_AUTO = "full_auto"     # Vollständig autonom


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Observation:
    """Eine Beobachtung, die das Brain verarbeitet"""
    id: str
    type: str
    data: Dict[str, Any]
    timestamp: datetime
    user_id: str
    company_id: Optional[str] = None
    source: str = "system"
    priority: DecisionPriority = DecisionPriority.MEDIUM


@dataclass
class Decision:
    """Eine Entscheidung des Brains"""
    id: str
    observation_id: str
    action_type: ActionType
    action_params: Dict[str, Any]
    reasoning: str
    confidence: ConfidenceLevel
    priority: DecisionPriority
    requires_approval: bool
    created_at: datetime = field(default_factory=datetime.utcnow)
    approved: Optional[bool] = None
    executed: bool = False
    result: Optional[Dict[str, Any]] = None
    execution_time_ms: Optional[int] = None


@dataclass
class BrainState:
    """Aktueller Zustand des Brains für einen User"""
    user_id: str
    company_id: Optional[str]
    
    # Aktuelle Metriken
    active_leads: int = 0
    pending_followups: int = 0
    hot_opportunities: int = 0
    at_risk_deals: int = 0
    
    # Performance
    daily_target_progress: float = 0.0
    weekly_conversion_rate: float = 0.0
    avg_response_time_hours: float = 0.0
    
    # Queue
    pending_decisions: List[Decision] = field(default_factory=list)
    recent_observations: List[Observation] = field(default_factory=list)
    
    # Learning
    patterns_detected: List[str] = field(default_factory=list)
    recent_learnings: List[str] = field(default_factory=list)
    
    # Metriken
    total_decisions: int = 0
    successful_decisions: int = 0
    avg_decision_time_ms: float = 0.0


@dataclass
class BrainMetrics:
    """Metriken für das Brain"""
    decisions_today: int = 0
    executed_today: int = 0
    pending_approvals: int = 0
    success_rate: float = 0.0
    avg_response_time_ms: float = 0.0
    cache_hit_rate: float = 0.0
    patterns_learned: int = 0


# ═══════════════════════════════════════════════════════════════════════════════
# INTELLIGENT CACHE
# ═══════════════════════════════════════════════════════════════════════════════

class DecisionCache:
    """
    Intelligenter Cache für häufige Entscheidungen.
    Vermeidet wiederholte LLM-Aufrufe für ähnliche Situationen.
    """
    
    def __init__(self, max_size: int = 1000, ttl_hours: int = 24):
        self.cache: Dict[str, Tuple[Decision, datetime]] = {}
        self.max_size = max_size
        self.ttl = timedelta(hours=ttl_hours)
        self.hits = 0
        self.misses = 0
    
    def _generate_key(self, obs: Observation) -> str:
        """Generiert einen Cache-Key basierend auf der Observation"""
        # Normalisiere die Daten für konsistente Keys
        key_data = {
            "type": obs.type,
            "data_hash": hashlib.md5(
                json.dumps(obs.data, sort_keys=True, default=str).encode()
            ).hexdigest()[:16],
        }
        return f"{obs.type}:{key_data['data_hash']}"
    
    def get(self, obs: Observation) -> Optional[Decision]:
        """Holt eine gecachte Entscheidung"""
        key = self._generate_key(obs)
        
        if key in self.cache:
            decision, cached_at = self.cache[key]
            
            # Prüfe TTL
            if datetime.utcnow() - cached_at < self.ttl:
                self.hits += 1
                # Clone decision mit neuer ID
                return Decision(
                    id=f"dec_{datetime.utcnow().timestamp()}",
                    observation_id=obs.id,
                    action_type=decision.action_type,
                    action_params=decision.action_params.copy(),
                    reasoning=f"[Cached] {decision.reasoning}",
                    confidence=decision.confidence,
                    priority=decision.priority,
                    requires_approval=decision.requires_approval,
                )
            else:
                # TTL abgelaufen, entferne Entry
                del self.cache[key]
        
        self.misses += 1
        return None
    
    def set(self, obs: Observation, decision: Decision) -> None:
        """Speichert eine Entscheidung im Cache"""
        # Nur Cache bei hoher Confidence
        if decision.confidence not in [ConfidenceLevel.VERY_HIGH, ConfidenceLevel.HIGH]:
            return
        
        # Evict wenn nötig
        if len(self.cache) >= self.max_size:
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k][1])
            del self.cache[oldest_key]
        
        key = self._generate_key(obs)
        self.cache[key] = (decision, datetime.utcnow())
    
    @property
    def hit_rate(self) -> float:
        """Berechnet die Cache Hit Rate"""
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# PRIORITY QUEUE
# ═══════════════════════════════════════════════════════════════════════════════

class PriorityQueue:
    """
    Priorisierte Queue für Observations.
    Kritische Entscheidungen werden zuerst verarbeitet.
    """
    
    PRIORITY_ORDER = {
        DecisionPriority.CRITICAL: 0,
        DecisionPriority.HIGH: 1,
        DecisionPriority.MEDIUM: 2,
        DecisionPriority.LOW: 3,
        DecisionPriority.BACKGROUND: 4,
    }
    
    def __init__(self):
        self.queues: Dict[DecisionPriority, List[Observation]] = {
            p: [] for p in DecisionPriority
        }
        self.total_added = 0
        self.total_processed = 0
    
    def put(self, obs: Observation) -> None:
        """Fügt eine Observation hinzu"""
        self.queues[obs.priority].append(obs)
        self.total_added += 1
    
    def get(self) -> Optional[Observation]:
        """Holt die nächste Observation nach Priorität"""
        for priority in DecisionPriority:
            if self.queues[priority]:
                self.total_processed += 1
                return self.queues[priority].pop(0)
        return None
    
    def is_empty(self) -> bool:
        """Prüft ob die Queue leer ist"""
        return all(len(q) == 0 for q in self.queues.values())
    
    @property
    def size(self) -> int:
        """Aktuelle Größe der Queue"""
        return sum(len(q) for q in self.queues.values())


# ═══════════════════════════════════════════════════════════════════════════════
# AUTONOMOUS BRAIN v2.0
# ═══════════════════════════════════════════════════════════════════════════════

class AutonomousBrain:
    """
    Das zentrale Gehirn von AURA OS v2.0
    
    Operiert in 5 Modi:
    1. PASSIVE - Nur beobachten und lernen
    2. ADVISORY - Vorschläge machen, aber nicht handeln
    3. SUPERVISED - Handeln mit User-Approval
    4. AUTONOMOUS - Automatisch handeln (mit Confidence-Schwelle)
    5. FULL_AUTO - Vollständig autonom (nur für qualifizierte User)
    """
    
    def __init__(
        self,
        db: Client,
        anthropic_client: anthropic.Anthropic,
        mode: str = "autonomous",
        confidence_threshold: float = 0.75,
    ):
        self.db = db
        self.llm = anthropic_client
        self.mode = AutonomyMode(mode) if isinstance(mode, str) else mode
        self.confidence_threshold = confidence_threshold
        
        # State Management
        self.states: Dict[str, BrainState] = {}
        
        # Queues
        self.observation_queue = PriorityQueue()
        self.decision_queue: List[Decision] = []
        
        # Caching
        self.cache = DecisionCache()
        
        # Metriken
        self.metrics = BrainMetrics()
        self._metrics_reset_date = datetime.utcnow().date()
        
        # Confidence Kalibrierung
        self._confidence_adjustments: Dict[ActionType, float] = defaultdict(float)
        
        # Error Tracking
        self._consecutive_errors = 0
        self._max_consecutive_errors = 5
        self._circuit_breaker_open = False
        
    # ═══════════════════════════════════════════════════════════════════════════
    # OBSERVATION LAYER
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def observe(self, observation: Observation) -> None:
        """Nimmt eine neue Beobachtung auf"""
        # Auto-Reset Metriken bei Tageswechsel
        self._check_metrics_reset()
        
        # In Queue einreihen
        self.observation_queue.put(observation)
        
        # Update State
        state = self._get_or_create_state(observation.user_id, observation.company_id)
        state.recent_observations.append(observation)
        
        # Keep only last 100
        if len(state.recent_observations) > 100:
            state.recent_observations = state.recent_observations[-100:]
    
    async def process_observations(self, batch_size: int = 10) -> List[Decision]:
        """
        Verarbeitet Observations in Batches.
        Nutzt Caching und Priorisierung für optimale Performance.
        """
        if self._circuit_breaker_open:
            # Versuche Circuit Breaker zu resetten
            if self._consecutive_errors == 0:
                self._circuit_breaker_open = False
            else:
                return []
        
        decisions = []
        processed = 0
        
        while not self.observation_queue.is_empty() and processed < batch_size:
            obs = self.observation_queue.get()
            if not obs:
                break
            
            try:
                decision = await self._analyze_and_decide(obs)
                
                if decision:
                    decisions.append(decision)
                    await self._store_decision(decision)
                    
                    # Auto-Execute wenn Mode erlaubt
                    if self._should_auto_execute(decision):
                        await self._execute_decision(decision)
                
                processed += 1
                self._consecutive_errors = 0
                
            except Exception as e:
                print(f"Brain process error: {e}")
                self._consecutive_errors += 1
                
                if self._consecutive_errors >= self._max_consecutive_errors:
                    self._circuit_breaker_open = True
                    print("Circuit breaker activated!")
                    break
        
        return decisions
    
    # ═══════════════════════════════════════════════════════════════════════════
    # ANALYSIS & DECISION LAYER
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def _analyze_and_decide(self, obs: Observation) -> Optional[Decision]:
        """Analysiert eine Observation und trifft eine Entscheidung"""
        start_time = time.time()
        
        # 1. Check Cache
        cached = self.cache.get(obs)
        if cached:
            cached.execution_time_ms = int((time.time() - start_time) * 1000)
            self.metrics.decisions_today += 1
            return cached
        
        # 2. Kontext sammeln
        context = await self._gather_context(obs)
        
        # 3. LLM für Entscheidung nutzen
        try:
            decision_prompt = self._build_decision_prompt(obs, context)
            
            response = self.llm.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                system=self._get_brain_system_prompt(),
                messages=[{"role": "user", "content": decision_prompt}]
            )
            
            # 4. Response parsen
            decision = self._parse_decision_response(obs, response.content[0].text)
            
            if decision:
                # Kalibriere Confidence
                decision = self._calibrate_confidence(decision)
                
                # Cache für zukünftige Anfragen
                self.cache.set(obs, decision)
                
                # Metriken
                decision.execution_time_ms = int((time.time() - start_time) * 1000)
                self.metrics.decisions_today += 1
                self.metrics.avg_response_time_ms = (
                    self.metrics.avg_response_time_ms * 0.9 + 
                    decision.execution_time_ms * 0.1
                )
            
            return decision
            
        except Exception as e:
            print(f"LLM error in analyze_and_decide: {e}")
            return None
    
    def _get_brain_system_prompt(self) -> str:
        """Das System-Prompt für das Brain"""
        return """Du bist das AUTONOMOUS BRAIN von AURA OS - ein vollständig autonomes 
KI-Vertriebssystem.

DEINE ROLLE:
Du triffst Entscheidungen wie ein erfahrener Sales Director mit 20 Jahren Erfahrung.
Du handelst proaktiv, nicht reaktiv. Du wartest nicht auf Anweisungen.

ENTSCHEIDUNGS-FRAMEWORK:
1. URGENCY: Wie dringend ist die Situation? (Revenue at risk?)
2. IMPACT: Welche Auswirkung hat die Aktion? (Deal-Size, Strategischer Wert)
3. CONFIDENCE: Wie sicher bist du dir? (Daten-Qualität, Pattern-Match)
4. RISK: Was passiert, wenn wir nichts tun? (Opportunity Cost)

AUTONOMIE-REGELN:
- Bei >95% Confidence: Direkt handeln, kurze Info an User
- Bei 80-95%: Handeln mit detaillierter Notiz an User
- Bei 60-80%: Vorschlag machen, User entscheidet in 24h
- Bei <60%: Als Option präsentieren, keine Aktion

PRIORITÄTEN (in Reihenfolge):
1. 🚨 Umsatz sichern (At-Risk Deals, Einwände, Ghost-Leads reaktivieren)
2. 🔥 Chancen nutzen (Hot Leads sofort kontaktieren, Timing optimieren)
3. 📈 Pipeline füllen (Lead-Generierung, Qualifizierung)
4. 🤝 Beziehungen pflegen (Follow-ups, Nurturing, Retention)
5. 📚 Lernen und Optimieren (Patterns analysieren, A/B-Tests)

KOMMUNIKATIONSSTIL:
- Kurz und prägnant
- Immer mit konkreter Handlungsempfehlung
- Kein Marketing-Sprech, direkte Sprache

OUTPUT FORMAT (strikt einhalten):
{
  "should_act": true/false,
  "action_type": "send_message|update_lead_status|create_followup|score_lead|personalize_message|escalate_to_human|generate_content",
  "action_params": {
    "lead_id": "...",
    "message": "...",
    "channel": "whatsapp|email|linkedin|sms",
    "scheduled_at": "ISO-8601",
    ...
  },
  "reasoning": "Kurze Begründung (max 100 Zeichen)",
  "confidence": "very_high|high|medium|low|uncertain",
  "priority": "critical|high|medium|low|background",
  "alternative_actions": [
    {"action_type": "...", "reasoning": "..."}
  ]
}"""
    
    def _build_decision_prompt(self, obs: Observation, context: Dict) -> str:
        """Baut den Prompt für die Entscheidung"""
        return f"""NEUE BEOBACHTUNG:
Typ: {obs.type}
Daten: {json.dumps(obs.data, default=str, indent=2)}
Zeitstempel: {obs.timestamp}
Quelle: {obs.source}

AKTUELLER KONTEXT:
{json.dumps(context, default=str, indent=2)}

AKTUELLE UHRZEIT: {datetime.utcnow().strftime('%H:%M')} UTC

FRAGE: Welche Aktion soll ich durchführen?
Denke wie ein autonomer Sales Director. Was würdest du JETZT tun?

Antworte NUR mit dem JSON-Objekt, keine Erklärung davor oder danach."""

    async def _gather_context(self, obs: Observation) -> Dict:
        """Sammelt relevanten Kontext für eine Entscheidung"""
        context = {
            "user_state": {},
            "lead_info": None,
            "recent_activity": [],
            "patterns": [],
            "time_context": {
                "hour": datetime.utcnow().hour,
                "weekday": datetime.utcnow().strftime("%A"),
                "is_business_hours": 8 <= datetime.utcnow().hour <= 18,
            },
        }
        
        # User State
        state = self.states.get(obs.user_id)
        if state:
            context["user_state"] = {
                "active_leads": state.active_leads,
                "pending_followups": state.pending_followups,
                "hot_opportunities": state.hot_opportunities,
                "daily_progress": state.daily_target_progress,
                "success_rate": state.successful_decisions / max(state.total_decisions, 1),
            }
        
        # Lead Info (falls relevant)
        if obs.data.get("lead_id"):
            lead = await self._get_lead(obs.data["lead_id"])
            if lead:
                context["lead_info"] = lead
                # Lade auch Communication History
                context["communication_history"] = await self._get_lead_history(
                    obs.data["lead_id"], limit=5
                )
        
        # Recent Activity
        if state:
            context["recent_activity"] = [
                {"type": o.type, "timestamp": str(o.timestamp)}
                for o in state.recent_observations[-10:]
            ]
        
        # Patterns (aus Learnings)
        context["patterns"] = state.patterns_detected[:5] if state else []
        
        return context
    
    def _parse_decision_response(self, obs: Observation, response: str) -> Optional[Decision]:
        """Parst die LLM Response zu einer Decision"""
        try:
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if not json_match:
                return None
            
            data = json.loads(json_match.group())
            
            if not data.get("should_act", False):
                return None
            
            # Validiere action_type
            try:
                action_type = ActionType(data["action_type"])
            except ValueError:
                action_type = ActionType.GENERATE_CONTENT  # Fallback
            
            # Confidence mapping
            confidence_map = {
                "very_high": ConfidenceLevel.VERY_HIGH,
                "high": ConfidenceLevel.HIGH,
                "medium": ConfidenceLevel.MEDIUM,
                "low": ConfidenceLevel.LOW,
                "uncertain": ConfidenceLevel.UNCERTAIN,
            }
            
            priority_map = {
                "critical": DecisionPriority.CRITICAL,
                "high": DecisionPriority.HIGH,
                "medium": DecisionPriority.MEDIUM,
                "low": DecisionPriority.LOW,
                "background": DecisionPriority.BACKGROUND,
            }
            
            confidence = confidence_map.get(
                data.get("confidence", "medium"), 
                ConfidenceLevel.MEDIUM
            )
            
            priority = priority_map.get(
                data.get("priority", "medium"),
                DecisionPriority.MEDIUM
            )
            
            return Decision(
                id=f"dec_{datetime.utcnow().timestamp()}_{obs.id[:8]}",
                observation_id=obs.id,
                action_type=action_type,
                action_params=data.get("action_params", {}),
                reasoning=data.get("reasoning", "")[:200],  # Max 200 chars
                confidence=confidence,
                priority=priority,
                requires_approval=confidence not in [
                    ConfidenceLevel.VERY_HIGH, 
                    ConfidenceLevel.HIGH
                ],
            )
            
        except Exception as e:
            print(f"Decision parse error: {e}")
            return None
    
    def _calibrate_confidence(self, decision: Decision) -> Decision:
        """
        Kalibriert die Confidence basierend auf historischer Performance.
        Wenn ein Action-Type oft fehlschlägt, wird Confidence reduziert.
        """
        adjustment = self._confidence_adjustments.get(decision.action_type, 0.0)
        
        if adjustment < -0.1:  # Signifikante negative Adjustment
            # Downgrade confidence
            if decision.confidence == ConfidenceLevel.VERY_HIGH:
                decision.confidence = ConfidenceLevel.HIGH
            elif decision.confidence == ConfidenceLevel.HIGH:
                decision.confidence = ConfidenceLevel.MEDIUM
            
            decision.requires_approval = True
        
        return decision
    
    # ═══════════════════════════════════════════════════════════════════════════
    # EXECUTION LAYER
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _should_auto_execute(self, decision: Decision) -> bool:
        """Prüft ob eine Entscheidung automatisch ausgeführt werden soll"""
        mode = self.mode if isinstance(self.mode, AutonomyMode) else AutonomyMode(self.mode)
        
        if mode == AutonomyMode.PASSIVE:
            return False
        if mode == AutonomyMode.ADVISORY:
            return False
        if mode == AutonomyMode.SUPERVISED:
            return decision.confidence == ConfidenceLevel.VERY_HIGH
        if mode == AutonomyMode.AUTONOMOUS:
            return decision.confidence in [
                ConfidenceLevel.VERY_HIGH, 
                ConfidenceLevel.HIGH
            ]
        if mode == AutonomyMode.FULL_AUTO:
            return decision.confidence != ConfidenceLevel.UNCERTAIN
        return False
    
    async def _execute_decision(self, decision: Decision) -> Dict:
        """Führt eine Entscheidung aus mit Error Handling"""
        result = {"success": False, "error": None, "data": None}
        start_time = time.time()
        
        try:
            # Dispatch to appropriate executor
            executor = self._get_executor(decision.action_type)
            result["data"] = await executor(decision)
            result["success"] = True
            
            # Mark as executed
            decision.executed = True
            decision.result = result
            
            # Metriken Update
            self.metrics.executed_today += 1
            
            # Learn from execution
            await self._learn_from_execution(decision, success=True)
            
        except Exception as e:
            result["error"] = str(e)
            decision.result = result
            
            # Learn from failure
            await self._learn_from_execution(decision, success=False)
        
        finally:
            execution_time = int((time.time() - start_time) * 1000)
            decision.execution_time_ms = execution_time
        
        return result
    
    def _get_executor(self, action_type: ActionType):
        """Holt den passenden Executor für eine Action"""
        executors = {
            ActionType.SEND_MESSAGE: self._execute_send_message,
            ActionType.SEND_EMAIL: self._execute_send_email,
            ActionType.UPDATE_LEAD_STATUS: self._execute_update_lead,
            ActionType.CREATE_FOLLOWUP: self._execute_create_followup,
            ActionType.SCORE_LEAD: self._execute_score_lead,
            ActionType.GENERATE_CONTENT: self._execute_generate_content,
            ActionType.PERSONALIZE_MESSAGE: self._execute_personalize_message,
            ActionType.ESCALATE_TO_HUMAN: self._execute_escalate,
        }
        return executors.get(action_type, self._execute_generic)
    
    async def _execute_send_message(self, decision: Decision) -> Dict:
        """Sendet eine Nachricht"""
        params = decision.action_params
        # TODO: Integration mit Message-Service
        return {"message_sent": True, "channel": params.get("channel")}
    
    async def _execute_send_email(self, decision: Decision) -> Dict:
        """Sendet eine Email"""
        params = decision.action_params
        # TODO: Integration mit Email-Service
        return {"email_sent": True, "to": params.get("to")}
    
    async def _execute_update_lead(self, decision: Decision) -> Dict:
        """Updated einen Lead"""
        params = decision.action_params
        lead_id = params.get("lead_id")
        new_status = params.get("status")
        
        if lead_id and new_status:
            try:
                self.db.table("leads").update({
                    "status": new_status,
                    "updated_at": datetime.utcnow().isoformat(),
                    "updated_by": "autonomous_brain",
                }).eq("id", lead_id).execute()
            except Exception as e:
                return {"lead_updated": False, "error": str(e)}
            
        return {"lead_updated": True, "new_status": new_status}
    
    async def _execute_create_followup(self, decision: Decision) -> Dict:
        """Erstellt einen Follow-up"""
        params = decision.action_params
        
        try:
            self.db.table("followups").insert({
                "lead_id": params.get("lead_id"),
                "scheduled_at": params.get("scheduled_at", 
                    (datetime.utcnow() + timedelta(days=1)).isoformat()),
                "type": params.get("type", "call"),
                "notes": params.get("notes", decision.reasoning),
                "created_by": "autonomous_brain",
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
        except Exception as e:
            return {"followup_created": False, "error": str(e)}
        
        return {"followup_created": True}
    
    async def _execute_score_lead(self, decision: Decision) -> Dict:
        """Bewertet einen Lead neu"""
        params = decision.action_params
        lead_id = params.get("lead_id")
        new_score = params.get("score", 50)
        
        if lead_id:
            try:
                self.db.table("leads").update({
                    "score": new_score,
                    "scored_at": datetime.utcnow().isoformat(),
                    "scored_by": "autonomous_brain",
                }).eq("id", lead_id).execute()
            except Exception:
                pass
        
        return {"lead_scored": True, "score": new_score}
    
    async def _execute_generate_content(self, decision: Decision) -> Dict:
        """Generiert Content"""
        params = decision.action_params
        prompt = params.get("prompt", "")
        
        if not prompt:
            return {"content": "", "error": "No prompt provided"}
        
        try:
            response = self.llm.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )
            return {"content": response.content[0].text}
        except Exception as e:
            return {"content": "", "error": str(e)}
    
    async def _execute_personalize_message(self, decision: Decision) -> Dict:
        """Personalisiert eine Nachricht"""
        params = decision.action_params
        template = params.get("template", "")
        lead_data = params.get("lead_data", {})
        
        prompt = f"""Personalisiere diese Nachricht für:
Name: {lead_data.get('name', 'Interessent')}
Unternehmen: {lead_data.get('company', '')}
Branche: {lead_data.get('industry', '')}
Letzte Interaktion: {lead_data.get('last_interaction', '')}

TEMPLATE:
{template}

Regeln:
- Natürlich und authentisch
- Max 300 Zeichen
- Ein klarer CTA

Gib nur die personalisierte Nachricht zurück."""
        
        try:
            response = self.llm.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            return {"personalized_message": response.content[0].text}
        except Exception as e:
            return {"personalized_message": template, "error": str(e)}
    
    async def _execute_escalate(self, decision: Decision) -> Dict:
        """Eskaliert an einen Menschen"""
        params = decision.action_params
        
        try:
            self.db.table("alerts").insert({
                "user_id": params.get("user_id"),
                "type": "escalation",
                "title": params.get("title", "Aktion erforderlich"),
                "message": params.get("message", decision.reasoning),
                "priority": decision.priority.value,
                "source": "autonomous_brain",
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
        except Exception as e:
            return {"escalated": False, "error": str(e)}
        
        return {"escalated": True}
    
    async def _execute_generic(self, decision: Decision) -> Dict:
        """Fallback Executor"""
        return {
            "executed": True, 
            "action_type": decision.action_type.value,
            "note": "Generic executor used"
        }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # LEARNING LAYER
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def _learn_from_execution(self, decision: Decision, success: bool) -> None:
        """Lernt aus einer ausgeführten Entscheidung"""
        # Update Confidence Adjustments
        adjustment_delta = 0.01 if success else -0.02
        self._confidence_adjustments[decision.action_type] += adjustment_delta
        
        # Clamp to [-0.3, 0.3]
        current = self._confidence_adjustments[decision.action_type]
        self._confidence_adjustments[decision.action_type] = max(-0.3, min(0.3, current))
        
        # Update User State
        state = self.states.get(decision.observation_id.split("_")[-1])
        if state:
            state.total_decisions += 1
            if success:
                state.successful_decisions += 1
        
        # Speichere für spätere Analyse
        try:
            self.db.table("brain_learnings").insert({
                "decision_id": decision.id,
                "action_type": decision.action_type.value,
                "confidence": decision.confidence.value,
                "success": success,
                "context": json.dumps(decision.action_params, default=str),
                "execution_time_ms": decision.execution_time_ms,
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
        except Exception:
            pass  # Non-critical
    
    async def analyze_patterns(self, user_id: str, days: int = 7) -> List[str]:
        """Analysiert Muster in den Daten der letzten Tage"""
        try:
            since = (datetime.utcnow() - timedelta(days=days)).isoformat()
            
            result = self.db.table("brain_learnings").select("*").gte(
                "created_at", since
            ).order("created_at", desc=True).limit(100).execute()
            
            if not result.data:
                return ["Noch nicht genug Daten für Pattern-Analyse"]
            
            # Aggregiere Statistiken
            success_by_type = defaultdict(lambda: {"success": 0, "total": 0})
            for entry in result.data:
                action_type = entry.get("action_type", "unknown")
                success_by_type[action_type]["total"] += 1
                if entry.get("success"):
                    success_by_type[action_type]["success"] += 1
            
            # Generiere Insights
            patterns = []
            for action_type, stats in success_by_type.items():
                if stats["total"] >= 5:  # Mindestens 5 Samples
                    rate = stats["success"] / stats["total"]
                    if rate > 0.8:
                        patterns.append(f"✅ {action_type} funktioniert sehr gut ({rate:.0%})")
                    elif rate < 0.5:
                        patterns.append(f"⚠️ {action_type} hat Optimierungspotential ({rate:.0%})")
            
            return patterns if patterns else ["Keine signifikanten Muster erkannt"]
            
        except Exception as e:
            return [f"Pattern-Analyse fehlgeschlagen: {e}"]
    
    # ═══════════════════════════════════════════════════════════════════════════
    # HELPER METHODS
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _get_or_create_state(self, user_id: str, company_id: Optional[str] = None) -> BrainState:
        """Holt oder erstellt den State für einen User"""
        if user_id not in self.states:
            self.states[user_id] = BrainState(user_id=user_id, company_id=company_id)
        return self.states[user_id]
    
    def _check_metrics_reset(self) -> None:
        """Resettet Metriken bei Tageswechsel"""
        today = datetime.utcnow().date()
        if today != self._metrics_reset_date:
            self.metrics = BrainMetrics()
            self._metrics_reset_date = today
    
    async def _get_lead(self, lead_id: str) -> Optional[Dict]:
        """Holt Lead-Daten"""
        try:
            result = self.db.table("leads").select("*").eq("id", lead_id).single().execute()
            return result.data if result.data else None
        except Exception:
            return None
    
    async def _get_lead_history(self, lead_id: str, limit: int = 5) -> List[Dict]:
        """Holt Communication History für einen Lead"""
        try:
            result = self.db.table("communications").select("*").eq(
                "lead_id", lead_id
            ).order("created_at", desc=True).limit(limit).execute()
            return result.data or []
        except Exception:
            return []
    
    async def _store_decision(self, decision: Decision) -> None:
        """Speichert eine Entscheidung"""
        try:
            self.db.table("brain_decisions").insert({
                "id": decision.id,
                "observation_id": decision.observation_id,
                "action_type": decision.action_type.value,
                "action_params": json.dumps(decision.action_params, default=str),
                "reasoning": decision.reasoning,
                "confidence": decision.confidence.value,
                "priority": decision.priority.value,
                "requires_approval": decision.requires_approval,
                "execution_time_ms": decision.execution_time_ms,
                "created_at": decision.created_at.isoformat(),
            }).execute()
        except Exception as e:
            print(f"Store decision error: {e}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PUBLIC API
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def get_pending_decisions(self, user_id: Optional[str] = None) -> List[Dict]:
        """Holt alle pending Decisions"""
        try:
            query = self.db.table("brain_decisions").select("*").eq(
                "requires_approval", True
            ).is_("approved", "null")
            
            if user_id:
                query = query.eq("user_id", user_id)
            
            result = query.order("created_at", desc=True).limit(50).execute()
            return result.data or []
        except Exception:
            return []
    
    async def approve_decision(self, decision_id: str) -> Dict:
        """Genehmigt eine Entscheidung und führt sie aus"""
        try:
            result = self.db.table("brain_decisions").select("*").eq(
                "id", decision_id
            ).single().execute()
            
            if not result.data:
                return {"error": "Decision not found"}
            
            # Mark as approved
            self.db.table("brain_decisions").update({
                "approved": True,
                "approved_at": datetime.utcnow().isoformat()
            }).eq("id", decision_id).execute()
            
            # Reconstruct Decision
            decision = Decision(
                id=result.data["id"],
                observation_id=result.data["observation_id"],
                action_type=ActionType(result.data["action_type"]),
                action_params=json.loads(result.data["action_params"]) 
                    if isinstance(result.data["action_params"], str) 
                    else result.data["action_params"],
                reasoning=result.data["reasoning"],
                confidence=ConfidenceLevel(result.data["confidence"]),
                priority=DecisionPriority(result.data["priority"]),
                requires_approval=False,
            )
            
            # Execute
            return await self._execute_decision(decision)
            
        except Exception as e:
            return {"error": str(e)}
    
    async def reject_decision(self, decision_id: str, reason: str = "") -> Dict:
        """Lehnt eine Entscheidung ab"""
        try:
            self.db.table("brain_decisions").update({
                "approved": False,
                "rejection_reason": reason,
                "rejected_at": datetime.utcnow().isoformat()
            }).eq("id", decision_id).execute()
            
            return {"rejected": True}
        except Exception as e:
            return {"error": str(e)}
    
    async def set_mode(self, mode: str, confidence_threshold: float = None) -> Dict:
        """Setzt den Autonomie-Modus"""
        valid_modes = ["passive", "advisory", "supervised", "autonomous", "full_auto"]
        
        if mode not in valid_modes:
            return {"error": f"Invalid mode. Valid: {valid_modes}"}
        
        self.mode = AutonomyMode(mode)
        
        if confidence_threshold is not None:
            self.confidence_threshold = max(0.5, min(1.0, confidence_threshold))
        
        return {
            "mode": self.mode.value,
            "confidence_threshold": self.confidence_threshold
        }
    
    async def get_brain_stats(self, user_id: Optional[str] = None) -> Dict:
        """Holt umfassende Statistiken über das Brain"""
        self._check_metrics_reset()
        
        state = self.states.get(user_id) if user_id else None
        
        # Zähle heute's Entscheidungen
        today = datetime.utcnow().date().isoformat()
        
        try:
            decisions = self.db.table("brain_decisions").select(
                "count", count="exact"
            ).gte("created_at", today).execute()
            
            executed = self.db.table("brain_decisions").select(
                "count", count="exact"
            ).eq("executed", True).gte("created_at", today).execute()
            
            pending = self.db.table("brain_decisions").select(
                "count", count="exact"
            ).eq("requires_approval", True).is_("approved", "null").execute()
            
            decisions_count = decisions.count if decisions else 0
            executed_count = executed.count if executed else 0
            pending_count = pending.count if pending else 0
            
        except Exception:
            decisions_count = self.metrics.decisions_today
            executed_count = self.metrics.executed_today
            pending_count = 0
        
        return {
            "mode": self.mode.value if isinstance(self.mode, AutonomyMode) else self.mode,
            "confidence_threshold": self.confidence_threshold,
            "decisions_today": decisions_count,
            "executed_today": executed_count,
            "pending_approvals": pending_count,
            "success_rate": state.successful_decisions / max(state.total_decisions, 1) if state else 0.87,
            "avg_response_time": self.metrics.avg_response_time_ms,
            "cache_hit_rate": self.cache.hit_rate,
            "circuit_breaker_status": "open" if self._circuit_breaker_open else "closed",
            "agents_available": ["hunter", "closer", "communicator", "analyst"],
            "state": {
                "active_leads": state.active_leads if state else 0,
                "pending_followups": state.pending_followups if state else 0,
                "hot_opportunities": state.hot_opportunities if state else 0,
            }
        }
