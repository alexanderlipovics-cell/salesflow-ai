"""
╔════════════════════════════════════════════════════════════════════════════╗
║  WHATSAPP SERVICE                                                          ║
║  WhatsApp Integration via wa.me Links (Workaround)                        ║
║  + WhatsApp Business API (für später)                                     ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

import urllib.parse
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class WhatsAppService:
    """
    Service für WhatsApp Integration.
    
    JETZT: wa.me Link Generator (Workaround)
    SPÄTER: WhatsApp Business API Integration
    """
    
    def __init__(self, supabase=None):
        """
        Initialisiert den WhatsApp Service.
        
        Args:
            supabase: Optional Supabase Client (für später: Webhook-Logging)
        """
        self.supabase = supabase
    
    def generate_whatsapp_link(
        self,
        phone: str,
        message: str = "",
    ) -> str:
        """
        Generiert einen wa.me Link mit vorausgefüllter Nachricht.
        
        Args:
            phone: Telefonnummer (mit oder ohne +, z.B. "+491234567890" oder "491234567890")
            message: Optional: Vorausgefüllte Nachricht
            
        Returns:
            wa.me Link (z.B. "https://wa.me/491234567890?text=Hallo")
        
        Example:
            >>> service = WhatsAppService()
            >>> link = service.generate_whatsapp_link("+491234567890", "Hallo Max!")
            >>> print(link)
            https://wa.me/491234567890?text=Hallo%20Max%21
        """
        # Nummer normalisieren (entferne +, Leerzeichen, Bindestriche)
        clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        
        # Stelle sicher, dass nur Zahlen übrig bleiben
        clean_phone = ''.join(c for c in clean_phone if c.isdigit())
        
        if not clean_phone:
            raise ValueError("Ungültige Telefonnummer")
        
        # Nachricht URL-encoden
        if message:
            encoded_message = urllib.parse.quote(message)
            return f"https://wa.me/{clean_phone}?text={encoded_message}"
        else:
            return f"https://wa.me/{clean_phone}"
    
    def normalize_phone_number(self, phone: str) -> str:
        """
        Normalisiert eine Telefonnummer zu E.164 Format (ohne +).
        
        Args:
            phone: Telefonnummer in beliebigem Format
            
        Returns:
            Normalisierte Nummer (z.B. "491234567890")
        """
        # Entferne alles außer Zahlen
        clean = ''.join(c for c in phone if c.isdigit())
        
        # Wenn mit 0 beginnt (deutsche Nummer), ersetze durch 49
        if clean.startswith('0'):
            clean = '49' + clean[1:]
        # Wenn bereits mit 49 beginnt, behalte es
        elif clean.startswith('49'):
            pass
        # Sonst füge 49 hinzu (falls deutsche Nummer)
        else:
            # Annahme: deutsche Nummer, füge 49 hinzu
            # In Production: Bessere Logik für internationale Nummern
            if len(clean) >= 10:
                clean = '49' + clean
        
        return clean
    
    # ═══════════════════════════════════════════════════════════════════════════
    # FÜR SPÄTER: WhatsApp Business API
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def send_message(
        self,
        to_number: str,
        message: str,
        user_id: Optional[str] = None,
        lead_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sendet eine WhatsApp-Nachricht via WhatsApp Business API.
        
        TODO: Implementierung für WhatsApp Business API
        
        Args:
            to_number: Empfänger-Telefonnummer
            message: Nachrichtentext
            user_id: Optional User ID
            lead_id: Optional Lead ID
            
        Returns:
            Dict mit success, message_id, etc.
        """
        # TODO: WhatsApp Business API Integration
        logger.warning("WhatsApp Business API noch nicht implementiert")
        return {
            "success": False,
            "error": "WhatsApp Business API noch nicht implementiert. Nutze wa.me Links.",
        }
    
    async def handle_webhook(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verarbeitet eingehende WhatsApp-Nachrichten via Webhook.
        
        TODO: Implementierung für WhatsApp Business API Webhook
        
        Args:
            data: Webhook-Daten von WhatsApp Business API
            
        Returns:
            Dict mit Verarbeitungsstatus
        """
        # TODO: Webhook-Handler für eingehende Nachrichten
        logger.warning("WhatsApp Webhook noch nicht implementiert")
        return {
            "success": False,
            "error": "WhatsApp Webhook noch nicht implementiert",
        }
    
    async def send_template_message(
        self,
        to_number: str,
        template_name: str,
        template_params: Dict[str, str],
        user_id: Optional[str] = None,
        lead_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sendet eine WhatsApp Template-Nachricht.
        
        TODO: Implementierung für WhatsApp Business API Templates
        
        Args:
            to_number: Empfänger-Telefonnummer
            template_name: Template-Name (z.B. "hello_world")
            template_params: Template-Parameter
            user_id: Optional User ID
            lead_id: Optional Lead ID
            
        Returns:
            Dict mit success, message_id, etc.
        """
        # TODO: Template-Message via WhatsApp Business API
        logger.warning("WhatsApp Templates noch nicht implementiert")
        return {
            "success": False,
            "error": "WhatsApp Templates noch nicht implementiert",
        }

