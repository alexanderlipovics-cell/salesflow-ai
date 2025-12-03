"""
GPT Function Calls
Registers functions that GPT can call autonomously
"""

from typing import Dict, List
import os
from openai import OpenAI
import json
import uuid
from datetime import datetime

from ..database import get_db


class GPTFunctionsService:
    """GPT Function Calling Service"""
    
    # Function Definitions
    FUNCTIONS = [
        {
            "name": "send_email",
            "description": "Versendet eine E-Mail an einen Lead",
            "parameters": {
                "type": "object",
                "properties": {
                    "to": {
                        "type": "string",
                        "description": "E-Mail-Adresse des Empfängers"
                    },
                    "subject": {
                        "type": "string",
                        "description": "Betreff der E-Mail"
                    },
                    "body": {
                        "type": "string",
                        "description": "HTML-Body der E-Mail"
                    }
                },
                "required": ["to", "subject", "body"]
            }
        },
        {
            "name": "send_whatsapp",
            "description": "Versendet eine WhatsApp-Nachricht an einen Lead",
            "parameters": {
                "type": "object",
                "properties": {
                    "phone": {
                        "type": "string",
                        "description": "Telefonnummer im internationalen Format (+491234567890)"
                    },
                    "message": {
                        "type": "string",
                        "description": "Text der WhatsApp-Nachricht"
                    }
                },
                "required": ["phone", "message"]
            }
        },
        {
            "name": "create_reminder",
            "description": "Erstellt einen Follow-up Reminder",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_id": {
                        "type": "string",
                        "description": "Lead UUID"
                    },
                    "reminder_date": {
                        "type": "string",
                        "description": "Datum im ISO Format (YYYY-MM-DD)"
                    },
                    "note": {
                        "type": "string",
                        "description": "Notiz für den Reminder"
                    }
                },
                "required": ["lead_id", "reminder_date", "note"]
            }
        }
    ]
    
    def __init__(self):
        self._client = None
    
    @property
    def client(self):
        """Lazy initialization of OpenAI client"""
        if self._client is None:
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                raise ValueError("OPENAI_API_KEY nicht gesetzt")
            self._client = OpenAI(api_key=api_key)
        return self._client
    
    async def chat_with_functions(
        self,
        messages: List[Dict]
    ) -> Dict:
        """
        Chat with GPT using function calling.
        GPT can autonomously call functions when needed.
        """
        
        response = self.client.chat.completions.create(
            model="gpt-4-0613",
            messages=messages,
            functions=self.FUNCTIONS,
            function_call="auto"
        )
        
        message = response.choices[0].message
        
        # Check if GPT wants to call a function
        if message.function_call:
            function_name = message.function_call.name
            arguments = json.loads(message.function_call.arguments)
            
            # Execute the function
            result = await self._execute_function(function_name, arguments)
            
            # Add function result to conversation
            messages.append({
                "role": "assistant",
                "content": None,
                "function_call": {
                    "name": function_name,
                    "arguments": message.function_call.arguments
                }
            })
            
            messages.append({
                "role": "function",
                "name": function_name,
                "content": json.dumps(result)
            })
            
            # Get GPT's response after function execution
            second_response = self.client.chat.completions.create(
                model="gpt-4-0613",
                messages=messages
            )
            
            return {
                "message": second_response.choices[0].message.content,
                "function_called": function_name,
                "function_result": result
            }
        else:
            # Normal response without function call
            return {
                "message": message.content,
                "function_called": None
            }
    
    async def _execute_function(self, function_name: str, arguments: Dict) -> Dict:
        """Execute a GPT function call"""
        
        if function_name == "send_email":
            # Import email service
            from .email_service import email_service
            return await email_service.send_email(
                to=arguments['to'],
                subject=arguments['subject'],
                body=arguments['body']
            )
        
        elif function_name == "send_whatsapp":
            # Import WhatsApp service
            from .whatsapp_service import whatsapp_service
            return await whatsapp_service.send_message(
                to=arguments['phone'],
                message=arguments['message']
            )
        
        elif function_name == "create_reminder":
            # Create reminder in database
            async with get_db() as db:
                reminder_id = str(uuid.uuid4())
                
                await db.execute(
                    """
                    INSERT INTO activities 
                    (id, lead_id, type, description, scheduled_at, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    reminder_id,
                    arguments['lead_id'],
                    'reminder',
                    arguments['note'],
                    arguments['reminder_date'],
                    datetime.now()
                )
                
                await db.commit()
                
                return {"success": True, "reminder_id": reminder_id}
        
        else:
            return {"error": f"Unknown function: {function_name}"}


# Initialize service
gpt_functions_service = GPTFunctionsService()

