import base64
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Dict, Any

import httpx


class GmailService:
    """Service for interacting with Gmail API."""

    BASE_URL = "https://gmail.googleapis.com/gmail/v1/users/me"

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {"Authorization": f"Bearer {access_token}"}

    async def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make authenticated request to Gmail API."""
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method,
                f"{self.BASE_URL}/{endpoint}",
                headers=self.headers,
                **kwargs,
            )
            response.raise_for_status()
            return response.json() if response.content else {}

    async def list_messages(
        self,
        max_results: int = 50,
        query: str | None = None,
        page_token: str | None = None,
    ) -> Dict[str, Any]:
        """List messages from inbox."""
        params: Dict[str, Any] = {"maxResults": max_results}
        if query:
            params["q"] = query
        if page_token:
            params["pageToken"] = page_token

        return await self._request("GET", "messages", params=params)

    async def get_message(self, message_id: str, format: str = "full") -> Dict[str, Any]:
        """Get a specific message by ID."""
        return await self._request("GET", f"messages/{message_id}", params={"format": format})

    async def send_message(
        self,
        to: str,
        subject: str,
        body: str,
        html: bool = False,
        cc: List[str] | None = None,
        bcc: List[str] | None = None,
        reply_to_message_id: str | None = None,
        thread_id: str | None = None,
    ) -> Dict[str, Any]:
        """Send an email."""
        if html:
            message = MIMEMultipart("alternative")
            message.attach(MIMEText(body, "html"))
        else:
            message = MIMEText(body)

        message["to"] = to
        message["subject"] = subject

        if cc:
            message["cc"] = ", ".join(cc)
        if bcc:
            message["bcc"] = ", ".join(bcc)
        if reply_to_message_id:
            message["In-Reply-To"] = reply_to_message_id
            message["References"] = reply_to_message_id

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

        body_data: Dict[str, Any] = {"raw": raw}
        if thread_id:
            body_data["threadId"] = thread_id

        return await self._request("POST", "messages/send", json=body_data)

    async def get_thread(self, thread_id: str) -> Dict[str, Any]:
        """Get a thread with all messages."""
        return await self._request("GET", f"threads/{thread_id}")

    async def list_labels(self) -> Dict[str, Any]:
        """List all labels."""
        return await self._request("GET", "labels")

    async def mark_as_read(self, message_id: str) -> Dict[str, Any]:
        """Mark a message as read."""
        return await self._request(
            "POST",
            f"messages/{message_id}/modify",
            json={"removeLabelIds": ["UNREAD"]},
        )

    @staticmethod
    def parse_message(message: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Gmail message into usable format."""
        headers = {h["name"].lower(): h["value"] for h in message.get("payload", {}).get("headers", [])}

        body_text = ""
        body_html = ""
        payload = message.get("payload", {})

        if "body" in payload and payload["body"].get("data"):
            body_text = base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="ignore")
        elif "parts" in payload:
            for part in payload["parts"]:
                mime_type = part.get("mimeType", "")
                if "body" in part and part["body"].get("data"):
                    decoded = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="ignore")
                    if mime_type == "text/plain":
                        body_text = decoded
                    elif mime_type == "text/html":
                        body_html = decoded

        from_header = headers.get("from", "")
        from_name = ""
        from_email = from_header
        if "<" in from_header:
            from_name = from_header.split("<")[0].strip().strip('"')
            from_email = from_header.split("<")[1].strip(">")

        return {
            "gmail_id": message.get("id"),
            "thread_id": message.get("threadId"),
            "subject": headers.get("subject", "(No Subject)"),
            "snippet": message.get("snippet", ""),
            "body_text": body_text,
            "body_html": body_html,
            "from_email": from_email,
            "from_name": from_name,
            "to_emails": [e.strip() for e in headers.get("to", "").split(",") if e.strip()],
            "labels": message.get("labelIds", []),
            "is_read": "UNREAD" not in message.get("labelIds", []),
            "is_sent": "SENT" in message.get("labelIds", []),
            "has_attachments": any(part.get("filename") for part in payload.get("parts", [])),
            "received_at": datetime.fromtimestamp(int(message.get("internalDate", 0)) / 1000),
        }

