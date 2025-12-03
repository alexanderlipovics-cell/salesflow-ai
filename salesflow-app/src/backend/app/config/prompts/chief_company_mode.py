"""
CHIEF Company Mode Prompts
Company-spezifische Konfiguration für CHIEF
"""

from typing import Dict, Any, List, Optional


def build_company_mode_prompt(
    company_name: str,
    compliance_level: str,
    guardrails: List[Dict],
    products: List[Dict],
    brand_config: Dict,
) -> str:
    """
    Baut company-spezifischen Prompt für CHIEF
    """
    
    # Format guardrails
    guardrail_text = format_guardrails(guardrails)
    
    # Format products
    product_text = format_products(products)
    
    # Format brand values
    brand_text = format_brand_config(brand_config)
    
    return f"""
[COMPANY MODE: {company_name.upper()}]

Du kommunizierst im Kontext von {company_name}.
Compliance-Level: {compliance_level.upper()}

═══════════════════════════════════════════════════════════════════════════════
MARKE & WERTE
═══════════════════════════════════════════════════════════════════════════════

{brand_text}

═══════════════════════════════════════════════════════════════════════════════
COMPLIANCE REGELN
═══════════════════════════════════════════════════════════════════════════════

{guardrail_text}

═══════════════════════════════════════════════════════════════════════════════
PRODUKTE
═══════════════════════════════════════════════════════════════════════════════

{product_text}

═══════════════════════════════════════════════════════════════════════════════
ALLGEMEINE REGELN
═══════════════════════════════════════════════════════════════════════════════

1. Bleibe im Rahmen der Guardrails
2. Nutze die Produktinformationen korrekt
3. Spiegle den Markenton wider
4. Bei Unsicherheit: Lieber vorsichtiger formulieren
5. Verweise bei medizinischen/rechtlichen Fragen auf Experten
"""


def format_guardrails(guardrails: List[Dict]) -> str:
    """Formatiert Guardrails für Prompt"""
    
    if not guardrails:
        return "Keine spezifischen Guardrails definiert."
    
    lines = []
    
    # Group by severity
    blocks: Dict[str, List[Dict]] = {"block": [], "warn": [], "suggest": []}
    
    for g in guardrails:
        severity = g.get("severity", "warn")
        if severity in blocks:
            blocks[severity].append(g)
        else:
            blocks["warn"].append(g)
    
    # Blockers first
    if blocks["block"]:
        lines.append("🔴 VERBOTEN (immer einhalten):")
        for g in blocks["block"]:
            lines.append(f"   • {g['rule_name']}: {g['rule_description']}")
            if g.get("example_bad"):
                lines.append(f"     ❌ Nicht: {g['example_bad']}")
            if g.get("example_good"):
                lines.append(f"     ✅ Besser: {g['example_good']}")
        lines.append("")
    
    # Warnings
    if blocks["warn"]:
        lines.append("🟡 VORSICHT (Warnung bei Verstoß):")
        for g in blocks["warn"]:
            lines.append(f"   • {g['rule_name']}: {g['rule_description']}")
        lines.append("")
    
    # Suggestions
    if blocks["suggest"]:
        lines.append("💡 EMPFEHLUNG (bessere Alternative vorschlagen):")
        for g in blocks["suggest"]:
            lines.append(f"   • {g['rule_name']}: {g['rule_description']}")
    
    return "\n".join(lines)


def format_products(products: List[Dict]) -> str:
    """Formatiert Produkte für Prompt"""
    
    if not products:
        return "Keine Produkte definiert."
    
    lines = []
    for p in products[:10]:  # Max 10 products
        lines.append(f"• **{p['name']}** ({p.get('category', '')})")
        if p.get('tagline'):
            lines.append(f"  Slogan: {p['tagline']}")
        if p.get('description_short'):
            lines.append(f"  {p['description_short']}")
        if p.get('key_benefits'):
            benefits = p['key_benefits']
            if isinstance(benefits, list):
                benefits_str = ", ".join(benefits[:3])
            else:
                benefits_str = str(benefits)
            lines.append(f"  Vorteile: {benefits_str}")
        lines.append("")
    
    return "\n".join(lines)


def format_brand_config(config: Dict) -> str:
    """Formatiert Brand-Config für Prompt"""
    
    if not config:
        return "Keine Marken-Konfiguration definiert."
    
    lines = []
    
    if config.get("tagline"):
        lines.append(f"Tagline: \"{config['tagline']}\"")
    
    if config.get("key_differentiator"):
        lines.append(f"USP: {config['key_differentiator']}")
    
    if config.get("country"):
        lines.append(f"Herkunft: {config['country']}")
    
    if config.get("product_focus"):
        focus = config['product_focus']
        if isinstance(focus, list):
            focus_str = ", ".join(focus)
        else:
            focus_str = str(focus)
        lines.append(f"Fokus: {focus_str}")
    
    if config.get("business_model"):
        lines.append(f"Business Model: {config['business_model']}")
    
    return "\n".join(lines) if lines else "Standard-Markenwerte"


# =============================================================================
# CONTEXT INJECTION
# =============================================================================

def inject_company_context(
    base_prompt: str,
    company_id: Optional[str],
    db_session,
) -> str:
    """
    Injiziert Company-Kontext in CHIEF Prompt
    """
    
    if not company_id:
        return base_prompt
    
    from sqlalchemy import text
    
    # Get company
    company = db_session.execute(
        text("SELECT * FROM companies WHERE id = :id"),
        {"id": company_id}
    ).fetchone()
    
    if not company:
        return base_prompt
    
    company_dict = dict(company._mapping)
    
    # Get guardrails
    guardrails_result = db_session.execute(
        text("""
            SELECT * FROM company_guardrails
            WHERE (company_id = :company_id OR company_id IS NULL)
              AND is_active = true
            ORDER BY severity DESC
        """),
        {"company_id": company_id}
    ).fetchall()
    
    guardrails = [dict(g._mapping) for g in guardrails_result]
    
    # Get products
    products_result = db_session.execute(
        text("""
            SELECT * FROM company_products
            WHERE company_id = :company_id AND is_active = true
            ORDER BY sort_order
        """),
        {"company_id": company_id}
    ).fetchall()
    
    products = [dict(p._mapping) for p in products_result]
    
    # Build company prompt
    company_prompt = build_company_mode_prompt(
        company_name=company_dict.get("name", "Unknown"),
        compliance_level=company_dict.get("compliance_level") or "standard",
        guardrails=guardrails,
        products=products,
        brand_config=company_dict.get("brand_config") or {},
    )
    
    # Inject before base prompt
    return f"{company_prompt}\n\n{base_prompt}"


def get_company_stories_context(
    company_id: str,
    db_session,
    story_type: Optional[str] = None,
    audience: Optional[str] = None,
    limit: int = 3,
) -> str:
    """
    Holt relevante Stories für den CHIEF Kontext
    """
    
    from sqlalchemy import text
    
    conditions = ["company_id = :company_id", "is_active = true"]
    params: Dict[str, Any] = {"company_id": company_id}
    
    if story_type:
        conditions.append("story_type = :story_type::story_type")
        params["story_type"] = story_type
    
    if audience:
        conditions.append("audience = :audience::story_audience")
        params["audience"] = audience
    
    stories_result = db_session.execute(
        text(f"""
            SELECT title, story_type, audience, 
                   COALESCE(content_30s, content_1min, content_2min, content_full) as content,
                   use_case
            FROM company_stories
            WHERE {' AND '.join(conditions)}
            ORDER BY times_used DESC, created_at DESC
            LIMIT :limit
        """),
        {**params, "limit": limit}
    ).fetchall()
    
    if not stories_result:
        return ""
    
    lines = ["═══════════════════════════════════════════════════════════════════════════════",
             "VERFÜGBARE STORIES",
             "═══════════════════════════════════════════════════════════════════════════════",
             ""]
    
    for story in stories_result:
        story_dict = dict(story._mapping)
        lines.append(f"📖 {story_dict['title']} ({story_dict['story_type']}, {story_dict['audience']})")
        if story_dict.get('use_case'):
            lines.append(f"   Nutzen: {story_dict['use_case']}")
        if story_dict.get('content'):
            # Truncate long content
            content = story_dict['content']
            if len(content) > 300:
                content = content[:300] + "..."
            lines.append(f"   {content}")
        lines.append("")
    
    return "\n".join(lines)


def get_product_context_for_chief(
    company_id: str,
    db_session,
    product_name: Optional[str] = None,
) -> str:
    """
    Holt Produkt-Kontext für CHIEF wenn ein bestimmtes Produkt erwähnt wird
    """
    
    from sqlalchemy import text
    
    if product_name:
        # Suche spezifisches Produkt
        result = db_session.execute(
            text("""
                SELECT * FROM company_products
                WHERE company_id = :company_id 
                  AND (LOWER(name) LIKE LOWER(:name) OR LOWER(slug) LIKE LOWER(:name))
                  AND is_active = true
                LIMIT 1
            """),
            {"company_id": company_id, "name": f"%{product_name}%"}
        ).fetchone()
        
        if result:
            p = dict(result._mapping)
            lines = [
                f"═══════════════════════════════════════════════════════════════════════════════",
                f"PRODUKT-INFO: {p['name']}",
                f"═══════════════════════════════════════════════════════════════════════════════",
                "",
            ]
            
            if p.get('tagline'):
                lines.append(f"Slogan: {p['tagline']}")
            
            if p.get('description_full'):
                lines.append(f"\nBeschreibung:\n{p['description_full']}")
            elif p.get('description_short'):
                lines.append(f"\nBeschreibung: {p['description_short']}")
            
            if p.get('key_benefits'):
                benefits = p['key_benefits']
                if isinstance(benefits, list):
                    lines.append("\nVorteile:")
                    for b in benefits:
                        lines.append(f"  • {b}")
            
            if p.get('how_to_explain'):
                lines.append(f"\n💡 So erklären: {p['how_to_explain']}")
            
            if p.get('common_objections'):
                objections = p['common_objections']
                if isinstance(objections, list):
                    lines.append("\n⚠️ Typische Einwände:")
                    for o in objections:
                        lines.append(f"  • {o}")
            
            return "\n".join(lines)
    
    return ""


# =============================================================================
# COMPLIANCE CHECK HELPER
# =============================================================================

def check_message_compliance(
    message: str,
    company_id: str,
    db_session,
) -> Dict[str, Any]:
    """
    Prüft eine Nachricht auf Compliance-Verstöße
    Kann vor dem Senden verwendet werden
    """
    
    import re
    from sqlalchemy import text
    
    # Get guardrails
    guardrails_result = db_session.execute(
        text("""
            SELECT * FROM company_guardrails
            WHERE (company_id = :company_id OR company_id IS NULL)
              AND is_active = true
        """),
        {"company_id": company_id}
    ).fetchall()
    
    violations = []
    
    for guardrail in guardrails_result:
        g = dict(guardrail._mapping)
        patterns = g.get("trigger_patterns", [])
        
        if not patterns:
            continue
        
        for pattern in patterns:
            try:
                if re.search(pattern, message, re.IGNORECASE):
                    violations.append({
                        "rule_name": g["rule_name"],
                        "severity": g["severity"],
                        "description": g["rule_description"],
                        "example_good": g.get("example_good"),
                        "matched_pattern": pattern,
                    })
                    break  # One match per rule
            except re.error:
                continue  # Invalid regex
    
    has_blockers = any(v["severity"] == "block" for v in violations)
    
    return {
        "compliant": len(violations) == 0,
        "violations": violations,
        "violation_count": len(violations),
        "has_blockers": has_blockers,
        "can_send": not has_blockers,  # Blockers prevent sending
    }

