SALES_AGENT_TOOLS = [
    # ═══════════════════════════════════════════════════════════
    # DATABASE QUERIES
    # ═══════════════════════════════════════════════════════════
    {
        "type": "function",
        "function": {
            "name": "query_leads",
            "description": "Suche und filtere Leads aus der Datenbank. Nutze für: Lead-Listen, inaktive Leads, Leads nach Status, Location-basierte Suchen.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"],
                        "description": "Filter nach Lead-Status"
                    },
                    "location": {
                        "type": "string",
                        "description": "Stadt, Region oder Land für Location-Filter"
                    },
                    "inactive_days": {
                        "type": "integer",
                        "description": "Leads die seit X Tagen keinen Kontakt hatten"
                    },
                    "company": {
                        "type": "string",
                        "description": "Filter nach Firmenname"
                    },
                    "tag": {
                        "type": "string",
                        "description": "Filter nach Tag/Label"
                    },
                    "hot_only": {
                        "type": "boolean",
                        "description": "Nur Hot Leads (Score > 70)"
                    },
                    "limit": {
                        "type": "integer",
                        "default": 10,
                        "description": "Maximale Anzahl Ergebnisse"
                    },
                    "order_by": {
                        "type": "string",
                        "enum": ["score", "last_contact", "created_at", "value"],
                        "description": "Sortierung"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_lead_details",
            "description": "Hole alle Details zu einem spezifischen Lead inkl. Interaktionshistorie, Tasks, Notizen.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_id": {
                        "type": "string",
                        "description": "Die Lead ID"
                    },
                    "lead_name": {
                        "type": "string",
                        "description": "Alternativ: Name des Leads zur Suche"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_follow_ups",
            "description": "Hole anstehende Follow-ups. Nutze für: heutige Tasks, überfällige Follow-ups, geplante Aktivitäten.",
            "parameters": {
                "type": "object",
                "properties": {
                    "timeframe": {
                        "type": "string",
                        "enum": ["today", "tomorrow", "this_week", "overdue", "all"],
                        "default": "today"
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["high", "medium", "low", "all"],
                        "default": "all"
                    },
                    "limit": {
                        "type": "integer",
                        "default": 10
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_followup_suggestions",
            "description": "Holt die fälligen Follow-up Vorschläge. Nutze dies wenn der User nach Follow-ups, Nachfassen, fälligen Aufgaben oder 'was muss ich heute tun' fragt.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Anzahl der Vorschläge (default 10)",
                        "default": 10
                    },
                    "status": {
                        "type": "string",
                        "enum": ["pending", "sent", "skipped", "snoozed"],
                        "description": "Filter nach Status (default: pending)"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "start_followup_flow",
            "description": "Startet einen Follow-up Flow für einen Lead. Flows: COLD_NO_REPLY, INTERESTED_LATER",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_id": {
                        "type": "string",
                        "description": "ID des Leads"
                    },
                    "flow": {
                        "type": "string",
                        "enum": ["COLD_NO_REPLY", "INTERESTED_LATER"],
                        "description": "Welcher Flow: COLD_NO_REPLY (keine Antwort) oder INTERESTED_LATER (später interessiert)"
                    }
                },
                "required": ["lead_id", "flow"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_followup_stats",
            "description": "Holt Statistiken über Follow-ups: wie viele pending, wie viele diese Woche gesendet, etc.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "bulk_create_followups",
            "description": "Erstellt Follow-ups für alle oder gefilterte Leads auf einmal. Nutze dies wenn der User 'alle Leads ins Follow-up' sagt.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status_filter": {
                        "type": "string",
                        "description": "Optional: Nur Leads mit diesem Status (z.B. 'NEW', 'Warmer Lead'). Leer = alle.",
                        "default": ""
                    },
                    "days_until_due": {
                        "type": "integer",
                        "description": "In wie vielen Tagen ist das Follow-up fällig",
                        "default": 1
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["high", "medium", "low"],
                        "default": "medium"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_performance_stats",
            "description": "Hole Performance-Statistiken des Users. Nutze für: Wie lief mein Tag/Woche/Monat, Conversion Rates, Aktivitäten.",
            "parameters": {
                "type": "object",
                "properties": {
                    "period": {
                        "type": "string",
                        "enum": ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "this_quarter", "this_year"],
                        "default": "this_month"
                    },
                    "metrics": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["calls", "meetings", "proposals", "deals_won", "deals_lost", "revenue", "conversion_rate", "avg_deal_size", "activities"]
                        },
                        "description": "Welche Metriken zurückgeben"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_commission_status",
            "description": "Hole Provisions-Status und Ziel-Fortschritt.",
            "parameters": {
                "type": "object",
                "properties": {
                    "period": {
                        "type": "string",
                        "enum": ["this_month", "last_month", "this_quarter", "this_year"],
                        "default": "this_month"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_churn_risks",
            "description": "Hole Leads/Kunden mit Abwanderungsrisiko.",
            "parameters": {
                "type": "object",
                "properties": {
                    "risk_level": {
                        "type": "string",
                        "enum": ["high", "medium", "all"],
                        "default": "all"
                    },
                    "limit": {
                        "type": "integer",
                        "default": 5
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_objection_scripts",
            "description": "Hole Einwandbehandlungs-Skripte aus der Bibliothek.",
            "parameters": {
                "type": "object",
                "properties": {
                    "objection_type": {
                        "type": "string",
                        "description": "Art des Einwands, z.B. 'zu teuer', 'keine Zeit', 'muss überlegen'"
                    },
                    "category": {
                        "type": "string",
                        "enum": ["price", "time", "trust", "need", "authority", "competitor"],
                        "description": "Kategorie des Einwands"
                    },
                    "limit": {
                        "type": "integer",
                        "default": 3
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_calendar_events",
            "description": "Hole Termine aus dem Kalender.",
            "parameters": {
                "type": "object",
                "properties": {
                    "timeframe": {
                        "type": "string",
                        "enum": ["today", "tomorrow", "this_week", "next_week"],
                        "default": "today"
                    }
                }
            }
        }
    },
    # ═══════════════════════════════════════════════════════════
    # EXTERNAL DATA
    # ═══════════════════════════════════════════════════════════
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Suche im Internet nach Personen, Firmen, LinkedIn Profilen, Instagram Accounts, MLM Leadern. IMMER verwenden wenn User nach Kontakten/Leads im Internet fragt.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Suchbegriff z.B. 'MLM Leader Instagram Deutschland'"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_nearby_places",
            "description": "Suche Orte in der Nähe (Cafés, Restaurants, Co-Working, etc.). Für wenn User zu früh ist oder Leads in der Nähe sucht.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "Standort (Adresse oder Stadt)"
                    },
                    "latitude": {
                        "type": "number",
                        "description": "GPS Latitude (falls bekannt)"
                    },
                    "longitude": {
                        "type": "number",
                        "description": "GPS Longitude (falls bekannt)"
                    },
                    "type": {
                        "type": "string",
                        "enum": ["cafe", "restaurant", "coworking", "hotel", "any"],
                        "default": "cafe"
                    },
                    "radius_meters": {
                        "type": "integer",
                        "default": 1000
                    }
                },
                "required": ["location"]
            }
        }
    },
    # ═══════════════════════════════════════════════════════════
    # CONTENT GENERATION
    # ═══════════════════════════════════════════════════════════
    {
        "type": "function",
        "function": {
            "name": "write_message",
            "description": "Schreibe eine Nachricht für einen Lead. Gibt Copy-Paste fertigen Text zurück.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_id": {
                        "type": "string",
                        "description": "Lead ID für Kontext"
                    },
                    "lead_name": {
                        "type": "string",
                        "description": "Name des Leads"
                    },
                    "message_type": {
                        "type": "string",
                        "enum": ["followup", "reactivation", "delay", "cold_outreach", "after_meeting", "proposal", "closing", "thank_you"],
                        "description": "Art der Nachricht"
                    },
                    "channel": {
                        "type": "string",
                        "enum": ["whatsapp", "email", "linkedin", "instagram", "sms"],
                        "description": "Kanal (beeinflusst Länge und Stil)"
                    },
                    "context": {
                        "type": "string",
                        "description": "Zusätzlicher Kontext (z.B. Verspätungsgrund, letztes Gespräch)"
                    },
                    "tone": {
                        "type": "string",
                        "enum": ["formal", "casual", "friendly", "urgent"],
                        "default": "friendly"
                    }
                },
                "required": ["message_type", "channel"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "handle_objection",
            "description": "Generiere eine Antwort auf einen spezifischen Einwand im Kontext eines Leads.",
            "parameters": {
                "type": "object",
                "properties": {
                    "objection": {
                        "type": "string",
                        "description": "Der Einwand des Kunden"
                    },
                    "lead_id": {
                        "type": "string",
                        "description": "Lead ID für Kontext"
                    },
                    "product": {
                        "type": "string",
                        "description": "Produkt/Service um den es geht"
                    },
                    "previous_context": {
                        "type": "string",
                        "description": "Was wurde vorher besprochen"
                    }
                },
                "required": ["objection"]
            }
        }
    },
    # ═══════════════════════════════════════════════════════════
    # ACTIONS
    # ═══════════════════════════════════════════════════════════
    {
        "type": "function",
        "function": {
            "name": "create_lead",
            "description": "Erstellt einen neuen Lead. NUR name ist required - erstelle sofort! Unterstützt auch Social Media Handles (Instagram, Facebook, LinkedIn, WhatsApp).",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Name des Leads"},
                    "phone": {"type": "string", "description": "Telefonnummer (optional)"},
                    "email": {"type": "string", "description": "Email (optional)"},
                    "instagram": {"type": "string", "description": "Instagram Handle (ohne @) oder URL (optional)"},
                    "facebook": {"type": "string", "description": "Facebook URL oder Username (optional)"},
                    "linkedin": {"type": "string", "description": "LinkedIn URL oder Username (optional)"},
                    "whatsapp": {"type": "string", "description": "WhatsApp Telefonnummer mit Ländercode, z.B. +436641234567 (optional)"},
                    "notes": {"type": "string", "description": "Notizen (optional)"}
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_follow_up",
            "description": "Plant ein Follow-up. Erstelle sofort mit verfügbaren Infos. WICHTIG: due_date sollte IMMER relativ sein wie 'in 3 days', 'morgen', 'in 1 week'. NIEMALS historische Daten aus Chat-Verläufen verwenden! Wenn bereits ein Follow-up für diesen Lead existiert, wird ein Fehler zurückgegeben - verwende dann 'update_follow_up'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_name": {"type": "string", "description": "Name des Leads"},
                    "due_date": {
                        "type": "string", 
                        "description": "Wann das Follow-up fällig ist. IMMER relative Zeitangaben verwenden: 'tomorrow', 'morgen', 'in 3 days', 'in 3 Tagen', 'in 1 week', 'in 1 Woche'. NIEMALS historische Daten aus Chat-Verläufen (z.B. '2025-11-25') verwenden - diese zeigen wann die Konversation stattfand, nicht wann das Follow-up sein soll!"
                    },
                    "channel": {"type": "string", "enum": ["whatsapp", "email", "call"], "default": "whatsapp"},
                    "message": {"type": "string", "description": "Notiz zum Follow-up"}
                },
                "required": ["lead_name", "due_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_follow_up",
            "description": "Aktualisiert ein bestehendes pending Follow-up für einen Lead (ändert Datum, Nachricht, Titel oder Kanal). Wenn kein Follow-up existiert, wird ein Fehler zurückgegeben - verwende dann 'create_follow_up'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_name": {"type": "string", "description": "Name des Leads"},
                    "new_date": {
                        "type": "string", 
                        "description": "Neues Fälligkeitsdatum. Relative Zeitangaben: 'today', 'heute', 'tomorrow', 'morgen', 'in 3 days', 'in 3 Tagen'"
                    },
                    "new_message": {"type": "string", "description": "Neue Nachricht/Notiz für das Follow-up"},
                    "new_title": {"type": "string", "description": "Neuer Titel für das Follow-up"},
                    "new_channel": {"type": "string", "enum": ["whatsapp", "email", "call"], "description": "Neuer Kanal für das Follow-up"}
                },
                "required": ["lead_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Erstelle eine Aufgabe/Follow-up für einen Lead.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_id": {
                        "type": "string"
                    },
                    "lead_name": {
                        "type": "string",
                        "description": "Alternativ zur ID"
                    },
                    "title": {
                        "type": "string",
                        "description": "Titel der Aufgabe"
                    },
                    "description": {
                        "type": "string"
                    },
                    "due_date": {
                        "type": "string",
                        "description": "Fälligkeitsdatum (ISO format oder 'tomorrow', 'next_week')"
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["high", "medium", "low"],
                        "default": "medium"
                    },
                    "type": {
                        "type": "string",
                        "enum": ["call", "email", "meeting", "followup", "proposal", "other"],
                        "default": "followup"
                    }
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_user_knowledge",
            "description": "Speichert wichtige User-Infos dauerhaft (Name, Firma, Produkt, Präferenzen). Nutze wenn User sagt 'merk dir', 'speicher', 'ich bin...', 'ich arbeite für...'",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": ["identity", "company", "product", "preferences", "style"],
                        "description": "Kategorie der Information"
                    },
                    "content": {
                        "type": "string",
                        "description": "Die zu speichernde Information"
                    }
                },
                "required": ["category", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_user_preference",
            "description": "Speichert eine User-Präferenz die CHIEF sich merken soll (z.B. Signatur, Nachrichtenstil, Firmennamen erwähnen etc.). Nutze SOFORT wenn User eine Präferenz äußert wie 'immer mit Signatur', 'ohne Firmennamen', 'duze mich', 'kurze Nachrichten'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": ["signature", "message_style", "greeting", "language", "other"],
                        "description": "Kategorie der Präferenz"
                    },
                    "key": {
                        "type": "string",
                        "description": "Name der Präferenz (z.B. 'default_signature', 'include_company_name', 'use_du_form')"
                    },
                    "value": {
                        "type": "string", 
                        "description": "Wert der Präferenz (z.B. 'Liebe Grüße, Tamara', 'false', 'true')"
                    }
                },
                "required": ["category", "key", "value"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "log_interaction",
            "description": "Protokolliert ein Gespräch/Interaktion mit einem Lead. NUTZE DIESES TOOL AUTOMATISCH wenn der User ein Gespräch beschreibt.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_name": {"type": "string", "description": "Name des Leads"},
                    "lead_id": {"type": "string", "description": "ID des Leads falls bekannt"},
                    "type": {
                        "type": "string",
                        "enum": ["call", "meeting", "email", "whatsapp", "linkedin", "other"],
                        "description": "Art der Interaktion"
                    },
                    "notes": {"type": "string", "description": "Zusammenfassung des Gesprächs"},
                    "sentiment": {"type": "string", "enum": ["positiv", "neutral", "negativ"]},
                    "key_facts": {"type": "array", "items": {"type": "string"}, "description": "Wichtige Fakten aus dem Gespräch"},
                    "objections": {"type": "array", "items": {"type": "string"}, "description": "Genannte Einwände"},
                    "next_steps": {"type": "string", "description": "Vereinbarte nächste Schritte"},
                    "budget": {"type": "number", "description": "Erwähntes Budget"},
                    "timeline": {"type": "string", "description": "Erwähnte Timeline/Deadline"},
                    "create_followup": {"type": "boolean", "description": "Soll ein Follow-up erstellt werden?"},
                    "followup_days": {"type": "integer", "description": "In wie vielen Tagen Follow-up?"}
                },
                "required": ["lead_name", "notes"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_customer_protocol",
            "description": "Erstellt ein freundliches Protokoll zum Senden an den Kunden. NUR aufrufen wenn User explizit ein Protokoll anfragt.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_name_or_id": {"type": "string"},
                    "tone": {"type": "string", "enum": ["formal", "friendly", "casual"], "default": "friendly"},
                    "include_next_steps": {"type": "boolean", "default": True}
                },
                "required": ["lead_name_or_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_lead_status",
            "description": "Aktualisiere den Status eines Leads.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_id": {
                        "type": "string"
                    },
                    "lead_name": {
                        "type": "string"
                    },
                    "new_status": {
                        "type": "string",
                        "enum": ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]
                    },
                    "reason": {
                        "type": "string",
                        "description": "Grund für Status-Änderung (besonders bei 'lost')"
                    },
                    "customer_type": {
                        "type": "string",
                        "description": "Optional bei 'won': kunde oder teampartner"
                    },
                    "customer_value": {
                        "type": "number",
                        "description": "Optional: Bestellwert beim Gewinn"
                    }
                },
                "required": ["new_status"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "start_power_hour",
            "description": "Starte eine Power Hour Session mit Zielen und Timer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "duration_minutes": {
                        "type": "integer",
                        "default": 60
                    },
                    "goal_calls": {
                        "type": "integer",
                        "description": "Ziel-Anzahl Anrufe"
                    },
                    "goal_contacts": {
                        "type": "integer",
                        "description": "Ziel-Anzahl erreichte Kontakte"
                    }
                }
            }
        }
    },
    # ═══════════════════════════════════════════════════════════
    # QUICK WIN TOOLS (neu)
    # ═══════════════════════════════════════════════════════════
    {
        "type": "function",
        "function": {
            "name": "get_lead_history",
            "description": "Zeigt alle Interaktionen und Aktivitäten eines Leads. Nutze wenn User fragt 'was war mit X', 'Geschichte von X', 'alle Gespräche mit X'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_name_or_id": {
                        "type": "string",
                        "description": "Name oder ID des Leads"
                    },
                    "limit": {
                        "type": "integer",
                        "default": 20,
                        "description": "Max Anzahl Interaktionen"
                    }
                },
                "required": ["lead_name_or_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_today_summary",
            "description": "Gibt eine Zusammenfassung für heute: Follow-ups, Meetings, Hot Leads. Nutze bei 'was steht heute an', 'mein Tag', 'Tagesübersicht'.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "quick_update_lead",
            "description": "Schnelles Update eines Leads: Status, Temperatur, Tags, Social Media Handles, Email, WhatsApp. Nutze bei 'setz X auf gewonnen', 'markiere als hot', 'füge Tag hinzu', oder wenn Social Media Info extrahiert wurde.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_name_or_id": {
                        "type": "string",
                        "description": "Name oder ID des Leads"
                    },
                    "status": {
                        "type": "string",
                        "enum": ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"],
                        "description": "Neuer Status"
                    },
                    "temperature": {
                        "type": "string",
                        "enum": ["cold", "warm", "hot"],
                        "description": "Neue Temperatur"
                    },
                    "add_tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Tags zum Hinzufügen"
                    },
                    "remove_tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Tags zum Entfernen"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Notiz anhängen"
                    },
                    "instagram": {
                        "type": "string",
                        "description": "Instagram Handle (ohne @) oder URL"
                    },
                    "facebook": {
                        "type": "string",
                        "description": "Facebook URL oder Username"
                    },
                    "linkedin": {
                        "type": "string",
                        "description": "LinkedIn URL oder Username"
                    },
                    "whatsapp": {
                        "type": "string",
                        "description": "WhatsApp Telefonnummer (mit Ländercode, z.B. +436641234567)"
                    },
                    "email": {
                        "type": "string",
                        "description": "Email-Adresse"
                    }
                },
                "required": ["lead_name_or_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_by_tag",
            "description": "Suche Leads nach Tags. Nutze bei 'zeig mir alle Zinzino Leads', 'Leads mit Tag X', 'wer hat Tag Y'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Tags nach denen gesucht wird (OR-Verknüpfung)"
                    },
                    "match_all": {
                        "type": "boolean",
                        "default": False,
                        "description": "True = alle Tags müssen matchen (AND)"
                    },
                    "status": {
                        "type": "string",
                        "enum": ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost", "all"],
                        "default": "all"
                    },
                    "limit": {
                        "type": "integer",
                        "default": 20
                    }
                },
                "required": ["tags"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_pipeline_stats",
            "description": "Pipeline-Übersicht: Leads pro Stage, Conversion Rates, Deal Values. Nutze bei 'Pipeline Status', 'wie sieht meine Pipeline aus', 'Funnel Übersicht'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "include_values": {
                        "type": "boolean",
                        "default": True,
                        "description": "Deal-Werte mit einbeziehen"
                    }
                }
            }
        }
    },
    # ═══════════════════════════════════════════════════════════
    # GOOGLE INTEGRATIONS
    # ═══════════════════════════════════════════════════════════
    {
        "type": "function",
        "function": {
            "name": "research_company",
            "description": "Recherchiere Infos über eine Firma via Google Places. Nutze bei 'was weißt du über Firma X', 'recherchiere Firma', 'Firmeninfo'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "company_name": {
                        "type": "string",
                        "description": "Name der Firma"
                    },
                    "location": {
                        "type": "string",
                        "description": "Optional: Stadt oder Region für bessere Ergebnisse"
                    }
                },
                "required": ["company_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "schedule_meeting",
            "description": "Plant ein Meeting im Kalender. Nutze bei 'plane Meeting mit X', 'Termin eintragen', 'Meeting am Donnerstag'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Titel des Meetings"
                    },
                    "lead_name_or_id": {
                        "type": "string",
                        "description": "Lead für den das Meeting ist"
                    },
                    "date": {
                        "type": "string",
                        "description": "Datum: 'tomorrow', 'morgen', 'next monday', 'nächsten Montag', '2025-01-15'"
                    },
                    "time": {
                        "type": "string",
                        "description": "Uhrzeit: '14:00', '2pm', '14 Uhr'"
                    },
                    "duration_minutes": {
                        "type": "integer",
                        "default": 30,
                        "description": "Dauer in Minuten"
                    },
                    "location": {
                        "type": "string",
                        "description": "Ort oder 'Zoom'/'Google Meet'"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Notizen zum Meeting"
                    }
                },
                "required": ["title", "date", "time"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "prepare_message",
            "description": "Bereitet eine Nachricht vor und gibt einen One-Click Link zurück. Funktioniert für Email, WhatsApp, Instagram, LinkedIn. Nutze bei 'schreib Email/WhatsApp/DM an X', 'kontaktiere X per...', 'Nachricht an X'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_name_or_id": {
                        "type": "string",
                        "description": "Lead-Name oder ID"
                    },
                    "channel": {
                        "type": "string",
                        "enum": ["email", "whatsapp", "instagram", "linkedin"],
                        "description": "Kommunikationskanal"
                    },
                    "message": {
                        "type": "string",
                        "description": "Nachrichtentext"
                    },
                    "subject": {
                        "type": "string",
                        "description": "Nur für Email: Betreff"
                    }
                },
                "required": ["lead_name_or_id", "channel", "message"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "log_message_sent",
            "description": "Protokolliert dass eine Nachricht an einen Lead gesendet wurde. NUTZE DIESES TOOL AUTOMATISCH wenn der User sagt: 'Erstnachricht verschickt/gesendet', 'Nachricht gesendet', 'Hab ihr/ihm geschrieben', 'DM verschickt', 'Email rausgeschickt' oder ähnlich. Setzt automatisch den Lead-Status auf 'contacted'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_name_or_id": {
                        "type": "string",
                        "description": "Name oder ID des Leads"
                    },
                    "message": {
                        "type": "string",
                        "description": "Inhalt der gesendeten Nachricht (optional, aber empfohlen)"
                    },
                    "channel": {
                        "type": "string",
                        "enum": ["email", "whatsapp", "instagram", "linkedin", "facebook"],
                        "default": "instagram",
                        "description": "Kanal über den die Nachricht gesendet wurde"
                    },
                    "lead_id": {
                        "type": "string",
                        "description": "Lead-ID falls bekannt (optional, sonst wird per Name gesucht)"
                    }
                },
                "required": ["lead_name_or_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "convert_to_customer",
            "description": "Konvertiert einen Lead zum Kunden. Nutze wenn User sagt 'X ist jetzt Kunde' oder 'X hat gekauft'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_id": {
                        "type": "string",
                        "description": "ID des Leads (optional, sonst Suche per Name)"
                    },
                    "lead_name": {
                        "type": "string",
                        "description": "Name des Leads, wenn keine ID vorhanden"
                    },
                    "customer_type": {
                        "type": "string",
                        "enum": ["kunde", "teampartner"],
                        "default": "kunde",
                        "description": "Art des Kunden"
                    },
                    "initial_value": {
                        "type": "number",
                        "description": "Erster Bestellwert (optional)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_sequence_messages",
            "description": "Generiert personalisierte Nachrichten für eine Follow-up Sequenz. Nutze wenn User Sequenz-Nachrichten braucht.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_id": {"type": "string", "description": "ID des Leads"},
                    "lead_name": {"type": "string", "description": "Name des Leads falls ID unbekannt"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_lead_stage",
            "description": "Update den Sales-Stage eines Leads im C.A.S. System",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_name": {"type": "string"},
                    "new_stage": {
                        "type": "integer",
                        "description": "1-8 oder 0 für disqualified"
                    },
                    "sentiment": {
                        "type": "string",
                        "enum": ["positive", "neutral", "skeptical", "negative"]
                    },
                    "objection": {
                        "type": "string",
                        "description": "Letzter Einwand falls vorhanden"
                    }
                },
                "required": ["lead_name", "new_stage"]
            }
        }
    },
]

