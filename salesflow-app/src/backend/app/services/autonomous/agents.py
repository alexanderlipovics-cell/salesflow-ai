"""
╔════════════════════════════════════════════════════════════════════════════════╗
║  MULTI-AGENT SYSTEM - Spezialisierte KI-Agenten                               ║
║  ══════════════════════════════════════════════════════════════════════════════║
║                                                                                ║
║  Jeder Agent ist ein Spezialist für einen Bereich:                            ║
║                                                                                ║
║  🎯 HUNTER AGENT      - Findet und qualifiziert neue Leads                    ║
║  🔥 CLOSER AGENT      - Optimiert Abschlüsse und Deals                        ║
║  💬 COMMUNICATOR      - Schreibt perfekte Nachrichten                         ║
║  🧠 ANALYST AGENT     - Analysiert Daten und findet Patterns                  ║
║  🛡️ RETENTION AGENT   - Pflegt Bestandskunden                                 ║
║  ⚡ OPTIMIZER AGENT   - Optimiert Prozesse und Sequenzen                      ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import anthropic
import json

from supabase import Client


# ═══════════════════════════════════════════════════════════════════════════════
# BASE AGENT
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class AgentTask:
    """Eine Aufgabe für einen Agenten"""
    id: str
    type: str
    params: Dict[str, Any]
    priority: int = 1
    deadline: Optional[datetime] = None
    context: Dict[str, Any] = None


@dataclass
class AgentResult:
    """Ergebnis einer Agenten-Aktion"""
    task_id: str
    success: bool
    data: Any
    confidence: float
    reasoning: str
    suggestions: List[str] = None
    next_actions: List[str] = None


class BaseAgent(ABC):
    """Basis-Klasse für alle Agenten"""
    
    name: str = "BaseAgent"
    description: str = "Ein generischer Agent"
    capabilities: List[str] = []
    
    def __init__(self, db: Client, llm: anthropic.Anthropic):
        self.db = db
        self.llm = llm
        self.history: List[AgentResult] = []
    
    @abstractmethod
    async def execute(self, task: AgentTask) -> AgentResult:
        """Führt eine Aufgabe aus"""
        pass
    
    @abstractmethod
    def get_system_prompt(self) -> str:
        """Gibt den System-Prompt für diesen Agenten zurück"""
        pass
    
    async def think(self, prompt: str, context: Dict = None) -> str:
        """Lässt den Agenten nachdenken"""
        system = self.get_system_prompt()
        if context:
            system += f"\n\nAKTUELLER KONTEXT:\n{json.dumps(context, default=str)}"
        
        response = self.llm.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system=system,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
    
    def log_result(self, result: AgentResult) -> None:
        """Loggt ein Ergebnis"""
        self.history.append(result)
        # Keep last 100
        if len(self.history) > 100:
            self.history = self.history[-100:]


# ═══════════════════════════════════════════════════════════════════════════════
# 🎯 HUNTER AGENT - Findet und qualifiziert Leads
# ═══════════════════════════════════════════════════════════════════════════════

class HunterAgent(BaseAgent):
    """
    Der Hunter Agent ist spezialisiert auf:
    - Lead-Identifizierung
    - Lead-Qualifizierung (BANT, MEDDIC, etc.)
    - Recherche und Anreicherung
    - Ideales Kundenprofil Matching
    """
    
    name = "Hunter"
    description = "Findet und qualifiziert neue Leads"
    capabilities = ["qualify_lead", "research_lead", "score_lead", "find_decision_makers"]
    
    def get_system_prompt(self) -> str:
        return """Du bist HUNTER, der Lead-Spezialist von AURA OS.

DEINE EXPERTISE:
- Lead-Qualifizierung mit BANT, MEDDIC, SPIN
- Recherche und Datenanalyse
- Ideales Kundenprofil (ICP) Matching
- Decision-Maker Identifizierung

DEINE PERSÖNLICHKEIT:
- Analytisch und präzise
- Hartnäckig aber nicht aufdringlich
- Immer auf der Suche nach dem nächsten großen Deal

QUALIFIZIERUNGS-FRAMEWORK (BANT):
- Budget: Hat der Lead Budget?
- Authority: Ist er der Entscheider?
- Need: Gibt es echten Bedarf?
- Timeline: Wann will er kaufen?

OUTPUT:
Gib strukturierte Analysen mit klaren Empfehlungen."""
    
    async def execute(self, task: AgentTask) -> AgentResult:
        task_type = task.type
        
        if task_type == "qualify_lead":
            return await self._qualify_lead(task)
        elif task_type == "research_lead":
            return await self._research_lead(task)
        elif task_type == "score_lead":
            return await self._score_lead(task)
        else:
            return AgentResult(
                task_id=task.id,
                success=False,
                data=None,
                confidence=0,
                reasoning=f"Unbekannter Task-Typ: {task_type}"
            )
    
    async def _qualify_lead(self, task: AgentTask) -> AgentResult:
        """Qualifiziert einen Lead"""
        lead_data = task.params.get("lead", {})
        
        prompt = f"""Qualifiziere diesen Lead nach dem BANT-Framework:

LEAD-DATEN:
{json.dumps(lead_data, indent=2)}

Analysiere:
1. BUDGET (0-25 Punkte): Gibt es Hinweise auf Budget?
2. AUTHORITY (0-25 Punkte): Ist dies ein Entscheider?
3. NEED (0-25 Punkte): Wie stark ist der Bedarf?
4. TIMELINE (0-25 Punkte): Wie dringend?

Gib zurück als JSON:
{{
  "total_score": 0-100,
  "bant": {{
    "budget": {{"score": X, "reasoning": "..."}},
    "authority": {{"score": X, "reasoning": "..."}},
    "need": {{"score": X, "reasoning": "..."}},
    "timeline": {{"score": X, "reasoning": "..."}}
  }},
  "recommendation": "hot|warm|cold|disqualify",
  "next_steps": ["..."],
  "questions_to_ask": ["..."]
}}"""
        
        response = await self.think(prompt, task.context)
        
        try:
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                data = json.loads(json_match.group())
                return AgentResult(
                    task_id=task.id,
                    success=True,
                    data=data,
                    confidence=0.85,
                    reasoning="BANT-Qualifizierung durchgeführt",
                    suggestions=data.get("next_steps", [])
                )
        except:
            pass
        
        return AgentResult(
            task_id=task.id,
            success=False,
            data=None,
            confidence=0,
            reasoning="Qualifizierung fehlgeschlagen"
        )
    
    async def _research_lead(self, task: AgentTask) -> AgentResult:
        """Recherchiert einen Lead"""
        lead_name = task.params.get("name", "")
        company = task.params.get("company", "")
        
        prompt = f"""Erstelle ein Research-Profil für:
Name: {lead_name}
Unternehmen: {company}

Basierend auf typischen Mustern, erstelle:
1. Wahrscheinliche Schmerzpunkte
2. Mögliche Einwände
3. Beste Ansprache-Strategie
4. Gesprächsstarter

Gib als JSON zurück."""
        
        response = await self.think(prompt, task.context)
        
        return AgentResult(
            task_id=task.id,
            success=True,
            data={"research": response},
            confidence=0.7,
            reasoning="Research basierend auf Branchenmustern"
        )
    
    async def _score_lead(self, task: AgentTask) -> AgentResult:
        """Berechnet einen Lead-Score"""
        lead_data = task.params.get("lead", {})
        
        # Einfaches Scoring basierend auf verfügbaren Daten
        score = 50  # Basis
        
        if lead_data.get("email"):
            score += 10
        if lead_data.get("phone"):
            score += 10
        if lead_data.get("company"):
            score += 10
        if lead_data.get("notes"):
            score += 5
        if lead_data.get("last_contact"):
            score += 10
        
        # Cap at 100
        score = min(score, 100)
        
        category = "hot" if score >= 80 else "warm" if score >= 50 else "cold"
        
        return AgentResult(
            task_id=task.id,
            success=True,
            data={"score": score, "category": category},
            confidence=0.9,
            reasoning=f"Score basierend auf Datenvollständigkeit: {score}/100"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 🔥 CLOSER AGENT - Optimiert Abschlüsse
# ═══════════════════════════════════════════════════════════════════════════════

class CloserAgent(BaseAgent):
    """
    Der Closer Agent ist spezialisiert auf:
    - Abschluss-Optimierung
    - Einwandbehandlung
    - Preisverhandlung
    - Deal-Rettung
    """
    
    name = "Closer"
    description = "Optimiert Abschlüsse und rettet Deals"
    capabilities = ["handle_objection", "negotiate_price", "create_urgency", "rescue_deal"]
    
    def get_system_prompt(self) -> str:
        return """Du bist CLOSER, der Abschluss-Spezialist von AURA OS.

DEINE EXPERTISE:
- Einwandbehandlung mit psychologischer Präzision
- Preisverhandlung und Value-Argumentation
- Urgency-Creation ohne Druck
- Deal-Rettung bei Ghost-Leads

DEINE PERSÖNLICHKEIT:
- Selbstbewusst aber nicht arrogant
- Lösungsorientiert
- Empathisch aber zielgerichtet

ABSCHLUSS-TECHNIKEN:
1. Assumptive Close: "Wann starten wir?"
2. Alternative Close: "Option A oder B?"
3. Summary Close: Vorteile zusammenfassen
4. Urgency Close: Zeitliche Begrenzung
5. Trial Close: Temperatur prüfen

NIEMALS:
- Manipulation oder Druck
- Falsche Versprechen
- Aggressive Taktiken"""
    
    async def execute(self, task: AgentTask) -> AgentResult:
        task_type = task.type
        
        if task_type == "handle_objection":
            return await self._handle_objection(task)
        elif task_type == "create_closing_strategy":
            return await self._create_closing_strategy(task)
        elif task_type == "rescue_deal":
            return await self._rescue_deal(task)
        else:
            return AgentResult(
                task_id=task.id,
                success=False,
                data=None,
                confidence=0,
                reasoning=f"Unbekannter Task-Typ: {task_type}"
            )
    
    async def _handle_objection(self, task: AgentTask) -> AgentResult:
        """Behandelt einen Einwand"""
        objection = task.params.get("objection", "")
        lead_context = task.params.get("lead_context", {})
        
        prompt = f"""Ein Lead hat folgenden Einwand:
"{objection}"

LEAD-KONTEXT:
{json.dumps(lead_context, indent=2)}

Erstelle 3 verschiedene Antwort-Optionen:
1. EMPATHISCH: Verständnisvoll und beziehungsorientiert
2. LOGISCH: Faktenbasiert und analytisch
3. DIREKT: Kurz und auf den Punkt

Für jede Option gib:
- Die Antwort
- Warum sie funktioniert
- Wann sie am besten passt

JSON-Format."""
        
        response = await self.think(prompt, task.context)
        
        return AgentResult(
            task_id=task.id,
            success=True,
            data={"responses": response},
            confidence=0.85,
            reasoning="3 Antwort-Optionen für verschiedene Kommunikationsstile"
        )
    
    async def _create_closing_strategy(self, task: AgentTask) -> AgentResult:
        """Erstellt eine Abschluss-Strategie"""
        deal_info = task.params.get("deal", {})
        
        prompt = f"""Erstelle eine Abschluss-Strategie für diesen Deal:

DEAL-INFO:
{json.dumps(deal_info, indent=2)}

Analysiere:
1. Wo steht der Deal gerade?
2. Was sind die Risiken?
3. Welche Closing-Technik passt am besten?
4. Was ist der beste nächste Schritt?
5. Welche Formulierungen nutzen?

JSON-Format mit konkreten Skripten."""
        
        response = await self.think(prompt, task.context)
        
        return AgentResult(
            task_id=task.id,
            success=True,
            data={"strategy": response},
            confidence=0.8,
            reasoning="Individuelle Abschluss-Strategie erstellt"
        )
    
    async def _rescue_deal(self, task: AgentTask) -> AgentResult:
        """Rettet einen gefährdeten Deal"""
        deal_info = task.params.get("deal", {})
        history = task.params.get("communication_history", [])
        
        prompt = f"""Dieser Deal ist gefährdet! Rette ihn.

DEAL:
{json.dumps(deal_info, indent=2)}

KOMMUNIKATIONS-HISTORIE:
{json.dumps(history, indent=2)}

Erstelle einen Rettungsplan:
1. Was ist schief gelaufen?
2. Welche Nachricht JETZT senden?
3. Welcher alternative Ansatz?
4. Gibt es einen "Hail Mary" Zug?

Sei kreativ aber authentisch."""
        
        response = await self.think(prompt, task.context)
        
        return AgentResult(
            task_id=task.id,
            success=True,
            data={"rescue_plan": response},
            confidence=0.7,
            reasoning="Rettungsplan für gefährdeten Deal"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 💬 COMMUNICATOR AGENT - Perfekte Nachrichten
# ═══════════════════════════════════════════════════════════════════════════════

class CommunicatorAgent(BaseAgent):
    """
    Der Communicator Agent ist spezialisiert auf:
    - Personalisierte Nachrichten
    - Multi-Channel Kommunikation
    - Tonalität-Anpassung
    - A/B-Testing von Messages
    """
    
    name = "Communicator"
    description = "Schreibt perfekte, personalisierte Nachrichten"
    capabilities = ["write_message", "personalize", "adapt_tone", "create_sequence"]
    
    def get_system_prompt(self) -> str:
        return """Du bist COMMUNICATOR, der Nachrichten-Spezialist von AURA OS.

DEINE EXPERTISE:
- Hyperpersonalisierung von Nachrichten
- Tonalität-Anpassung (DISC-Profile)
- Multi-Channel Optimierung
- Psychologisch wirksame Copywriting

KOMMUNIKATIONS-REGELN:
1. Immer personalisiert - nie generisch
2. Value first - dann der Ask
3. Kurz und scanbar
4. Ein CTA pro Nachricht
5. Human, nicht robotisch

TONALITÄTEN:
- D (Dominant): Direkt, ergebnisorientiert, kurz
- I (Initiativ): Enthusiastisch, storytelling, emotional
- S (Stetig): Warm, sicherheitsorientiert, detailliert
- C (Gewissenhaft): Faktenbasiert, strukturiert, präzise

NIEMALS:
- Spam-artige Nachrichten
- Übertriebene Emojis (außer wenn zum Stil passt)
- Falsche Dringlichkeit
- Copy-Paste Templates"""
    
    async def execute(self, task: AgentTask) -> AgentResult:
        task_type = task.type
        
        if task_type == "write_message":
            return await self._write_message(task)
        elif task_type == "personalize":
            return await self._personalize_message(task)
        elif task_type == "create_sequence":
            return await self._create_sequence(task)
        else:
            return AgentResult(
                task_id=task.id,
                success=False,
                data=None,
                confidence=0,
                reasoning=f"Unbekannter Task-Typ: {task_type}"
            )
    
    async def _write_message(self, task: AgentTask) -> AgentResult:
        """Schreibt eine Nachricht"""
        purpose = task.params.get("purpose", "follow_up")
        lead = task.params.get("lead", {})
        channel = task.params.get("channel", "whatsapp")
        tone = task.params.get("tone", "professional")
        
        prompt = f"""Schreibe eine Nachricht.

ZWECK: {purpose}
KANAL: {channel}
TONALITÄT: {tone}

LEAD:
{json.dumps(lead, indent=2)}

Regeln für {channel}:
- WhatsApp: Max 300 Zeichen, casual, ein Emoji OK
- Email: Betreff + Body, professionell
- LinkedIn: Persönlich, keine Sales-Sprache
- SMS: Max 160 Zeichen, sehr direkt

Gib zurück:
{{
  "message": "Die Nachricht",
  "subject": "Falls Email",
  "alternative": "Eine Alternative",
  "best_send_time": "Wann senden?"
}}"""
        
        response = await self.think(prompt, task.context)
        
        try:
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                data = json.loads(json_match.group())
                return AgentResult(
                    task_id=task.id,
                    success=True,
                    data=data,
                    confidence=0.9,
                    reasoning=f"{channel}-optimierte Nachricht erstellt"
                )
        except:
            pass
        
        return AgentResult(
            task_id=task.id,
            success=True,
            data={"message": response},
            confidence=0.8,
            reasoning="Nachricht erstellt"
        )
    
    async def _personalize_message(self, task: AgentTask) -> AgentResult:
        """Personalisiert eine Nachricht"""
        template = task.params.get("template", "")
        lead = task.params.get("lead", {})
        
        prompt = f"""Personalisiere dieses Template für den Lead:

TEMPLATE:
{template}

LEAD:
{json.dumps(lead, indent=2)}

Mache es:
1. Persönlich (nutze Namen, Firma, etc.)
2. Relevant (beziehe dich auf bekannte Infos)
3. Authentisch (nicht robotisch)

Gib nur die personalisierte Nachricht zurück."""
        
        response = await self.think(prompt, task.context)
        
        return AgentResult(
            task_id=task.id,
            success=True,
            data={"personalized_message": response},
            confidence=0.9,
            reasoning="Nachricht personalisiert"
        )
    
    async def _create_sequence(self, task: AgentTask) -> AgentResult:
        """Erstellt eine Nachrichtensequenz"""
        goal = task.params.get("goal", "nurturing")
        lead_type = task.params.get("lead_type", "warm")
        channel = task.params.get("channel", "email")
        num_steps = task.params.get("steps", 5)
        
        prompt = f"""Erstelle eine {num_steps}-stufige Sequenz.

ZIEL: {goal}
LEAD-TYP: {lead_type}
KANAL: {channel}

Für jeden Schritt:
- Timing (Tage nach vorherigem)
- Nachricht
- Betreff (falls Email)
- Ziel dieses Schritts
- Exit-Trigger (wann aufhören?)

JSON-Array Format."""
        
        response = await self.think(prompt, task.context)
        
        return AgentResult(
            task_id=task.id,
            success=True,
            data={"sequence": response},
            confidence=0.85,
            reasoning=f"{num_steps}-Schritt Sequenz für {goal} erstellt"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 🧠 ANALYST AGENT - Datenanalyse und Patterns
# ═══════════════════════════════════════════════════════════════════════════════

class AnalystAgent(BaseAgent):
    """
    Der Analyst Agent ist spezialisiert auf:
    - Performance-Analyse
    - Pattern-Erkennung
    - Vorhersagen und Forecasting
    - Optimierungs-Empfehlungen
    """
    
    name = "Analyst"
    description = "Analysiert Daten und findet Optimierungspotential"
    capabilities = ["analyze_performance", "detect_patterns", "forecast", "recommend"]
    
    def get_system_prompt(self) -> str:
        return """Du bist ANALYST, der Daten-Spezialist von AURA OS.

DEINE EXPERTISE:
- Sales Performance Analysis
- Pattern Recognition
- Predictive Analytics
- Actionable Insights

ANALYSE-FRAMEWORK:
1. Was zeigen die Zahlen?
2. Welche Trends gibt es?
3. Was sind die Ursachen?
4. Welche Aktionen empfehlen wir?

OUTPUT:
Immer mit konkreten Zahlen und Handlungsempfehlungen."""
    
    async def execute(self, task: AgentTask) -> AgentResult:
        task_type = task.type
        
        if task_type == "analyze_performance":
            return await self._analyze_performance(task)
        elif task_type == "detect_patterns":
            return await self._detect_patterns(task)
        elif task_type == "forecast":
            return await self._forecast(task)
        else:
            return AgentResult(
                task_id=task.id,
                success=False,
                data=None,
                confidence=0,
                reasoning=f"Unbekannter Task-Typ: {task_type}"
            )
    
    async def _analyze_performance(self, task: AgentTask) -> AgentResult:
        """Analysiert die Performance"""
        metrics = task.params.get("metrics", {})
        period = task.params.get("period", "week")
        
        prompt = f"""Analysiere diese Sales-Performance:

METRIKEN ({period}):
{json.dumps(metrics, indent=2)}

Erstelle eine Analyse mit:
1. Performance-Zusammenfassung (1-2 Sätze)
2. Top 3 Stärken
3. Top 3 Verbesserungspotentiale
4. Konkrete Aktionsempfehlungen
5. Forecast für nächste Periode

JSON-Format mit Zahlen und Prozenten."""
        
        response = await self.think(prompt, task.context)
        
        return AgentResult(
            task_id=task.id,
            success=True,
            data={"analysis": response},
            confidence=0.85,
            reasoning="Performance-Analyse durchgeführt"
        )
    
    async def _detect_patterns(self, task: AgentTask) -> AgentResult:
        """Erkennt Muster in Daten"""
        data = task.params.get("data", [])
        
        prompt = f"""Finde Muster in diesen Sales-Daten:

DATEN:
{json.dumps(data[:50], indent=2)}  # Max 50 Einträge

Suche nach:
1. Timing-Muster (beste Tage/Zeiten)
2. Erfolgs-Muster (was funktioniert?)
3. Misserfolgs-Muster (was nicht?)
4. Lead-Typ-Muster (wer kauft?)
5. Kanal-Muster (wo funktioniert was?)

JSON mit konkreten Erkenntnissen."""
        
        response = await self.think(prompt, task.context)
        
        return AgentResult(
            task_id=task.id,
            success=True,
            data={"patterns": response},
            confidence=0.75,
            reasoning="Pattern-Analyse durchgeführt"
        )
    
    async def _forecast(self, task: AgentTask) -> AgentResult:
        """Erstellt eine Vorhersage"""
        historical = task.params.get("historical_data", [])
        forecast_period = task.params.get("period", "month")
        
        prompt = f"""Erstelle einen Sales-Forecast.

HISTORISCHE DATEN:
{json.dumps(historical[-30:], indent=2)}

ZEITRAUM: Nächster {forecast_period}

Vorhersage:
1. Erwartete Deals
2. Erwarteter Umsatz
3. Confidence-Range (Min-Max)
4. Risiken
5. Empfehlungen zur Zielerreichung

JSON-Format."""
        
        response = await self.think(prompt, task.context)
        
        return AgentResult(
            task_id=task.id,
            success=True,
            data={"forecast": response},
            confidence=0.7,
            reasoning=f"Forecast für {forecast_period} erstellt"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# AGENT ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════════

class AgentOrchestrator:
    """
    Koordiniert alle Agenten und delegiert Aufgaben.
    """
    
    def __init__(self, db: Client, llm: anthropic.Anthropic):
        self.db = db
        self.llm = llm
        
        # Initialisiere Agenten
        self.agents = {
            "hunter": HunterAgent(db, llm),
            "closer": CloserAgent(db, llm),
            "communicator": CommunicatorAgent(db, llm),
            "analyst": AnalystAgent(db, llm),
        }
    
    def get_agent(self, name: str) -> Optional[BaseAgent]:
        """Holt einen Agenten"""
        return self.agents.get(name.lower())
    
    async def delegate(self, task: AgentTask, agent_name: str) -> AgentResult:
        """Delegiert eine Aufgabe an einen Agenten"""
        agent = self.get_agent(agent_name)
        if not agent:
            return AgentResult(
                task_id=task.id,
                success=False,
                data=None,
                confidence=0,
                reasoning=f"Agent '{agent_name}' nicht gefunden"
            )
        
        result = await agent.execute(task)
        agent.log_result(result)
        return result
    
    async def auto_delegate(self, task: AgentTask) -> AgentResult:
        """Wählt automatisch den besten Agenten für eine Aufgabe"""
        
        # Mapping von Task-Typen zu Agenten
        task_agent_map = {
            # Hunter
            "qualify_lead": "hunter",
            "research_lead": "hunter",
            "score_lead": "hunter",
            "find_decision_makers": "hunter",
            
            # Closer
            "handle_objection": "closer",
            "create_closing_strategy": "closer",
            "rescue_deal": "closer",
            "negotiate_price": "closer",
            
            # Communicator
            "write_message": "communicator",
            "personalize": "communicator",
            "create_sequence": "communicator",
            "adapt_tone": "communicator",
            
            # Analyst
            "analyze_performance": "analyst",
            "detect_patterns": "analyst",
            "forecast": "analyst",
            "recommend": "analyst",
        }
        
        agent_name = task_agent_map.get(task.type, "communicator")  # Default
        return await self.delegate(task, agent_name)
    
    def list_agents(self) -> List[Dict]:
        """Listet alle verfügbaren Agenten"""
        return [
            {
                "name": agent.name,
                "description": agent.description,
                "capabilities": agent.capabilities,
            }
            for agent in self.agents.values()
        ]

