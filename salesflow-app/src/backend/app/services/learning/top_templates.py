"""
╔════════════════════════════════════════════════════════════════════════════╗
║  TOP TEMPLATES SERVICE                                                     ║
║  Holt Top-performende Templates für CHIEF Context                          ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Optional
from datetime import date, timedelta
from dataclasses import dataclass

from supabase import Client


@dataclass
class TopTemplateForChief:
    """
    Ein Top-Template für den CHIEF Kontext.
    
    Enthält nur die für CHIEF relevanten Informationen:
    - Identifikation (ID, Name)
    - Kontext (Channel, Vertical)
    - Vorschau (erste 220 Zeichen)
    - Performance-Stats
    """
    template_id: str
    name: Optional[str]
    channel: Optional[str]
    vertical_id: Optional[str]
    preview: str  # Erste 220 Zeichen
    stats: dict   # events_sent, reply_rate, win_rate


def get_top_templates_for_context(
    db: Client,
    company_id: str,
    *,
    vertical_id: Optional[str] = None,
    channel: Optional[str] = None,
    lookback_days: int = 30,
    min_sends: int = 20,
    limit: int = 3,
) -> List[TopTemplateForChief]:
    """
    Holt die Top-Templates basierend auf Win-Rate, dann Reply-Rate.
    
    Sortierung:
    1. Win-Rate (höchste zuerst)
    2. Reply-Rate (bei gleicher Win-Rate)
    3. Events Sent (bei gleichen Rates)
    
    Args:
        db: Supabase Client
        company_id: Company ID
        vertical_id: Optional Filter nach Vertical
        channel: Optional Filter nach Channel
        lookback_days: Wie viele Tage zurückschauen (default: 30)
        min_sends: Minimum Sends für statistische Relevanz (default: 20)
        limit: Maximale Anzahl Templates (default: 3)
        
    Returns:
        Liste von TopTemplateForChief
    """
    from_date = date.today() - timedelta(days=lookback_days)
    
    # Query learning_aggregates mit JOIN auf message_templates
    # Supabase unterstützt keinen direkten JOIN, daher zwei Queries
    
    # 1. Hole Aggregate-Daten
    query = db.table("learning_aggregates").select(
        "template_id, channel, vertical_id, "
        "events_sent, events_replied, events_positive_reply, events_deal_won"
    ).eq("company_id", company_id).gte(
        "period_start", from_date.isoformat()
    ).not_.is_("template_id", "null")
    
    if vertical_id:
        query = query.eq("vertical_id", vertical_id)
    if channel:
        query = query.eq("channel", channel)
    
    agg_result = query.execute()
    
    if not agg_result.data:
        return []
    
    # 2. Gruppiere nach Template
    template_stats = {}
    for row in agg_result.data:
        tid = row.get("template_id")
        if not tid:
            continue
            
        if tid not in template_stats:
            template_stats[tid] = {
                "template_id": tid,
                "channel": row.get("channel"),
                "vertical_id": row.get("vertical_id"),
                "events_sent": 0,
                "events_replied": 0,
                "events_positive_reply": 0,
                "events_deal_won": 0,
            }
        
        template_stats[tid]["events_sent"] += row.get("events_sent", 0)
        template_stats[tid]["events_replied"] += row.get("events_replied", 0)
        template_stats[tid]["events_positive_reply"] += row.get("events_positive_reply", 0)
        template_stats[tid]["events_deal_won"] += row.get("events_deal_won", 0)
    
    # 3. Filtere nach min_sends und berechne Rates
    qualified = []
    for tid, data in template_stats.items():
        sent = data["events_sent"]
        if sent < min_sends:
            continue
            
        data["reply_rate"] = data["events_replied"] / sent if sent > 0 else 0
        data["win_rate"] = data["events_deal_won"] / sent if sent > 0 else 0
        data["positive_rate"] = data["events_positive_reply"] / sent if sent > 0 else 0
        qualified.append(data)
    
    # 4. Sortiere nach Win-Rate, dann Reply-Rate
    qualified.sort(
        key=lambda x: (x.get("win_rate", 0), x.get("reply_rate", 0), x.get("events_sent", 0)),
        reverse=True
    )
    
    # 5. Hole Template-Details für Top N
    top_ids = [q["template_id"] for q in qualified[:limit]]
    
    if not top_ids:
        return []
    
    templates_result = db.table("message_templates").select(
        "id, name, content"
    ).in_("id", top_ids).execute()
    
    template_map = {}
    if templates_result.data:
        for t in templates_result.data:
            template_map[t["id"]] = t
    
    # 6. Baue Result
    results = []
    for data in qualified[:limit]:
        tid = data["template_id"]
        template = template_map.get(tid, {})
        
        results.append(TopTemplateForChief(
            template_id=tid,
            name=template.get("name"),
            channel=data.get("channel"),
            vertical_id=data.get("vertical_id"),
            preview=(template.get("content") or "")[:220],
            stats={
                "events_sent": data["events_sent"],
                "events_replied": data["events_replied"],
                "events_deal_won": data["events_deal_won"],
                "reply_rate": round(data["reply_rate"], 4),
                "win_rate": round(data["win_rate"], 4),
            }
        ))
    
    return results


def format_top_templates_for_prompt(templates: List[TopTemplateForChief]) -> str:
    """
    Formatiert Top-Templates für den CHIEF System Prompt.
    
    Args:
        templates: Liste von TopTemplateForChief
        
    Returns:
        Formatierter String für System Prompt
    """
    if not templates:
        return "Noch keine Performance-Daten verfügbar."
    
    lines = ["Deine Top-performenden Templates:"]
    
    for i, t in enumerate(templates, 1):
        reply_pct = (t.stats.get("reply_rate", 0) * 100)
        win_pct = (t.stats.get("win_rate", 0) * 100)
        
        lines.append(f"\n{i}. {t.name or 'Template'} ({t.channel or 'alle Kanäle'})")
        lines.append(f"   Reply-Rate: {reply_pct:.1f}% | Win-Rate: {win_pct:.1f}% | Sends: {t.stats.get('events_sent', 0)}")
        lines.append(f"   Vorschau: \"{t.preview[:100]}...\"")
    
    return "\n".join(lines)


def get_best_channel_insight(
    db: Client,
    company_id: str,
    *,
    lookback_days: int = 30,
    min_sends: int = 20,
) -> Optional[dict]:
    """
    Ermittelt den besten Channel basierend auf Win-Rate.
    
    Returns:
        Dict mit {channel, win_rate, reply_rate, events_sent} oder None
    """
    from_date = date.today() - timedelta(days=lookback_days)
    
    result = db.table("learning_aggregates").select(
        "channel, events_sent, events_replied, events_deal_won"
    ).eq("company_id", company_id).gte(
        "period_start", from_date.isoformat()
    ).not_.is_("channel", "null").neq("channel", "__null__").execute()
    
    if not result.data:
        return None
    
    # Gruppiere nach Channel
    channels = {}
    for row in result.data:
        ch = row.get("channel")
        if not ch:
            continue
            
        if ch not in channels:
            channels[ch] = {"events_sent": 0, "events_replied": 0, "events_deal_won": 0}
        
        channels[ch]["events_sent"] += row.get("events_sent", 0)
        channels[ch]["events_replied"] += row.get("events_replied", 0)
        channels[ch]["events_deal_won"] += row.get("events_deal_won", 0)
    
    # Finde besten Channel (mit min_sends)
    best = None
    best_win_rate = -1
    
    for ch, data in channels.items():
        sent = data["events_sent"]
        if sent < min_sends:
            continue
            
        win_rate = data["events_deal_won"] / sent if sent > 0 else 0
        if win_rate > best_win_rate:
            best_win_rate = win_rate
            best = {
                "channel": ch,
                "win_rate": round(win_rate, 4),
                "reply_rate": round(data["events_replied"] / sent, 4) if sent > 0 else 0,
                "events_sent": sent,
            }
    
    return best

