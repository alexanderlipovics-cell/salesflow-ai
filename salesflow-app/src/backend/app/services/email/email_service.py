"""
╔════════════════════════════════════════════════════════════════════════════╗
║  EMAIL SERVICE - FELLO Email Integration                                   ║
║  Gmail OAuth, Outlook OAuth, IMAP/SMTP Support                             ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

import imaplib
import smtplib
import email
import email.utils
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import decode_header
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import logging
import base64
import json

from supabase import Client

logger = logging.getLogger(__name__)


class EmailService:
    """
    Email Service für FELLO - Email Integration.
    
    Unterstützt:
    - Gmail OAuth
    - Outlook OAuth
    - IMAP/SMTP (Standard Email-Accounts)
    - Automatisches Matching mit Kontakten
    """
    
    def __init__(self, db: Client):
        self.db = db
    
    # =========================================================================
    # CONNECTION METHODS
    # =========================================================================
    
    async def connect_gmail(
        self,
        user_id: str,
        oauth_token: str,
    ) -> Dict[str, Any]:
        """
        Verbindet Gmail-Account über OAuth.
        
        Args:
            user_id: User ID
            oauth_token: OAuth Access Token
            
        Returns:
            Dictionary mit Connection-Info
        """
        try:
            # OAuth Token in Datenbank speichern
            # TODO: Token verschlüsseln!
            
            # Test-Verbindung herstellen
            # Für Gmail OAuth würden wir die Gmail API nutzen
            # Hier vereinfacht für Demo
            
            connection_data = {
                "user_id": user_id,
                "provider": "gmail",
                "oauth_token": oauth_token,  # TODO: Encrypt!
                "connected_at": datetime.utcnow().isoformat(),
                "is_active": True,
            }
            
            # In email_connections Tabelle speichern
            result = self.db.table("email_connections").upsert({
                "user_id": user_id,
                "provider": "gmail",
                "oauth_token": oauth_token,
                "connected_at": datetime.utcnow().isoformat(),
                "is_active": True,
            }, on_conflict="user_id,provider").execute()
            
            if not result.data:
                raise Exception("Failed to save Gmail connection")
            
            logger.info(f"Gmail connected for user {user_id}")
            
            return {
                "success": True,
                "connection_id": result.data[0].get("id"),
                "provider": "gmail",
                "email": self._get_email_from_gmail_token(oauth_token),
            }
            
        except Exception as e:
            logger.error(f"Error connecting Gmail: {e}")
            raise
    
    async def connect_outlook(
        self,
        user_id: str,
        oauth_token: str,
    ) -> Dict[str, Any]:
        """
        Verbindet Outlook-Account über OAuth.
        
        Args:
            user_id: User ID
            oauth_token: OAuth Access Token
            
        Returns:
            Dictionary mit Connection-Info
        """
        try:
            connection_data = {
                "user_id": user_id,
                "provider": "outlook",
                "oauth_token": oauth_token,  # TODO: Encrypt!
                "connected_at": datetime.utcnow().isoformat(),
                "is_active": True,
            }
            
            result = self.db.table("email_connections").upsert({
                "user_id": user_id,
                "provider": "outlook",
                "oauth_token": oauth_token,
                "connected_at": datetime.utcnow().isoformat(),
                "is_active": True,
            }, on_conflict="user_id,provider").execute()
            
            if not result.data:
                raise Exception("Failed to save Outlook connection")
            
            logger.info(f"Outlook connected for user {user_id}")
            
            return {
                "success": True,
                "connection_id": result.data[0].get("id"),
                "provider": "outlook",
                "email": self._get_email_from_outlook_token(oauth_token),
            }
            
        except Exception as e:
            logger.error(f"Error connecting Outlook: {e}")
            raise
    
    async def connect_imap(
        self,
        user_id: str,
        host: str,
        email: str,
        password: str,
        port: int = 993,
        use_ssl: bool = True,
    ) -> Dict[str, Any]:
        """
        Verbindet IMAP/SMTP-Account.
        
        Args:
            user_id: User ID
            host: IMAP Server (z.B. imap.gmail.com)
            email: Email-Adresse
            password: Passwort (TODO: Encrypt!)
            port: IMAP Port (default: 993)
            use_ssl: SSL verwenden (default: True)
            
        Returns:
            Dictionary mit Connection-Info
        """
        try:
            # Test-Verbindung herstellen
            imap = None
            try:
                if use_ssl:
                    imap = imaplib.IMAP4_SSL(host, port)
                else:
                    imap = imaplib.IMAP4(host, port)
                
                imap.login(email, password)
                imap.logout()
                
            except Exception as e:
                logger.error(f"IMAP connection test failed: {e}")
                raise Exception(f"IMAP connection failed: {str(e)}")
            
            # SMTP Host bestimmen (aus Host ableiten oder separat)
            smtp_host = self._get_smtp_host(host)
            
            # Verbindungsdaten speichern
            connection_data = {
                "user_id": user_id,
                "provider": "imap",
                "email": email,
                "imap_host": host,
                "imap_port": port,
                "imap_use_ssl": use_ssl,
                "smtp_host": smtp_host,
                "smtp_port": 587 if use_ssl else 25,
                "password": password,  # TODO: Encrypt!
                "connected_at": datetime.utcnow().isoformat(),
                "is_active": True,
            }
            
            result = self.db.table("email_connections").insert(connection_data).execute()
            
            if not result.data:
                raise Exception("Failed to save IMAP connection")
            
            logger.info(f"IMAP connected for user {user_id}: {email}")
            
            return {
                "success": True,
                "connection_id": result.data[0].get("id"),
                "provider": "imap",
                "email": email,
            }
            
        except Exception as e:
            logger.error(f"Error connecting IMAP: {e}")
            raise
    
    # =========================================================================
    # EMAIL FETCHING
    # =========================================================================
    
    async def fetch_emails(
        self,
        user_id: str,
        since: Optional[datetime] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Holt Emails vom verbundenen Account.
        
        Args:
            user_id: User ID
            since: Optional - Emails seit diesem Datum
            limit: Maximale Anzahl Emails
            
        Returns:
            Liste von Email-Objekten
        """
        try:
            # Verbindung laden
            connection_result = self.db.table("email_connections").select(
                "*"
            ).eq("user_id", user_id).eq("is_active", True).order(
                "connected_at", desc=True
            ).limit(1).execute()
            
            if not connection_result.data:
                raise Exception("No active email connection found")
            
            connection = connection_result.data[0]
            provider = connection.get("provider")
            
            emails = []
            
            if provider == "gmail":
                emails = await self._fetch_gmail_emails(connection, since, limit)
            elif provider == "outlook":
                emails = await self._fetch_outlook_emails(connection, since, limit)
            elif provider == "imap":
                emails = await self._fetch_imap_emails(connection, since, limit)
            else:
                raise Exception(f"Unsupported provider: {provider}")
            
            # Automatisches Matching mit Kontakten
            for email_data in emails:
                matched_contact = await self.match_email_to_contact(
                    email_data.get("from_email")
                )
                if matched_contact:
                    email_data["contact"] = matched_contact
            
            return emails
            
        except Exception as e:
            logger.error(f"Error fetching emails: {user_id}: {e}")
            raise
    
    async def _fetch_imap_emails(
        self,
        connection: Dict[str, Any],
        since: Optional[datetime] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Holt Emails über IMAP."""
        emails = []
        
        try:
            host = connection.get("imap_host")
            port = connection.get("imap_port", 993)
            email_addr = connection.get("email")
            password = connection.get("password")
            use_ssl = connection.get("imap_use_ssl", True)
            
            # Verbindung herstellen
            if use_ssl:
                imap = imaplib.IMAP4_SSL(host, port)
            else:
                imap = imaplib.IMAP4(host, port)
            
            imap.login(email_addr, password)
            imap.select("INBOX")
            
            # Search Criteria
            search_criteria = "ALL"
            if since:
                since_str = since.strftime("%d-%b-%Y")
                search_criteria = f'(SINCE "{since_str}")'
            
            # Emails suchen
            status, messages = imap.search(None, search_criteria)
            
            if status != "OK":
                imap.logout()
                return emails
            
            email_ids = messages[0].split()
            email_ids = email_ids[-limit:] if len(email_ids) > limit else email_ids
            
            # Emails holen
            for email_id in reversed(email_ids):
                try:
                    status, msg_data = imap.fetch(email_id, "(RFC822)")
                    
                    if status != "OK":
                        continue
                    
                    # Email parsen
                    email_body = msg_data[0][1]
                    email_message = email.message_from_bytes(email_body)
                    
                    # Email-Daten extrahieren
                    email_data = self._parse_email_message(email_message)
                    emails.append(email_data)
                    
                except Exception as e:
                    logger.warning(f"Error parsing email {email_id}: {e}")
                    continue
            
            imap.logout()
            
        except Exception as e:
            logger.error(f"Error fetching IMAP emails: {e}")
            raise
        
        return emails
    
    async def _fetch_gmail_emails(
        self,
        connection: Dict[str, Any],
        since: Optional[datetime] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Holt Emails über Gmail API (OAuth)."""
        # TODO: Implementiere Gmail API Integration
        # Für jetzt: Fallback auf IMAP wenn möglich
        logger.warning("Gmail API integration not yet implemented, using placeholder")
        return []
    
    async def _fetch_outlook_emails(
        self,
        connection: Dict[str, Any],
        since: Optional[datetime] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Holt Emails über Outlook API (OAuth)."""
        # TODO: Implementiere Outlook API Integration
        logger.warning("Outlook API integration not yet implemented, using placeholder")
        return []
    
    # =========================================================================
    # EMAIL SENDING
    # =========================================================================
    
    async def send_email(
        self,
        user_id: str,
        to: str,
        subject: str,
        body: str,
        html: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sendet eine Email.
        
        Args:
            user_id: User ID
            to: Empfänger Email-Adresse
            subject: Betreff
            body: Text-Body
            html: Optional - HTML-Body
            
        Returns:
            Dictionary mit Send-Status
        """
        try:
            # Verbindung laden
            connection_result = self.db.table("email_connections").select(
                "*"
            ).eq("user_id", user_id).eq("is_active", True).order(
                "connected_at", desc=True
            ).limit(1).execute()
            
            if not connection_result.data:
                raise Exception("No active email connection found")
            
            connection = connection_result.data[0]
            provider = connection.get("provider")
            
            if provider == "gmail":
                return await self._send_gmail_email(connection, to, subject, body, html)
            elif provider == "outlook":
                return await self._send_outlook_email(connection, to, subject, body, html)
            elif provider == "imap":
                return await self._send_imap_email(connection, to, subject, body, html)
            else:
                raise Exception(f"Unsupported provider: {provider}")
                
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            raise
    
    async def _send_imap_email(
        self,
        connection: Dict[str, Any],
        to: str,
        subject: str,
        body: str,
        html: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Sendet Email über SMTP."""
        try:
            smtp_host = connection.get("smtp_host") or self._get_smtp_host(
                connection.get("imap_host")
            )
            smtp_port = connection.get("smtp_port", 587)
            email_addr = connection.get("email")
            password = connection.get("password")
            use_ssl = connection.get("imap_use_ssl", True)
            
            # Email erstellen
            msg = MIMEMultipart("alternative")
            msg["From"] = email_addr
            msg["To"] = to
            msg["Subject"] = subject
            
            # Body hinzufügen
            if html:
                msg.attach(MIMEText(html, "html"))
            else:
                msg.attach(MIMEText(body, "plain"))
            
            # SMTP Verbindung
            if use_ssl:
                smtp = smtplib.SMTP_SSL(smtp_host, smtp_port)
            else:
                smtp = smtplib.SMTP(smtp_host, smtp_port)
                smtp.starttls()
            
            smtp.login(email_addr, password)
            smtp.send_message(msg)
            smtp.quit()
            
            # Email in Datenbank loggen
            await self._log_email_sent(
                connection.get("user_id"),
                email_addr,
                to,
                subject,
                body,
            )
            
            return {
                "success": True,
                "message_id": f"<{datetime.utcnow().timestamp()}@{smtp_host}>",
            }
            
        except Exception as e:
            logger.error(f"Error sending IMAP email: {e}")
            raise
    
    async def _send_gmail_email(
        self,
        connection: Dict[str, Any],
        to: str,
        subject: str,
        body: str,
        html: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Sendet Email über Gmail API."""
        # TODO: Implementiere Gmail API
        logger.warning("Gmail API send not yet implemented")
        raise NotImplementedError("Gmail API send not yet implemented")
    
    async def _send_outlook_email(
        self,
        connection: Dict[str, Any],
        to: str,
        subject: str,
        body: str,
        html: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Sendet Email über Outlook API."""
        # TODO: Implementiere Outlook API
        logger.warning("Outlook API send not yet implemented")
        raise NotImplementedError("Outlook API send not yet implemented")
    
    # =========================================================================
    # CONTACT MATCHING
    # =========================================================================
    
    async def match_email_to_contact(
        self,
        email_address: str,
        user_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Matcht Email-Adresse mit Kontakt.
        
        Args:
            email_address: Email-Adresse
            user_id: Optional - User ID für Filterung
            
        Returns:
            Kontakt-Objekt oder None
        """
        try:
            if not email_address:
                return None
            
            # Normalisiere Email (lowercase, trim)
            email_normalized = email_address.lower().strip()
            
            # Suche in leads/contacts Tabelle
            query = self.db.table("leads").select(
                "id, name, email, company, phone, status, lead_score"
            ).ilike("email", email_normalized)
            
            if user_id:
                query = query.eq("user_id", user_id)
            
            result = query.limit(1).execute()
            
            if result.data:
                return {
                    "id": result.data[0].get("id"),
                    "name": result.data[0].get("name"),
                    "email": result.data[0].get("email"),
                    "company": result.data[0].get("company"),
                    "phone": result.data[0].get("phone"),
                    "status": result.data[0].get("status"),
                    "lead_score": result.data[0].get("lead_score"),
                    "type": "lead",
                }
            
            # Falls nicht in leads, in contacts suchen (falls separate Tabelle existiert)
            # TODO: Prüfe ob contacts Tabelle existiert
            
            return None
            
        except Exception as e:
            logger.warning(f"Error matching email to contact: {e}")
            return None
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def _parse_email_message(self, email_message: email.message.Message) -> Dict[str, Any]:
        """Parst Email-Message Objekt."""
        try:
            # Header extrahieren
            from_header = email_message.get("From", "")
            to_header = email_message.get("To", "")
            subject_header = email_message.get("Subject", "")
            date_header = email_message.get("Date", "")
            
            # From Email extrahieren
            from_email = self._extract_email_address(from_header)
            from_name = self._extract_name_from_header(from_header)
            
            # Subject dekodieren
            subject = self._decode_header(subject_header)
            
            # Date parsen
            date_parsed = None
            try:
                date_tuple = email.utils.parsedate_tz(date_header)
                if date_tuple:
                    date_parsed = datetime.fromtimestamp(
                        email.utils.mktime_tz(date_tuple)
                    ).isoformat()
            except:
                pass
            
            # Body extrahieren
            body = ""
            html_body = None
            
            if email_message.is_multipart():
                for part in email_message.walk():
                    content_type = part.get_content_type()
                    content_disposition = str(part.get("Content-Disposition", ""))
                    
                    if "attachment" not in content_disposition:
                        if content_type == "text/plain":
                            body = part.get_payload(decode=True).decode("utf-8", errors="ignore")
                        elif content_type == "text/html":
                            html_body = part.get_payload(decode=True).decode("utf-8", errors="ignore")
            else:
                body = email_message.get_payload(decode=True).decode("utf-8", errors="ignore")
            
            return {
                "message_id": email_message.get("Message-ID", ""),
                "from_email": from_email,
                "from_name": from_name,
                "to": to_header,
                "subject": subject,
                "body": body,
                "html_body": html_body,
                "date": date_parsed or datetime.utcnow().isoformat(),
                "attachments": self._extract_attachments(email_message),
            }
            
        except Exception as e:
            logger.error(f"Error parsing email message: {e}")
            return {}
    
    def _extract_email_address(self, header: str) -> str:
        """Extrahiert Email-Adresse aus Header."""
        try:
            if "<" in header and ">" in header:
                start = header.index("<") + 1
                end = header.index(">")
                return header[start:end].strip()
            return header.strip()
        except:
            return header.strip()
    
    def _extract_name_from_header(self, header: str) -> Optional[str]:
        """Extrahiert Name aus Email-Header."""
        try:
            if "<" in header:
                name_part = header[:header.index("<")].strip()
                # Entferne Quotes
                name_part = name_part.strip('"').strip("'")
                if name_part:
                    return name_part
            return None
        except:
            return None
    
    def _decode_header(self, header: str) -> str:
        """Dekodiert Email-Header."""
        try:
            decoded_parts = decode_header(header)
            decoded_string = ""
            for part, encoding in decoded_parts:
                if isinstance(part, bytes):
                    if encoding:
                        decoded_string += part.decode(encoding)
                    else:
                        decoded_string += part.decode("utf-8", errors="ignore")
                else:
                    decoded_string += part
            return decoded_string
        except:
            return header
    
    def _extract_attachments(self, email_message: email.message.Message) -> List[Dict[str, Any]]:
        """Extrahiert Attachments aus Email."""
        attachments = []
        
        try:
            if email_message.is_multipart():
                for part in email_message.walk():
                    content_disposition = str(part.get("Content-Disposition", ""))
                    if "attachment" in content_disposition:
                        filename = part.get_filename()
                        if filename:
                            attachments.append({
                                "filename": self._decode_header(filename),
                                "content_type": part.get_content_type(),
                                "size": len(part.get_payload(decode=True)),
                            })
        except Exception as e:
            logger.warning(f"Error extracting attachments: {e}")
        
        return attachments
    
    def _get_smtp_host(self, imap_host: str) -> str:
        """Bestimmt SMTP Host aus IMAP Host."""
        host_map = {
            "imap.gmail.com": "smtp.gmail.com",
            "imap.outlook.com": "smtp-mail.outlook.com",
            "imap.office365.com": "smtp.office365.com",
        }
        
        for imap, smtp in host_map.items():
            if imap in imap_host.lower():
                return smtp
        
        # Fallback: smtp. + Domain
        if "imap." in imap_host:
            return imap_host.replace("imap.", "smtp.")
        
        return f"smtp.{imap_host}"
    
    def _get_email_from_gmail_token(self, token: str) -> str:
        """Extrahiert Email aus Gmail OAuth Token."""
        # TODO: Implementiere Token-Decoding
        return "user@gmail.com"  # Placeholder
    
    def _get_email_from_outlook_token(self, token: str) -> str:
        """Extrahiert Email aus Outlook OAuth Token."""
        # TODO: Implementiere Token-Decoding
        return "user@outlook.com"  # Placeholder
    
    async def _log_email_sent(
        self,
        user_id: str,
        from_email: str,
        to_email: str,
        subject: str,
        body: str,
    ) -> None:
        """Loggt gesendete Email in Datenbank."""
        try:
            self.db.table("email_log").insert({
                "user_id": user_id,
                "from_email": from_email,
                "to_email": to_email,
                "subject": subject,
                "body_preview": body[:200],
                "sent_at": datetime.utcnow().isoformat(),
            }).execute()
        except Exception as e:
            logger.warning(f"Error logging email: {e}")

