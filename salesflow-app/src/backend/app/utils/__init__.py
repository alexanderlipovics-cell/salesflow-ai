"""
Utils Package
Hilfsfunktionen für verschiedene Aufgaben
"""

from .pdf import extract_text_from_pdf
from .docx import extract_text_from_docx

__all__ = [
    "extract_text_from_pdf",
    "extract_text_from_docx",
]

