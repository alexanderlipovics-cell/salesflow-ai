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
            "description": "Suche aktuelle Informationen im Internet. Nutze für: Firmen-News, Markt-Infos, Konkurrenz-Analyse, aktuelle Events.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Suchbegriff"
                    }
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
            "name": "log_interaction",
            "description": "Logge eine Interaktion mit einem Lead.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_id": {
                        "type": "string"
                    },
                    "lead_name": {
                        "type": "string"
                    },
                    "interaction_type": {
                        "type": "string",
                        "enum": ["call", "email", "meeting", "message", "note"],
                        "description": "Art der Interaktion"
                    },
                    "outcome": {
                        "type": "string",
                        "enum": ["positive", "neutral", "negative", "no_answer"],
                        "description": "Ergebnis"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Notizen zur Interaktion"
                    }
                },
                "required": ["interaction_type"]
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
    }
]

