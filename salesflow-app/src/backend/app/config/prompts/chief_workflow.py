# backend/app/config/prompts/chief_workflow.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF WORKFLOW INTEGRATION PROMPTS                                        ║
║  Context-Snippets für Workflow-bezogene CHIEF-Interaktionen                ║
╚════════════════════════════════════════════════════════════════════════════╝

Diese Prompts werden in den CHIEF Context eingefügt wenn:
- Pending Actions vorhanden sind
- Finance-Warnungen existieren
- Workflow-bezogene Fragen gestellt werden
"""


def build_pending_actions_context(pending_context: dict) -> str:
    """
    Baut Kontext-String für Pending Actions.
    
    Args:
        pending_context: Dict mit pending actions Daten
        
    Returns:
        Formatierter String für den Prompt
    """
    
    if not pending_context or pending_context.get("total", 0) == 0:
        return ""
    
    total = pending_context["total"]
    payment_checks = pending_context.get("payment_checks", 0)
    overdue = pending_context.get("overdue", 0)
    actions = pending_context.get("actions", [])
    
    prompt_parts = [
        "\n## 📋 OFFENE ACTIONS",
        f"Du hast **{total}** offene Actions heute.",
    ]
    
    # Warnungen
    if overdue > 0:
        prompt_parts.append(f"⚠️ **{overdue}** davon sind überfällig!")
    
    if payment_checks > 0:
        prompt_parts.append(f"💰 **{payment_checks}** Zahlungsprüfungen stehen an!")
    
    # Top 3 Actions auflisten
    if actions:
        prompt_parts.append("\n**Dringendste Actions:**")
        for i, action in enumerate(actions[:3], 1):
            lead_name = action.get("lead_name", "Lead")
            action_type = action.get("type", "action")
            reason = action.get("reason", "")
            
            type_icons = {
                "check_payment": "💰",
                "follow_up": "📱",
                "call": "📞",
                "reactivation": "🔄",
            }
            icon = type_icons.get(action_type, "📌")
            
            prompt_parts.append(f"{i}. {icon} **{lead_name}** – {reason}")
    
    # Hinweis für CHIEF
    prompt_parts.append("\n*Erwähne proaktiv dringende Actions wenn der User nach seinem Tag fragt.*")
    
    return "\n".join(prompt_parts)


def build_finance_context(finance_context: dict) -> str:
    """
    Baut Kontext-String für Finance-Daten.
    
    WICHTIG: Keine Steuerberatung! Nur allgemeine Hinweise.
    
    Args:
        finance_context: Dict mit Finance-Summary
        
    Returns:
        Formatierter String für den Prompt
    """
    
    if not finance_context or not finance_context.get("has_data"):
        return ""
    
    profit = finance_context.get("profit_ytd", 0)
    reserve = finance_context.get("estimated_reserve", 0)
    missing = finance_context.get("missing_receipts", 0)
    needs_attention = finance_context.get("needs_attention", False)
    
    if profit <= 0 and not needs_attention:
        return ""  # Keine relevanten Infos
    
    prompt_parts = [
        "\n## 💰 FINANZ-ÜBERBLICK (nur Orientierung, keine Beratung!)"
    ]
    
    if profit > 0:
        prompt_parts.append(f"📈 Gewinn YTD: ca. {profit:,.0f} €")
        if reserve > 0:
            prompt_parts.append(f"💵 Empfohlene Steuer-Reserve: ca. {reserve:,.0f} €")
    
    if missing > 0:
        prompt_parts.append(f"📎 {missing} Belege fehlen (Ausgaben > 50 €)")
    
    # Disclaimer
    prompt_parts.append("\n*Hinweis: Das sind nur grobe Schätzungen. Für verbindliche Steuerinfos an den Steuerberater verweisen!*")
    
    return "\n".join(prompt_parts)


def build_workflow_coaching_prompt() -> str:
    """
    Prompt für Workflow-Coaching durch CHIEF.
    
    Wird verwendet wenn User nach Tagesplanung, Priorisierung fragt.
    """
    
    return """
## 🎯 WORKFLOW-COACHING

Wenn der User nach seinem Tagesablauf, Priorisierung oder "Was soll ich als nächstes tun?" fragt:

1. **Priorisiere nach Dringlichkeit:**
   - 💰 Zahlungsprüfungen ZUERST (Geld wartet!)
   - ⏰ Überfällige Actions 
   - 🔥 Heiße Leads (deal_state = 'pending_payment' oder 'negotiating')
   - 📱 Follow-ups nach Alter (älteste zuerst)
   
2. **Gib konkrete Handlungsempfehlung:**
   - Nicht "Du könntest...", sondern "Mach jetzt..."
   - Mit Name des Leads
   - Mit konkreter Nachricht falls vorhanden
   
3. **Behalte den Überblick:**
   - Erinnere an verbleibende Tages-Ziele
   - Zeige Fortschritt auf
   - Feiere kleine Wins

**Beispiel-Response:**
"Dein nächster Move: Prüf die Zahlung von Maria – sie hat vor 3 Tagen bestellt.
💰 Wenn bezahlt → als Kunde markieren, Welcome-Nachricht senden.
💰 Wenn nicht bezahlt → freundlich nachhaken: 'Hey Maria, kurze Frage zur Bestellung...'"
"""


def build_deal_state_coaching_prompt() -> str:
    """
    Prompt für Deal-State spezifisches Coaching.
    """
    
    return """
## 📊 DEAL-STATE COACHING

Je nach Deal-Status andere Strategie:

**pending_payment:**
- Fokus: Zahlung prüfen, nicht nerven
- Nach 2-3 Tagen freundlich nachfragen
- Technische Hilfe anbieten falls Probleme

**negotiating:**
- Fokus: Einwände klären, zum Abschluss führen
- Objections proaktiv ansprechen
- Limitierung/Urgency einsetzen (fair!)

**interested:**
- Fokus: Info-Material senden, Termine vorschlagen
- Nicht zu pushy, Interesse wecken
- Social Proof nutzen

**cold:**
- Fokus: Wert wieder aufbauen, neuen Aufhänger finden
- Nicht mit altem Pitch kommen
- Curiosity-Opener verwenden
"""


# =============================================================================
# COMBINED WORKFLOW CONTEXT
# =============================================================================

def build_complete_workflow_context(
    pending_context: dict = None,
    finance_context: dict = None,
    include_coaching: bool = True,
) -> str:
    """
    Baut den vollständigen Workflow-Kontext für CHIEF.
    
    Args:
        pending_context: Pending Actions Daten
        finance_context: Finance Summary Daten
        include_coaching: Coaching-Prompts einbeziehen?
        
    Returns:
        Vollständiger Workflow-Kontext String
    """
    
    parts = []
    
    # Pending Actions
    if pending_context:
        pending_str = build_pending_actions_context(pending_context)
        if pending_str:
            parts.append(pending_str)
    
    # Finance
    if finance_context:
        finance_str = build_finance_context(finance_context)
        if finance_str:
            parts.append(finance_str)
    
    # Coaching (nur wenn relevant)
    if include_coaching and pending_context:
        has_urgent = pending_context.get("has_urgent", False)
        if has_urgent:
            parts.append(build_workflow_coaching_prompt())
    
    if not parts:
        return ""
    
    return "\n\n---\n".join(parts)

