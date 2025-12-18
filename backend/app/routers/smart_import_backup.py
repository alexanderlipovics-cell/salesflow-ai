"""
Smart Import Router - Intelligent Conversation Analysis

Analyzes pasted conversations to extract lead information, conversation status,
and suggests next actions using Claude AI.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from anthropic import Anthropic
import json
import os
from datetime import datetime, timedelta
from app.core.deps import get_current_user, get_supabase

router = APIRouter(prefix="/smart-import", tags=["smart-import"])


class ConversationAnalysis(BaseModel):
    # Lead Info
    lead_name: Optional[str] = None
    lead_first_name: Optional[str] = None
    lead_last_name: Optional[str] = None
    platform: Optional[str] = None  # whatsapp, instagram, linkedin, email

    # Conversation Analysis
    status: str  # new, warm, hot, meeting_scheduled, closed
    last_message_from: str  # "me" or "lead"
    waiting_for: str  # "lead_response", "my_response", "meeting_confirmation"
    last_contact_summary: str

    # Extracted Data
    phone: Optional[str] = None
    email: Optional[str] = None
    instagram: Optional[str] = None
    company: Optional[str] = None
    interests: List[str] = []

    # Next Steps
    suggested_next_action: str
    follow_up_days: int
    draft_message: Optional[str] = None

    # Raw
    conversation_summary: str
    key_points: List[str] = []


class SmartImportRequest(BaseModel):
    conversation_text: str


class SmartImportResponse(BaseModel):
    success: bool
    analysis: Optional[ConversationAnalysis] = None
    lead_exists: bool = False
    existing_lead_id: Optional[str] = None
    error: Optional[str] = None


class MeetingNotesRequest(BaseModel):
    notes: str
    lead_name: Optional[str] = None  # If known


class GeneratedProtocol(BaseModel):
    # Lead Info (extracted or enriched)
    lead_name: str
    company: Optional[str] = None

    # Meeting Analysis
    status_update: str  # new, warm, hot, closed
    deal_value: Optional[str] = None
    pain_points: List[str] = []
    interests: List[str] = []
    next_step: str
    follow_up_days: int

    # Generated Content
    customer_message: str      # Ready to copy & send
    crm_note: str             # Auto-save to lead
    internal_summary: str     # For manager/self
    follow_up_draft: str      # If no response in X days


class MeetingProtocolResponse(BaseModel):
    success: bool
    protocol: Optional[GeneratedProtocol] = None
    lead_exists: bool = False
    existing_lead_id: Optional[str] = None
    error: Optional[str] = None


class AnalyzeRequest(BaseModel):
    text: str
    input_type: str = "auto"  # auto, conversation, meeting_notes


class LeadData(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    instagram: Optional[str] = None
    linkedin: Optional[str] = None
    whatsapp: Optional[str] = None
    company: Optional[str] = None
    platform: Optional[str] = None


class AnalysisResult(BaseModel):
    input_type: str  # conversation, meeting_notes, question
    lead: Optional[LeadData] = None

    # Conversation analysis
    status: Optional[str] = None  # new, warm, hot
    waiting_for: Optional[str] = None  # lead_response, my_response
    last_contact_summary: Optional[str] = None

    # Generated content
    conversation_summary: Optional[str] = None
    suggested_next_action: Optional[str] = None
    follow_up_days: int = 3
    customer_message: Optional[str] = None
    crm_note: Optional[str] = None
    follow_up_draft: Optional[str] = None

    # Lead check
    lead_exists: bool = False
    existing_lead_id: Optional[str] = None


class AnalyzeResponse(BaseModel):
    success: bool
    result: Optional[AnalysisResult] = None
    error: Optional[str] = None


@router.post("/analyze", response_model=SmartImportResponse)
async def analyze_conversation(
    request: SmartImportRequest,
    current_user = Depends(get_current_user)
):
    """
    Analyze a pasted conversation and extract lead + context information.
    """
    try:
        client = Anthropic()

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": f"""Analysiere diese Konversation und extrahiere alle relevanten Informationen.



KONVERSATION:

{request.conversation_text}



Antworte NUR mit validem JSON (kein Markdown, keine ErklÃ¤rung):

{{
    "lead_name": "VollstÃ¤ndiger Name des Leads (nicht mein Name)",
    "lead_first_name": "Vorname",
    "lead_last_name": "Nachname",
    "platform": "whatsapp|instagram|linkedin|email|other",
    "status": "new|warm|hot|meeting_scheduled|closed",
    "last_message_from": "me|lead",
    "waiting_for": "lead_response|my_response|meeting_confirmation|nothing",
    "last_contact_summary": "Kurze Zusammenfassung der letzten Nachricht",
    "phone": "Telefonnummer falls sichtbar",
    "email": "Email falls sichtbar",
    "instagram": "@handle falls sichtbar",
    "company": "Firma des Leads falls erwÃ¤hnt",
    "interests": ["Interesse 1", "Interesse 2"],
    "suggested_next_action": "Konkrete nÃ¤chste Aktion",
    "follow_up_days": 3,
    "draft_message": "Vorgeschlagene nÃ¤chste Nachricht falls ich antworten muss",
    "conversation_summary": "2-3 SÃ¤tze Zusammenfassung",
    "key_points": ["Punkt 1", "Punkt 2", "Punkt 3"]
}}



Regeln:

- "me" = der User der die App nutzt (Alexander in diesem Fall)
- "lead" = die andere Person in der Konversation
- Erkenne den Namen des Leads, nicht meinen Namen
- Wenn ich zuletzt geschrieben habe und auf Antwort warte: waiting_for = "lead_response"
- Wenn Lead zuletzt geschrieben hat: waiting_for = "my_response"
- Schlage eine konkrete Follow-up Nachricht vor wenn sinnvoll
"""
            }]
        )

        # Parse response
        response_text = message.content[0].text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()

        analysis_data = json.loads(response_text)
        analysis = ConversationAnalysis(**analysis_data)

        # Check if lead exists in database
        lead_exists = False
        existing_lead_id = None

        if analysis.lead_name:
            db = get_supabase()
            # Search for lead by name (case insensitive)
            result = db.table("leads").select("id, name").eq(
                "user_id", current_user["user_id"]
            ).ilike("name", f"%{analysis.lead_name}%").limit(1).execute()

            if result.data and len(result.data) > 0:
                lead_exists = True
                existing_lead_id = result.data[0]["id"]

        return SmartImportResponse(
            success=True,
            analysis=analysis,
            lead_exists=lead_exists,
            existing_lead_id=existing_lead_id
        )

    except Exception as e:
        return SmartImportResponse(
            success=False,
            error=str(e)
        )


@router.post("/create-lead")
async def create_lead_from_analysis(
    analysis: ConversationAnalysis,
    current_user = Depends(get_current_user)
):
    """
    Create a new lead from the analyzed conversation data.
    """
    try:
        db = get_supabase()

        # Prepare lead data
        now = datetime.now().isoformat()
        lead_data = {
            "user_id": current_user["user_id"],
            "name": analysis.lead_name,
            "first_name": analysis.lead_first_name,
            "last_name": analysis.lead_last_name,
            "phone": analysis.phone,
            "email": analysis.email,
            "instagram": analysis.instagram,
            "company": analysis.company,
            "source": "chat_import",
            "platform": analysis.platform or "other",
            "status": "active",
            "temperature": analysis.status,
            "last_message": analysis.last_contact_summary,
            "notes": f"Smart Import: {analysis.conversation_summary}\n\nKey Points:\n" + "\n".join(f"- {p}" for p in analysis.key_points),
            "created_at": now,
            "updated_at": now,
        }

        # Set follow-up date if waiting for lead response
        if analysis.waiting_for == "lead_response" and analysis.follow_up_days > 0:
            follow_up_date = datetime.now() + timedelta(days=analysis.follow_up_days)
            lead_data["next_follow_up"] = follow_up_date.date().isoformat()
            lead_data["follow_up_reason"] = analysis.suggested_next_action

        # Remove None values for clean insert
        lead_data = {k: v for k, v in lead_data.items() if v is not None}

        result = db.table("leads").insert(lead_data).execute()

        return {
            "success": True,
            "lead_id": result.data[0]["id"] if result.data else None,
            "lead": result.data[0] if result.data else lead_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create lead: {str(e)}")


@router.post("/meeting-notes", response_model=MeetingProtocolResponse)
async def process_meeting_notes(
    request: MeetingNotesRequest,
    current_user = Depends(get_current_user)
):
    """
    Process quick meeting notes and generate full protocol.
    """
    try:
        client = Anthropic()

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": f"""Du bist ein Sales-Protokoll-Assistent. Analysiere diese Meeting-Notizen und erstelle ein vollstÃ¤ndiges Protokoll.



MEETING-NOTIZEN:

{request.notes}



Antworte NUR mit validem JSON:

{{
    "lead_name": "Name des Leads/Kunden",
    "company": "Firma falls erwÃ¤hnt",
    "status_update": "warm|hot|closed",
    "deal_value": "Budget/Wert falls erwÃ¤hnt",
    "pain_points": ["Schmerzpunkt 1", "Schmerzpunkt 2"],
    "interests": ["Interesse 1", "Interesse 2"],
    "next_step": "Konkret vereinbarter nÃ¤chster Schritt",
    "follow_up_days": 3,

    "customer_message": "Professionelle, freundliche Nachricht an den Kunden die das GesprÃ¤ch zusammenfasst und den nÃ¤chsten Schritt bestÃ¤tigt. Auf Deutsch, mit Du-Form, 3-5 SÃ¤tze.",

    "crm_note": "Strukturierte CRM-Notiz mit allen wichtigen Fakten. Stichpunkte.",

    "internal_summary": "Kurze interne Zusammenfassung: Status, Wahrscheinlichkeit, Risiken, benÃ¶tigte Ressourcen.",

    "follow_up_draft": "Nachfass-Nachricht falls keine Antwort kommt. HÃ¶flich, nicht aufdringlich."
}}



Regeln:

- Sei konkret und handlungsorientiert
- customer_message sollte copy-ready sein (direkt versendbar)
- Erkenne implizite Informationen (z.B. 'sie schickt ZeitvorschlÃ¤ge' = wartet auf Kunde)
- follow_up_days basiert auf Dringlichkeit (hot = 2, warm = 3-5, cold = 7)
"""
            }]
        )

        # Parse response
        response_text = message.content[0].text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()

        protocol_data = json.loads(response_text)
        protocol = GeneratedProtocol(**protocol_data)

        # Check if lead exists in database
        lead_exists = False
        existing_lead_id = None

        if protocol.lead_name:
            db = get_supabase()
            # Search for lead by name (case insensitive)
            result = db.table("leads").select("id, name").eq(
                "user_id", current_user["user_id"]
            ).ilike("name", f"%{protocol.lead_name}%").limit(1).execute()

            if result.data and len(result.data) > 0:
                lead_exists = True
                existing_lead_id = result.data[0]["id"]

        return MeetingProtocolResponse(
            success=True,
            protocol=protocol,
            lead_exists=lead_exists,
            existing_lead_id=existing_lead_id
        )

    except Exception as e:
        return MeetingProtocolResponse(
            success=False,
            error=str(e)
        )


@router.post("/create-lead-protocol")
async def create_lead_from_protocol(
    protocol: GeneratedProtocol,
    current_user = Depends(get_current_user)
):
    """
    Create or update a lead from the generated meeting protocol.
    """
    try:
        db = get_supabase()

        # Prepare lead data
        now = datetime.now().isoformat()
        lead_data = {
            "user_id": current_user["user_id"],
            "name": protocol.lead_name,
            "company": protocol.company,
            "status": "active",
            "temperature": protocol.status_update,
            "notes": f"Meeting Protocol:\n\n{protocol.crm_note}\n\nInternal Summary: {protocol.internal_summary}",
            "created_at": now,
            "updated_at": now,
        }

        # Set follow-up date
        if protocol.follow_up_days > 0:
            follow_up_date = datetime.now() + timedelta(days=protocol.follow_up_days)
            lead_data["next_follow_up"] = follow_up_date.date().isoformat()
            lead_data["follow_up_reason"] = protocol.next_step

        # Add deal value if present
        if protocol.deal_value:
            lead_data["notes"] += f"\n\nDeal Value: {protocol.deal_value}"

        # Remove None values for clean insert
        lead_data = {k: v for k, v in lead_data.items() if v is not None}

        result = db.table("leads").insert(lead_data).execute()

        return {
            "success": True,
            "lead_id": result.data[0]["id"] if result.data else None,
            "lead": result.data[0] if result.data else lead_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create lead: {str(e)}")

 
 
 c l a s s   A n a l y z e R e q u e s t ( B a s e M o d e l ) : 
         t e x t :   s t r 
         i n p u t _ t y p e :   s t r   =   " a u t o "     #   a u t o ,   c o n v e r s a t i o n ,   m e e t i n g _ n o t e s 
 
 
 c l a s s   L e a d D a t a ( B a s e M o d e l ) : 
         n a m e :   O p t i o n a l [ s t r ]   =   N o n e 
         f i r s t _ n a m e :   O p t i o n a l [ s t r ]   =   N o n e 
         l a s t _ n a m e :   O p t i o n a l [ s t r ]   =   N o n e 
         e m a i l :   O p t i o n a l [ s t r ]   =   N o n e 
         p h o n e :   O p t i o n a l [ s t r ]   =   N o n e 
         i n s t a g r a m :   O p t i o n a l [ s t r ]   =   N o n e 
         l i n k e d i n :   O p t i o n a l [ s t r ]   =   N o n e 
         w h a t s a p p :   O p t i o n a l [ s t r ]   =   N o n e 
         c o m p a n y :   O p t i o n a l [ s t r ]   =   N o n e 
         p l a t f o r m :   O p t i o n a l [ s t r ]   =   N o n e 
 
 
 c l a s s   A n a l y s i s R e s u l t ( B a s e M o d e l ) : 
         i n p u t _ t y p e :   s t r     #   c o n v e r s a t i o n ,   m e e t i n g _ n o t e s ,   q u e s t i o n 
         l e a d :   O p t i o n a l [ L e a d D a t a ]   =   N o n e 
 
         #   C o n v e r s a t i o n   a n a l y s i s 
         s t a t u s :   O p t i o n a l [ s t r ]   =   N o n e     #   n e w ,   w a r m ,   h o t 
         w a i t i n g _ f o r :   O p t i o n a l [ s t r ]   =   N o n e     #   l e a d _ r e s p o n s e ,   m y _ r e s p o n s e 
         l a s t _ c o n t a c t _ s u m m a r y :   O p t i o n a l [ s t r ]   =   N o n e 
 
         #   G e n e r a t e d   c o n t e n t 
         c o n v e r s a t i o n _ s u m m a r y :   O p t i o n a l [ s t r ]   =   N o n e 
         s u g g e s t e d _ n e x t _ a c t i o n :   O p t i o n a l [ s t r ]   =   N o n e 
         f o l l o w _ u p _ d a y s :   i n t   =   3 
         c u s t o m e r _ m e s s a g e :   O p t i o n a l [ s t r ]   =   N o n e 
         c r m _ n o t e :   O p t i o n a l [ s t r ]   =   N o n e 
         f o l l o w _ u p _ d r a f t :   O p t i o n a l [ s t r ]   =   N o n e 
 
         #   L e a d   c h e c k 
         l e a d _ e x i s t s :   b o o l   =   F a l s e 
         e x i s t i n g _ l e a d _ i d :   O p t i o n a l [ s t r ]   =   N o n e 
 
 
 c l a s s   A n a l y z e R e s p o n s e ( B a s e M o d e l ) : 
         s u c c e s s :   b o o l 
         r e s u l t :   O p t i o n a l [ A n a l y s i s R e s u l t ]   =   N o n e 
         e r r o r :   O p t i o n a l [ s t r ]   =   N o n e 
 
 
 @ r o u t e r . p o s t ( " / a n a l y z e " ,   r e s p o n s e _ m o d e l = A n a l y z e R e s p o n s e ) 
 a s y n c   d e f   a n a l y z e _ i n p u t ( 
         r e q u e s t :   A n a l y z e R e q u e s t , 
         c u r r e n t _ u s e r   =   D e p e n d s ( g e t _ c u r r e n t _ u s e r ) 
 ) : 
         " " " 
         S m a r t   i n p u t   a n a l y z e r   -   d e t e c t s   t y p e   a n d   p r o c e s s e s   a c c o r d i n g l y . 
         " " " 
         t r y : 
                 c l i e n t   =   A n t h r o p i c ( ) 
 
                 p r o m p t   =   f " " " A n a l y s i e r e   d i e s e n   I n p u t   u n d   b e s t i m m e   d e n   T y p : 
 
 
 
 I N P U T : 
 
 { r e q u e s t . t e x t } 
 
 
 
 B e s t i m m e   z u e r s t   d e n   T y p : 
 
 -   " c o n v e r s a t i o n "   =   K o p i e r t e r   C h a t - V e r l a u f   ( e n t h ä l t   Z e i t s t e m p e l ,   m e h r e r e   N a c h r i c h t e n ,   " D u   h a s t   g e s e n d e t "   e t c . ) 
 
 -   " m e e t i n g _ n o t e s "   =   K u r z e   S t i c h p u n k t e   n a c h   e i n e m   T e r m i n   ( <   5 0 0   Z e i c h e n ,   e n t h ä l t   " T e r m i n " ,   " B u d g e t " ,   " N ä c h s t e r   S c h r i t t "   e t c . ) 
 
 -   " q u e s t i o n "   =   N o r m a l e   F r a g e   a n   d e n   A I - A s s i s t e n t e n 
 
 
 
 A n t w o r t e   N U R   m i t   v a l i d e m   J S O N : 
 
 { { 
 
         " i n p u t _ t y p e " :   " c o n v e r s a t i o n | m e e t i n g _ n o t e s | q u e s t i o n " , 
 
 
 
         " l e a d " :   { { 
 
                 " n a m e " :   " N a m e   d e r   a n d e r e n   P e r s o n   ( n i c h t   m e i n   N a m e ) " , 
 
                 " f i r s t _ n a m e " :   " V o r n a m e " , 
 
                 " l a s t _ n a m e " :   " N a c h n a m e " , 
 
                 " p h o n e " :   " T e l e f o n   f a l l s   s i c h t b a r " , 
 
                 " e m a i l " :   " E m a i l   f a l l s   s i c h t b a r " , 
 
                 " i n s t a g r a m " :   " @ h a n d l e   o h n e   @ " , 
 
                 " c o m p a n y " :   " F i r m a " , 
 
                 " p l a t f o r m " :   " w h a t s a p p | i n s t a g r a m | l i n k e d i n | e m a i l " 
 
         } } , 
 
 
 
         " s t a t u s " :   " n e w | w a r m | h o t " , 
 
         " w a i t i n g _ f o r " :   " l e a d _ r e s p o n s e | m y _ r e s p o n s e | n o t h i n g " , 
 
         " l a s t _ c o n t a c t _ s u m m a r y " :   " W a s   w u r d e   z u l e t z t   b e s p r o c h e n " , 
 
 
 
         " c o n v e r s a t i o n _ s u m m a r y " :   " 2 - 3   S ä t z e   Z u s a m m e n f a s s u n g " , 
 
         " s u g g e s t e d _ n e x t _ a c t i o n " :   " K o n k r e t e   n ä c h s t e   A k t i o n " , 
 
         " f o l l o w _ u p _ d a y s " :   3 , 
 
 
 
         " c u s t o m e r _ m e s s a g e " :   " F e r t i g e   N a c h r i c h t   a n   d e n   K u n d e n   ( n u r   b e i   m e e t i n g _ n o t e s ) " , 
 
         " c r m _ n o t e " :   " S t r u k t u r i e r t e   C R M - N o t i z " , 
 
         " f o l l o w _ u p _ d r a f t " :   " N a c h f a s s - N a c h r i c h t   f a l l s   k e i n e   A n t w o r t " 
 
 } } 
 
 
 
 R e g e l n : 
 
 -   B e i   " q u e s t i o n " :   N u r   i n p u t _ t y p e   z u r ü c k g e b e n ,   R e s t   l e e r 
 
 -   B e i   " c o n v e r s a t i o n " :   L e a d   e x t r a h i e r e n ,   S t a t u s   a n a l y s i e r e n 
 
 -   B e i   " m e e t i n g _ n o t e s " :   A l l e s   g e n e r i e r e n   i n k l .   c u s t o m e r _ m e s s a g e 
 
 -   M e i n   N a m e   i s t   N I C H T   d e r   L e a d   -   e r k e n n e   w e r   I C H   b i n   v s   w e r   d e r   L E A D   i s t 
 
 -   c u s t o m e r _ m e s s a g e   s o l l   c o p y - r e a d y   s e i n   ( d i r e k t   v e r s e n d b a r ,   D u - F o r m ,   p r o f e s s i o n e l l   a b e r   f r e u n d l i c h ) 
 
 " " " 
 
                 m e s s a g e   =   c l i e n t . m e s s a g e s . c r e a t e ( 
                         m o d e l = " c l a u d e - 3 - 5 - s o n n e t - 2 0 2 4 1 0 2 2 " , 
                         m a x _ t o k e n s = 2 0 0 0 , 
                         m e s s a g e s = [ { " r o l e " :   " u s e r " ,   " c o n t e n t " :   p r o m p t } ] 
                 ) 
 
                 r e s p o n s e _ t e x t   =   m e s s a g e . c o n t e n t [ 0 ] . t e x t . s t r i p ( ) 
 
                 #   C l e a n   m a r k d o w n   i f   p r e s e n t 
                 i f   " ` ` ` "   i n   r e s p o n s e _ t e x t : 
                         r e s p o n s e _ t e x t   =   r e s p o n s e _ t e x t . s p l i t ( " ` ` ` " ) [ 1 ] 
                         i f   r e s p o n s e _ t e x t . s t a r t s w i t h ( " j s o n " ) : 
                                 r e s p o n s e _ t e x t   =   r e s p o n s e _ t e x t [ 4 : ] 
                 r e s p o n s e _ t e x t   =   r e s p o n s e _ t e x t . s t r i p ( ) 
 
                 d a t a   =   j s o n . l o a d s ( r e s p o n s e _ t e x t ) 
 
                 #   C h e c k   i f   l e a d   e x i s t s 
                 l e a d _ e x i s t s   =   F a l s e 
                 e x i s t i n g _ l e a d _ i d   =   N o n e 
 
                 i f   d a t a . g e t ( " l e a d " ,   { } ) . g e t ( " n a m e " ) : 
                         d b   =   g e t _ s u p a b a s e ( ) 
                         r e s u l t   =   d b . t a b l e ( " l e a d s " ) . s e l e c t ( " i d ,   n a m e " ) . e q ( 
                                 " u s e r _ i d " ,   c u r r e n t _ u s e r [ " u s e r _ i d " ] 
                         ) . i l i k e ( " n a m e " ,   f " % { d a t a [  
 l e a d ] [ n a m e ] } % " ) . l i m i t ( 1 ) . e x e c u t e ( ) 
 
                         i f   r e s u l t . d a t a   a n d   l e n ( r e s u l t . d a t a )   >   0 : 
                                 l e a d _ e x i s t s   =   T r u e 
                                 e x i s t i n g _ l e a d _ i d   =   r e s u l t . d a t a [ 0 ] [ " i d " ] 
 
                 r e s u l t   =   A n a l y s i s R e s u l t ( 
                         i n p u t _ t y p e = d a t a . g e t ( " i n p u t _ t y p e " ,   " q u e s t i o n " ) , 
                         l e a d = L e a d D a t a ( * * d a t a . g e t ( " l e a d " ,   { } ) )   i f   d a t a . g e t ( " l e a d " )   e l s e   N o n e , 
                         s t a t u s = d a t a . g e t ( " s t a t u s " ) , 
                         w a i t i n g _ f o r = d a t a . g e t ( " w a i t i n g _ f o r " ) , 
                         l a s t _ c o n t a c t _ s u m m a r y = d a t a . g e t ( " l a s t _ c o n t a c t _ s u m m a r y " ) , 
                         c o n v e r s a t i o n _ s u m m a r y = d a t a . g e t ( " c o n v e r s a t i o n _ s u m m a r y " ) , 
                         s u g g e s t e d _ n e x t _ a c t i o n = d a t a . g e t ( " s u g g e s t e d _ n e x t _ a c t i o n " ) , 
                         f o l l o w _ u p _ d a y s = d a t a . g e t ( " f o l l o w _ u p _ d a y s " ,   3 ) , 
                         c u s t o m e r _ m e s s a g e = d a t a . g e t ( " c u s t o m e r _ m e s s a g e " ) , 
                         c r m _ n o t e = d a t a . g e t ( " c r m _ n o t e " ) , 
                         f o l l o w _ u p _ d r a f t = d a t a . g e t ( " f o l l o w _ u p _ d r a f t " ) , 
                         l e a d _ e x i s t s = l e a d _ e x i s t s , 
                         e x i s t i n g _ l e a d _ i d = e x i s t i n g _ l e a d _ i d 
                 ) 
 
                 r e t u r n   A n a l y z e R e s p o n s e ( s u c c e s s = T r u e ,   r e s u l t = r e s u l t ) 
 
         e x c e p t   j s o n . J S O N D e c o d e E r r o r   a s   e : 
                 r e t u r n   A n a l y z e R e s p o n s e ( s u c c e s s = F a l s e ,   e r r o r = f " P a r s e   e r r o r :   { s t r ( e ) } " ) 
         e x c e p t   E x c e p t i o n   a s   e : 
                 r e t u r n   A n a l y z e R e s p o n s e ( s u c c e s s = F a l s e ,   e r r o r = s t r ( e ) ) 
 
 
 @ r o u t e r . p o s t ( " / s a v e - l e a d " ) 
 a s y n c   d e f   s a v e _ l e a d _ f r o m _ a n a l y s i s ( 
         l e a d :   L e a d D a t a , 
         n o t e s :   O p t i o n a l [ s t r ]   =   N o n e , 
         f o l l o w _ u p _ d a y s :   i n t   =   3 , 
         s t a t u s :   s t r   =   " w a r m " , 
         c u r r e n t _ u s e r   =   D e p e n d s ( g e t _ c u r r e n t _ u s e r ) 
 ) : 
         " " " S a v e   a n a l y z e d   l e a d   t o   d a t a b a s e . " " " 
         t r y : 
                 f r o m   d a t e t i m e   i m p o r t   d a t e t i m e ,   t i m e d e l t a 
 
                 d b   =   g e t _ s u p a b a s e ( ) 
 
                 l e a d _ d a t a   =   { 
                         " u s e r _ i d " :   c u r r e n t _ u s e r [ " u s e r _ i d " ] , 
                         " n a m e " :   l e a d . n a m e , 
                         " f i r s t _ n a m e " :   l e a d . f i r s t _ n a m e , 
                         " l a s t _ n a m e " :   l e a d . l a s t _ n a m e , 
                         " e m a i l " :   l e a d . e m a i l , 
                         " p h o n e " :   l e a d . p h o n e , 
                         " i n s t a g r a m " :   l e a d . i n s t a g r a m , 
                         " l i n k e d i n " :   l e a d . l i n k e d i n , 
                         " w h a t s a p p " :   l e a d . w h a t s a p p , 
                         " c o m p a n y " :   l e a d . c o m p a n y , 
                         " p l a t f o r m " :   l e a d . p l a t f o r m , 
                         " s o u r c e " :   " s m a r t _ i m p o r t " , 
                         " s t a t u s " :   " a c t i v e " , 
                         " t e m p e r a t u r e " :   s t a t u s , 
                         " n o t e s " :   n o t e s , 
                 } 
 
                 #   S e t   f o l l o w - u p   d a t e 
                 i f   f o l l o w _ u p _ d a y s   >   0 : 
                         f o l l o w _ u p _ d a t e   =   d a t e t i m e . n o w ( )   +   t i m e d e l t a ( d a y s = f o l l o w _ u p _ d a y s ) 
                         l e a d _ d a t a [ " n e x t _ f o l l o w _ u p " ]   =   f o l l o w _ u p _ d a t e . d a t e ( ) . i s o f o r m a t ( ) 
 
                 #   R e m o v e   N o n e   v a l u e s 
                 l e a d _ d a t a   =   { k :   v   f o r   k ,   v   i n   l e a d _ d a t a . i t e m s ( )   i f   v   i s   n o t   N o n e } 
 
                 r e s u l t   =   d b . t a b l e ( " l e a d s " ) . i n s e r t ( l e a d _ d a t a ) . e x e c u t e ( ) 
 
                 r e t u r n   { " s u c c e s s " :   T r u e ,   " l e a d _ i d " :   r e s u l t . d a t a [ 0 ] [ " i d " ] } 
 
         e x c e p t   E x c e p t i o n   a s   e : 
                 r a i s e   H T T P E x c e p t i o n ( s t a t u s _ c o d e = 5 0 0 ,   d e t a i l = s t r ( e ) )  
 
 
 
 c l a s s   A n a l y z e R e q u e s t ( B a s e M o d e l ) : 
         t e x t :   s t r 
         i n p u t _ t y p e :   s t r   =   " a u t o "     #   a u t o ,   c o n v e r s a t i o n ,   m e e t i n g _ n o t e s 
 
 
 c l a s s   L e a d D a t a ( B a s e M o d e l ) : 
         n a m e :   O p t i o n a l [ s t r ]   =   N o n e 
         f i r s t _ n a m e :   O p t i o n a l [ s t r ]   =   N o n e 
         l a s t _ n a m e :   O p t i o n a l [ s t r ]   =   N o n e 
         e m a i l :   O p t i o n a l [ s t r ]   =   N o n e 
         p h o n e :   O p t i o n a l [ s t r ]   =   N o n e 
         i n s t a g r a m :   O p t i o n a l [ s t r ]   =   N o n e 
         l i n k e d i n :   O p t i o n a l [ s t r ]   =   N o n e 
         w h a t s a p p :   O p t i o n a l [ s t r ]   =   N o n e 
         c o m p a n y :   O p t i o n a l [ s t r ]   =   N o n e 
         p l a t f o r m :   O p t i o n a l [ s t r ]   =   N o n e 
 
 
 c l a s s   A n a l y s i s R e s u l t ( B a s e M o d e l ) : 
         i n p u t _ t y p e :   s t r     #   c o n v e r s a t i o n ,   m e e t i n g _ n o t e s ,   q u e s t i o n 
         l e a d :   O p t i o n a l [ L e a d D a t a ]   =   N o n e 
 
         #   C o n v e r s a t i o n   a n a l y s i s 
         s t a t u s :   O p t i o n a l [ s t r ]   =   N o n e     #   n e w ,   w a r m ,   h o t 
         w a i t i n g _ f o r :   O p t i o n a l [ s t r ]   =   N o n e     #   l e a d _ r e s p o n s e ,   m y _ r e s p o n s e 
         l a s t _ c o n t a c t _ s u m m a r y :   O p t i o n a l [ s t r ]   =   N o n e 
 
         #   G e n e r a t e d   c o n t e n t 
         c o n v e r s a t i o n _ s u m m a r y :   O p t i o n a l [ s t r ]   =   N o n e 
         s u g g e s t e d _ n e x t _ a c t i o n :   O p t i o n a l [ s t r ]   =   N o n e 
         f o l l o w _ u p _ d a y s :   i n t   =   3 
         c u s t o m e r _ m e s s a g e :   O p t i o n a l [ s t r ]   =   N o n e 
         c r m _ n o t e :   O p t i o n a l [ s t r ]   =   N o n e 
         f o l l o w _ u p _ d r a f t :   O p t i o n a l [ s t r ]   =   N o n e 
 
         #   L e a d   c h e c k 
         l e a d _ e x i s t s :   b o o l   =   F a l s e 
         e x i s t i n g _ l e a d _ i d :   O p t i o n a l [ s t r ]   =   N o n e 
 
 
 c l a s s   A n a l y z e R e s p o n s e ( B a s e M o d e l ) : 
         s u c c e s s :   b o o l 
         r e s u l t :   O p t i o n a l [ A n a l y s i s R e s u l t ]   =   N o n e 
         e r r o r :   O p t i o n a l [ s t r ]   =   N o n e 
 
 
 @ r o u t e r . p o s t ( " / a n a l y z e " ,   r e s p o n s e _ m o d e l = A n a l y z e R e s p o n s e ) 
 a s y n c   d e f   a n a l y z e _ i n p u t ( 
         r e q u e s t :   A n a l y z e R e q u e s t , 
         c u r r e n t _ u s e r   =   D e p e n d s ( g e t _ c u r r e n t _ u s e r ) 
 ) : 
         " " " 
         S m a r t   i n p u t   a n a l y z e r   -   d e t e c t s   t y p e   a n d   p r o c e s s e s   a c c o r d i n g l y . 
         " " " 
         t r y : 
                 c l i e n t   =   A n t h r o p i c ( ) 
 
                 p r o m p t   =   f " " " A n a l y s i e r e   d i e s e n   I n p u t   u n d   b e s t i m m e   d e n   T y p : 
 
 
 
 I N P U T : 
 
 { r e q u e s t . t e x t } 
 
 
 
 B e s t i m m e   z u e r s t   d e n   T y p : 
 
 -   " c o n v e r s a t i o n "   =   K o p i e r t e r   C h a t - V e r l a u f   ( e n t h ä l t   Z e i t s t e m p e l ,   m e h r e r e   N a c h r i c h t e n ,   " D u   h a s t   g e s e n d e t "   e t c . ) 
 
 -   " m e e t i n g _ n o t e s "   =   K u r z e   S t i c h p u n k t e   n a c h   e i n e m   T e r m i n   ( <   5 0 0   Z e i c h e n ,   e n t h ä l t   " T e r m i n " ,   " B u d g e t " ,   " N ä c h s t e r   S c h r i t t "   e t c . ) 
 
 -   " q u e s t i o n "   =   N o r m a l e   F r a g e   a n   d e n   A I - A s s i s t e n t e n 
 
 
 
 A n t w o r t e   N U R   m i t   v a l i d e m   J S O N : 
 
 { { 
 
         " i n p u t _ t y p e " :   " c o n v e r s a t i o n | m e e t i n g _ n o t e s | q u e s t i o n " , 
 
 
 
         " l e a d " :   { { 
 
                 " n a m e " :   " N a m e   d e r   a n d e r e n   P e r s o n   ( n i c h t   m e i n   N a m e ) " , 
 
                 " f i r s t _ n a m e " :   " V o r n a m e " , 
 
                 " l a s t _ n a m e " :   " N a c h n a m e " , 
 
                 " p h o n e " :   " T e l e f o n   f a l l s   s i c h t b a r " , 
 
                 " e m a i l " :   " E m a i l   f a l l s   s i c h t b a r " , 
 
                 " i n s t a g r a m " :   " @ h a n d l e   o h n e   @ " , 
 
                 " c o m p a n y " :   " F i r m a " , 
 
                 " p l a t f o r m " :   " w h a t s a p p | i n s t a g r a m | l i n k e d i n | e m a i l " 
 
         } } , 
 
 
 
         " s t a t u s " :   " n e w | w a r m | h o t " , 
 
         " w a i t i n g _ f o r " :   " l e a d _ r e s p o n s e | m y _ r e s p o n s e | n o t h i n g " , 
 
         " l a s t _ c o n t a c t _ s u m m a r y " :   " W a s   w u r d e   z u l e t z t   b e s p r o c h e n " , 
 
 
 
         " c o n v e r s a t i o n _ s u m m a r y " :   " 2 - 3   S ä t z e   Z u s a m m e n f a s s u n g " , 
 
         " s u g g e s t e d _ n e x t _ a c t i o n " :   " K o n k r e t e   n ä c h s t e   A k t i o n " , 
 
         " f o l l o w _ u p _ d a y s " :   3 , 
 
 
 
         " c u s t o m e r _ m e s s a g e " :   " F e r t i g e   N a c h r i c h t   a n   d e n   K u n d e n   ( n u r   b e i   m e e t i n g _ n o t e s ) " , 
 
         " c r m _ n o t e " :   " S t r u k t u r i e r t e   C R M - N o t i z " , 
 
         " f o l l o w _ u p _ d r a f t " :   " N a c h f a s s - N a c h r i c h t   f a l l s   k e i n e   A n t w o r t " 
 
 } } 
 
 
 
 R e g e l n : 
 
 -   B e i   " q u e s t i o n " :   N u r   i n p u t _ t y p e   z u r ü c k g e b e n ,   R e s t   l e e r 
 
 -   B e i   " c o n v e r s a t i o n " :   L e a d   e x t r a h i e r e n ,   S t a t u s   a n a l y s i e r e n 
 
 -   B e i   " m e e t i n g _ n o t e s " :   A l l e s   g e n e r i e r e n   i n k l .   c u s t o m e r _ m e s s a g e 
 
 -   M e i n   N a m e   i s t   N I C H T   d e r   L e a d   -   e r k e n n e   w e r   I C H   b i n   v s   w e r   d e r   L E A D   i s t 
 
 -   c u s t o m e r _ m e s s a g e   s o l l   c o p y - r e a d y   s e i n   ( d i r e k t   v e r s e n d b a r ,   D u - F o r m ,   p r o f e s s i o n e l l   a b e r   f r e u n d l i c h ) 
 
 " " " 
 
                 m e s s a g e   =   c l i e n t . m e s s a g e s . c r e a t e ( 
                         m o d e l = " c l a u d e - 3 - 5 - s o n n e t - 2 0 2 4 1 0 2 2 " , 
                         m a x _ t o k e n s = 2 0 0 0 , 
                         m e s s a g e s = [ { " r o l e " :   " u s e r " ,   " c o n t e n t " :   p r o m p t } ] 
                 ) 
 
                 r e s p o n s e _ t e x t   =   m e s s a g e . c o n t e n t [ 0 ] . t e x t . s t r i p ( ) 
 
                 #   C l e a n   m a r k d o w n   i f   p r e s e n t 
                 i f   " ` ` ` "   i n   r e s p o n s e _ t e x t : 
                         r e s p o n s e _ t e x t   =   r e s p o n s e _ t e x t . s p l i t ( " ` ` ` " ) [ 1 ] 
                         i f   r e s p o n s e _ t e x t . s t a r t s w i t h ( " j s o n " ) : 
                                 r e s p o n s e _ t e x t   =   r e s p o n s e _ t e x t [ 4 : ] 
                 r e s p o n s e _ t e x t   =   r e s p o n s e _ t e x t . s t r i p ( ) 
 
                 d a t a   =   j s o n . l o a d s ( r e s p o n s e _ t e x t ) 
 
                 #   C h e c k   i f   l e a d   e x i s t s 
                 l e a d _ e x i s t s   =   F a l s e 
                 e x i s t i n g _ l e a d _ i d   =   N o n e 
 
                 i f   d a t a . g e t ( " l e a d " ,   { } ) . g e t ( " n a m e " ) : 
                         d b   =   g e t _ s u p a b a s e ( ) 
                         r e s u l t   =   d b . t a b l e ( " l e a d s " ) . s e l e c t ( " i d ,   n a m e " ) . e q ( 
                                 " u s e r _ i d " ,   c u r r e n t _ u s e r [ " u s e r _ i d " ] 
                         ) . i l i k e ( " n a m e " ,   f " % { d a t a [  
 l e a d ] [ n a m e ] } % " ) . l i m i t ( 1 ) . e x e c u t e ( ) 
 
                         i f   r e s u l t . d a t a   a n d   l e n ( r e s u l t . d a t a )   >   0 : 
                                 l e a d _ e x i s t s   =   T r u e 
                                 e x i s t i n g _ l e a d _ i d   =   r e s u l t . d a t a [ 0 ] [ " i d " ] 
 
                 r e s u l t   =   A n a l y s i s R e s u l t ( 
                         i n p u t _ t y p e = d a t a . g e t ( " i n p u t _ t y p e " ,   " q u e s t i o n " ) , 
                         l e a d = L e a d D a t a ( * * d a t a . g e t ( " l e a d " ,   { } ) )   i f   d a t a . g e t ( " l e a d " )   e l s e   N o n e , 
                         s t a t u s = d a t a . g e t ( " s t a t u s " ) , 
                         w a i t i n g _ f o r = d a t a . g e t ( " w a i t i n g _ f o r " ) , 
                         l a s t _ c o n t a c t _ s u m m a r y = d a t a . g e t ( " l a s t _ c o n t a c t _ s u m m a r y " ) , 
                         c o n v e r s a t i o n _ s u m m a r y = d a t a . g e t ( " c o n v e r s a t i o n _ s u m m a r y " ) , 
                         s u g g e s t e d _ n e x t _ a c t i o n = d a t a . g e t ( " s u g g e s t e d _ n e x t _ a c t i o n " ) , 
                         f o l l o w _ u p _ d a y s = d a t a . g e t ( " f o l l o w _ u p _ d a y s " ,   3 ) , 
                         c u s t o m e r _ m e s s a g e = d a t a . g e t ( " c u s t o m e r _ m e s s a g e " ) , 
                         c r m _ n o t e = d a t a . g e t ( " c r m _ n o t e " ) , 
                         f o l l o w _ u p _ d r a f t = d a t a . g e t ( " f o l l o w _ u p _ d r a f t " ) , 
                         l e a d _ e x i s t s = l e a d _ e x i s t s , 
                         e x i s t i n g _ l e a d _ i d = e x i s t i n g _ l e a d _ i d 
                 ) 
 
                 r e t u r n   A n a l y z e R e s p o n s e ( s u c c e s s = T r u e ,   r e s u l t = r e s u l t ) 
 
         e x c e p t   j s o n . J S O N D e c o d e E r r o r   a s   e : 
                 r e t u r n   A n a l y z e R e s p o n s e ( s u c c e s s = F a l s e ,   e r r o r = f " P a r s e   e r r o r :   { s t r ( e ) } " ) 
         e x c e p t   E x c e p t i o n   a s   e : 
                 r e t u r n   A n a l y z e R e s p o n s e ( s u c c e s s = F a l s e ,   e r r o r = s t r ( e ) ) 
 
 
 @ r o u t e r . p o s t ( " / s a v e - l e a d " ) 
 a s y n c   d e f   s a v e _ l e a d _ f r o m _ a n a l y s i s ( 
         l e a d :   L e a d D a t a , 
         n o t e s :   O p t i o n a l [ s t r ]   =   N o n e , 
         f o l l o w _ u p _ d a y s :   i n t   =   3 , 
         s t a t u s :   s t r   =   " w a r m " , 
         c u r r e n t _ u s e r   =   D e p e n d s ( g e t _ c u r r e n t _ u s e r ) 
 ) : 
         " " " S a v e   a n a l y z e d   l e a d   t o   d a t a b a s e . " " " 
         t r y : 
                 f r o m   d a t e t i m e   i m p o r t   d a t e t i m e ,   t i m e d e l t a 
 
                 d b   =   g e t _ s u p a b a s e ( ) 
 
                 l e a d _ d a t a   =   { 
                         " u s e r _ i d " :   c u r r e n t _ u s e r [ " u s e r _ i d " ] , 
                         " n a m e " :   l e a d . n a m e , 
                         " f i r s t _ n a m e " :   l e a d . f i r s t _ n a m e , 
                         " l a s t _ n a m e " :   l e a d . l a s t _ n a m e , 
                         " e m a i l " :   l e a d . e m a i l , 
                         " p h o n e " :   l e a d . p h o n e , 
                         " i n s t a g r a m " :   l e a d . i n s t a g r a m , 
                         " l i n k e d i n " :   l e a d . l i n k e d i n , 
                         " w h a t s a p p " :   l e a d . w h a t s a p p , 
                         " c o m p a n y " :   l e a d . c o m p a n y , 
                         " p l a t f o r m " :   l e a d . p l a t f o r m , 
                         " s o u r c e " :   " s m a r t _ i m p o r t " , 
                         " s t a t u s " :   " a c t i v e " , 
                         " t e m p e r a t u r e " :   s t a t u s , 
                         " n o t e s " :   n o t e s , 
                 } 
 
                 #   S e t   f o l l o w - u p   d a t e 
                 i f   f o l l o w _ u p _ d a y s   >   0 : 
                         f o l l o w _ u p _ d a t e   =   d a t e t i m e . n o w ( )   +   t i m e d e l t a ( d a y s = f o l l o w _ u p _ d a y s ) 
                         l e a d _ d a t a [ " n e x t _ f o l l o w _ u p " ]   =   f o l l o w _ u p _ d a t e . d a t e ( ) . i s o f o r m a t ( ) 
 
                 #   R e m o v e   N o n e   v a l u e s 
                 l e a d _ d a t a   =   { k :   v   f o r   k ,   v   i n   l e a d _ d a t a . i t e m s ( )   i f   v   i s   n o t   N o n e } 
 
                 r e s u l t   =   d b . t a b l e ( " l e a d s " ) . i n s e r t ( l e a d _ d a t a ) . e x e c u t e ( ) 
 
                 r e t u r n   { " s u c c e s s " :   T r u e ,   " l e a d _ i d " :   r e s u l t . d a t a [ 0 ] [ " i d " ] } 
 
         e x c e p t   E x c e p t i o n   a s   e : 
                 r a i s e   H T T P E x c e p t i o n ( s t a t u s _ c o d e = 5 0 0 ,   d e t a i l = s t r ( e ) )  
 