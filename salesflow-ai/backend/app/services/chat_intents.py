import json
import logging
import re
from typing import Any, Dict, Optional

from app.ai_client import chat_completion
from app.core.config import settings

logger = logging.getLogger(__name__)


CHAT_INTENTS: Dict[str, Dict[str, Any]] = {
    "objection_help": {
        "triggers": ["einwand", "wie antworte ich auf", "was sage ich wenn", "zu teuer", "keine zeit", "muss überlegen"],
        "handler": "handle_objection_help",
        "description": "Hilft bei Einwandbehandlung",
    },
    "next_action": {
        "triggers": ["was soll ich tun", "nächster schritt", "was jetzt", "womit anfangen", "next best action"],
        "handler": "handle_next_action",
        "description": "Empfiehlt nächste Aktion",
    },
    "performance": {
        "triggers": ["meine performance", "wie laufe ich", "meine statistik", "meine zahlen", "wie gut bin ich"],
        "handler": "handle_performance",
        "description": "Zeigt Performance-Insights",
    },
    "churn_risk": {
        "triggers": ["leads verliere", "kalte leads", "wer springt ab", "churn", "risiko leads"],
        "handler": "handle_churn_risk",
        "description": "Zeigt gefährdete Leads",
    },
    "cold_call_help": {
        "triggers": ["cold call", "kaltakquise", "anrufen hilf", "telefon script", "anruf vorbereiten"],
        "handler": "handle_cold_call",
        "description": "Cold Call Assistent",
    },
    "closing_help": {
        "triggers": ["wie close ich", "abschluss", "deal machen", "verkaufen an", "überzeugen"],
        "handler": "handle_closing",
        "description": "Closing Coach",
    },
    "lead_discovery": {
        "triggers": ["finde leads", "neue leads wie", "ähnliche leads", "mehr leads", "lead vorschläge"],
        "handler": "handle_lead_discovery",
        "description": "AI Lead Discovery",
    },
    "qualify_lead": {
        "triggers": ["qualifiziere", "lead bewerten", "ist das ein guter lead", "lead einschätzen", "lead score"],
        "handler": "handle_qualify_lead",
        "description": "Lead Qualifier",
    },
    "deal_stuck": {
        "triggers": ["deal stockt", "warum kein fortschritt", "deal hängt", "kommt nicht weiter", "blockiert"],
        "handler": "handle_deal_stuck",
        "description": "Deal Delay Analyse",
    },
    "write_content": {
        "triggers": ["schreib mir", "post schreiben", "text für", "content für", "marketing text"],
        "handler": "handle_write_content",
        "description": "GTM Copy Assistant",
    },
    "calc_commission": {
        "triggers": ["provision", "was verdiene ich", "commission", "rechne aus", "bei x verkäufen"],
        "handler": "handle_calc_commission",
        "description": "Provisions-Rechner",
    },
    "roleplay": {
        "triggers": ["üben", "roleplay", "gespräch üben", "trainieren", "simulieren"],
        "handler": "handle_roleplay",
        "description": "Verkaufsgespräch üben",
    },
    "deal_lost": {
        "triggers": ["deal verloren", "abgesagt", "nicht gekauft", "absage bekommen", "frustriert"],
        "handler": "handle_deal_lost",
        "description": "Phoenix Recovery Coach",
    },
    "followup_stats": {
        "triggers": ["follow-up performance", "wie performen meine follow", "antwortrate", "follow-up statistik"],
        "handler": "handle_followup_stats",
        "description": "Follow-up Analytics",
    },
}


class ChatIntentHandler:
    def __init__(self, db, user_id: str):
        self.db = db
        self.user_id = str(user_id)

    async def handle_objection_help(self, message: str, context: dict) -> str:
        objection = self._extract_objection(message)
        similar = []
        try:
            result = self.db.table("objections").select("*").text_search("title", objection).limit(3).execute()
            similar = result.data or []
        except Exception as exc:
            logger.debug("Konnte ähnliche Einwände nicht laden: %s", exc)

        prompt = (
            f'Der User fragt nach einer Antwort auf den Einwand: "{objection}"\n\n'
            f"Ähnliche Einwände aus der Datenbank:\n{json.dumps(similar, indent=2)}\n\n"
            "Gib eine hilfreiche, natürliche Antwort wie man auf diesen Einwand reagieren kann. "
            "Wenn passend, erwähne auch alternative Formulierungen."
        )
        return await self._generate_response(prompt)

    async def handle_next_action(self, message: str, context: dict) -> str:
        tasks = []
        followups = []
        hot_leads = []
        try:
            tasks = (self.db.table("tasks").select("*").eq("user_id", self.user_id).eq("completed", False).order("due_date").limit(5).execute().data or [])
            followups = (self.db.table("follow_ups").select("*").eq("user_id", self.user_id).eq("status", "pending").order("due_date").limit(5).execute().data or [])
            hot_leads = (self.db.table("leads").select("*").eq("user_id", self.user_id).eq("status", "hot").limit(3).execute().data or [])
        except Exception as exc:
            logger.debug("Next Action Daten konnten nicht geladen werden: %s", exc)

        prompt = (
            "Analysiere die Situation des Users und empfehle die wichtigste nächste Aktion:\n\n"
            f"Offene Tasks: {json.dumps(tasks)}\n"
            f"Fällige Follow-ups: {json.dumps(followups)}\n"
            f"Heiße Leads: {json.dumps(hot_leads)}\n\n"
            "Gib eine klare, priorisierte Empfehlung was der User JETZT tun sollte."
        )
        return await self._generate_response(prompt)

    async def handle_performance(self, message: str, context: dict) -> str:
        stats = await self._get_user_stats()
        prompt = (
            "Fasse die Performance des Users zusammen:\n\n"
            f"{json.dumps(stats)}\n\n"
            "Gib einen motivierenden aber ehrlichen Überblick. "
            "Hebe Stärken hervor und gib einen konkreten Verbesserungstipp."
        )
        return await self._generate_response(prompt)

    async def handle_churn_risk(self, message: str, context: dict) -> str:
        at_risk = []
        try:
            result = self.db.rpc("get_churn_risk_leads", {"user_id": self.user_id}).execute()
            at_risk = result.data or []
        except Exception as exc:
            logger.debug("Churn-Risk konnte nicht geladen werden: %s", exc)

        if not at_risk:
            return "Gute Nachrichten! 🎉 Aktuell sehe ich keine Leads mit Churn-Risiko. Alle deine Leads wurden kürzlich kontaktiert."

        prompt = (
            "Diese Leads sind gefährdet abzuspringen:\n\n"
            f"{json.dumps(at_risk, indent=2)}\n\n"
            "Liste sie auf und gib für jeden einen konkreten Tipp was der User tun kann um sie zurückzugewinnen."
        )
        return await self._generate_response(prompt)

    async def handle_cold_call(self, message: str, context: dict) -> str:
        lead_data = None
        lead_id = context.get("lead_id")
        if lead_id:
            try:
                lead = self.db.table("leads").select("*").eq("id", lead_id).single().execute()
                lead_data = lead.data
            except Exception as exc:
                logger.debug("Lead für Cold Call konnte nicht geladen werden: %s", exc)

        prompt = (
            "Hilf dem User bei einem Cold Call.\n\n"
            f"Lead-Daten: {json.dumps(lead_data) if lead_data else 'Kein spezifischer Lead ausgewählt'}\n\n"
            "Gib:\n"
            "1. Einen Eröffnungssatz\n"
            "2. 2-3 Fragen um Bedarf zu ermitteln\n"
            "3. Einen Übergang zum Pitch\n"
            '4. Umgang mit "Keine Zeit" Einwand'
        )
        return await self._generate_response(prompt)

    async def handle_closing(self, message: str, context: dict) -> str:
        lead_data = None
        lead_id = context.get("lead_id")
        if lead_id:
            try:
                lead = self.db.table("leads").select("*, activities(*)").eq("id", lead_id).single().execute()
                lead_data = lead.data
            except Exception as exc:
                logger.debug("Lead für Closing konnte nicht geladen werden: %s", exc)

        prompt = (
            "Hilf dem User den Deal zu closen.\n\n"
            f"Lead-Daten: {json.dumps(lead_data) if lead_data else 'Kein spezifischer Lead'}\n\n"
            "Gib konkrete Closing-Techniken und Formulierungen basierend auf der Situation."
        )
        return await self._generate_response(prompt)

    async def handle_lead_discovery(self, message: str, context: dict) -> str:
        best_customers = []
        try:
            best_customers = (
                self.db.table("leads")
                .select("*")
                .eq("user_id", self.user_id)
                .eq("status", "customer")
                .order("deal_value", desc=True)  # type: ignore
                .limit(5)
                .execute()
                .data
                or []
            )
        except Exception as exc:
            logger.debug("Best Customers konnten nicht geladen werden: %s", exc)

        prompt = (
            "Analysiere die besten Kunden des Users:\n\n"
            f"{json.dumps(best_customers, indent=2)}\n\n"
            "Basierend auf diesen Mustern, beschreibe:\n"
            "1. Das ideale Kundenprofil\n"
            "2. Wo man ähnliche Leads finden könnte\n"
            "3. Welche Eigenschaften wichtig sind"
        )
        return await self._generate_response(prompt)

    async def handle_qualify_lead(self, message: str, context: dict) -> str:
        lead_id = context.get("lead_id")
        if not lead_id:
            return "Um einen Lead zu qualifizieren, wähle bitte zuerst einen Lead aus oder nenne mir den Namen."

        lead = None
        try:
            lead = self.db.table("leads").select("*, activities(*)").eq("id", lead_id).single().execute().data
        except Exception as exc:
            logger.debug("Lead konnte nicht geladen werden: %s", exc)

        prompt = (
            "Qualifiziere diesen Lead:\n\n"
            f"{json.dumps(lead, indent=2)}\n\n"
            "Bewerte auf einer Skala von 1-10 und erkläre:\n"
            "- Budget-Fit\n- Bedarf\n- Entscheidungsbefugnis\n- Timeline\n\n"
            "Gib eine klare Empfehlung: Hot, Warm, Cold oder Disqualifiziert."
        )
        return await self._generate_response(prompt)

    async def handle_deal_stuck(self, message: str, context: dict) -> str:
        lead_id = context.get("lead_id")
        if lead_id:
            lead = None
            try:
                lead = self.db.table("leads").select("*, activities(*), tasks(*)").eq("id", lead_id).single().execute().data
            except Exception as exc:
                logger.debug("Stuck Lead konnte nicht geladen werden: %s", exc)

            prompt = (
                "Analysiere warum dieser Deal stockt:\n\n"
                f"{json.dumps(lead, indent=2)}\n\n"
                "Identifiziere:\n"
                "1. Mögliche Blocker\n"
                "2. Was fehlt im Prozess\n"
                "3. Konkrete nächste Schritte um den Deal wieder in Bewegung zu bringen"
            )
        else:
            stuck = []
            try:
                stuck = (
                    self.db.table("leads")
                    .select("*")
                    .eq("user_id", self.user_id)
                    .in_("status", ["proposal", "negotiation"])
                    .execute()
                    .data
                    or []
                )
            except Exception as exc:
                logger.debug("Stuck Deals konnten nicht geladen werden: %s", exc)

            prompt = (
                "Analysiere diese Deals die möglicherweise stocken:\n\n"
                f"{json.dumps(stuck, indent=2)}\n\n"
                "Identifiziere welche am längsten keine Aktivität hatten und gib Tipps."
            )

        return await self._generate_response(prompt)

    async def handle_write_content(self, message: str, context: dict) -> str:
        prompt = (
            f'Der User möchte Content erstellen: "{message}"\n\n'
            "Schreibe den gewünschten Content. "
            "Halte ihn professionell aber persönlich. "
            "Passend für Social Media / E-Mail je nach Anfrage."
        )
        return await self._generate_response(prompt)

    async def handle_calc_commission(self, message: str, context: dict) -> str:
        numbers = re.findall(r"\d+", message)
        if numbers:
            sale_value = int(numbers[0])
            rate = 0.1
            try:
                profile = self.db.table("user_profiles").select("commission_rate").eq("user_id", self.user_id).maybe_single().execute()
                if profile and profile.data:
                    rate = profile.data.get("commission_rate", rate) or rate
            except Exception as exc:
                logger.debug("Commission Rate konnte nicht geladen werden: %s", exc)

            commission = sale_value * rate
            return (
                "💰 **Provisions-Berechnung**\n\n"
                f"Verkaufswert: €{sale_value:,.2f}\n"
                f"Deine Stufe: {rate*100:.0f}%\n\n"
                f"**Deine Provision: €{commission:,.2f}**\n\n"
                "Für detailliertere Berechnungen mit verschiedenen Stufen, nutze den [Vergütungsrechner](/compensation-simulator)."
            )

        return "Nenne mir einen Verkaufswert und ich rechne deine Provision aus. Z.B. 'Was verdiene ich bei 500€ Verkauf?'"

    async def handle_roleplay(self, message: str, context: dict) -> str:
        return (
            "🎭 **Roleplay-Modus aktiviert!**\n\n"
            "Ich spiele jetzt einen potenziellen Kunden. Du bist der Verkäufer.\n\n"
            "Wähle ein Szenario:\n"
            "1. **Erstgespräch** - Ich bin ein kalter Lead\n"
            "2. **Follow-up** - Wir hatten schon Kontakt\n"
            "3. **Einwände** - Ich bin skeptisch\n"
            "4. **Closing** - Ich bin fast überzeugt\n\n"
            "Antworte mit der Nummer oder beschreibe dein eigenes Szenario.\n\n"
            '_Tipp: Sag "Stop" um das Roleplay zu beenden und Feedback zu bekommen._'
        )

    async def handle_deal_lost(self, message: str, context: dict) -> str:
        prompt = (
            "Der User hat einen Deal verloren und ist frustriert.\n\n"
            f'Nachricht: "{message}"\n\n'
            "Sei empathisch aber konstruktiv:\n"
            "1. Validiere das Gefühl kurz\n"
            "2. Hilf bei der Analyse was schief lief (ohne Schuldzuweisungen)\n"
            "3. Gib konkrete Tipps für nächstes Mal\n"
            "4. Motiviere mit Perspektive\n\n"
            "Halte es kurz und aktionsorientiert."
        )
        return await self._generate_response(prompt)

    async def handle_followup_stats(self, message: str, context: dict) -> str:
        stats = {}
        try:
            stats = self.db.rpc("get_followup_stats", {"user_id": self.user_id}).execute().data or {}
        except Exception as exc:
            logger.debug("Follow-up Stats konnten nicht geladen werden: %s", exc)

        prompt = (
            "Follow-up Statistiken des Users:\n\n"
            f"{json.dumps(stats, indent=2)}\n\n"
            "Fasse zusammen:\n"
            "- Antwortrate\n"
            "- Beste Zeiten/Tage\n"
            "- Welche Templates performen am besten\n"
            "- Ein konkreter Verbesserungstipp"
        )
        return await self._generate_response(prompt)

    def _extract_objection(self, message: str) -> str:
        prefixes = ["wie antworte ich auf", "was sage ich wenn", "einwand", "der kunde sagt"]
        text = message.lower()
        for prefix in prefixes:
            text = text.replace(prefix, "")
        return text.strip().strip("\"'")

    async def _get_user_stats(self) -> dict:
        try:
            stats = self.db.rpc("get_user_performance", {"user_id": self.user_id}).execute()
            return stats.data or {}
        except Exception as exc:
            logger.debug("User Stats konnten nicht geladen werden: %s", exc)
            return {}

    async def _generate_response(self, prompt: str) -> str:
        if not settings.openai_api_key:
            return (
                "⚡️ (Mock) Intent-Antwort:\n\n"
                f"{prompt[:800]}\n\n"
                "Konfiguriere OPENAI_API_KEY für vollwertige Antworten."
            )

        try:
            messages = [
                {
                    "role": "system",
                    "content": (
                        "Du bist der Salesflow AI Copilot. Antworte kurz, klar und handlungsorientiert. "
                        "Sprich den Nutzer direkt an und liefere konkrete Schritte."
                    ),
                },
                {"role": "user", "content": prompt.strip()},
            ]
            return await chat_completion(
                messages=messages,
                model=settings.openai_model or "gpt-4o-mini",
                max_tokens=600,
                temperature=0.7,
            )
        except Exception as exc:
            logger.warning("Intent-Antwort konnte nicht generiert werden: %s", exc)
            return "Gerade kann ich keine AI-Antwort erzeugen. Versuch es bitte gleich erneut."


__all__ = ["CHAT_INTENTS", "ChatIntentHandler"]

