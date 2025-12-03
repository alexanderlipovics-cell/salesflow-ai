"""
PDF Text Extraction Utilities
Extrahiert Text aus PDF-Dateien für Storybook-Import
"""

from typing import Union
import io


def extract_text_from_pdf(content: Union[bytes, str]) -> str:
    """
    Extrahiert Text aus PDF-Bytes
    
    Args:
        content: PDF als bytes oder Dateipfad
        
    Returns:
        Extrahierter Text
    """
    try:
        # Try PyMuPDF (fitz) first - beste Qualität
        return _extract_with_pymupdf(content)
    except ImportError:
        pass
    
    try:
        # Fallback zu pdfplumber
        return _extract_with_pdfplumber(content)
    except ImportError:
        pass
    
    try:
        # Fallback zu PyPDF2
        return _extract_with_pypdf2(content)
    except ImportError:
        pass
    
    raise ImportError(
        "Kein PDF-Parser verfügbar. Installiere eines der folgenden Pakete: "
        "pymupdf (pip install pymupdf), "
        "pdfplumber (pip install pdfplumber), "
        "pypdf2 (pip install pypdf2)"
    )


def _extract_with_pymupdf(content: Union[bytes, str]) -> str:
    """Extrahiert Text mit PyMuPDF (fitz)"""
    import fitz  # PyMuPDF
    
    if isinstance(content, str):
        doc = fitz.open(content)
    else:
        doc = fitz.open(stream=content, filetype="pdf")
    
    text_parts = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        if text.strip():
            text_parts.append(f"--- Seite {page_num + 1} ---\n{text}")
    
    doc.close()
    return "\n\n".join(text_parts)


def _extract_with_pdfplumber(content: Union[bytes, str]) -> str:
    """Extrahiert Text mit pdfplumber"""
    import pdfplumber
    
    if isinstance(content, bytes):
        pdf_file = io.BytesIO(content)
    else:
        pdf_file = content
    
    text_parts = []
    with pdfplumber.open(pdf_file) as pdf:
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text and text.strip():
                text_parts.append(f"--- Seite {page_num + 1} ---\n{text}")
    
    return "\n\n".join(text_parts)


def _extract_with_pypdf2(content: Union[bytes, str]) -> str:
    """Extrahiert Text mit PyPDF2"""
    from PyPDF2 import PdfReader
    
    if isinstance(content, bytes):
        pdf_file = io.BytesIO(content)
    else:
        pdf_file = open(content, 'rb')
    
    try:
        reader = PdfReader(pdf_file)
        text_parts = []
        
        for page_num, page in enumerate(reader.pages):
            text = page.extract_text()
            if text and text.strip():
                text_parts.append(f"--- Seite {page_num + 1} ---\n{text}")
        
        return "\n\n".join(text_parts)
    finally:
        if isinstance(content, str):
            pdf_file.close()


def get_pdf_metadata(content: Union[bytes, str]) -> dict:
    """
    Extrahiert Metadaten aus PDF
    
    Returns:
        Dict mit title, author, subject, creator, pages, etc.
    """
    try:
        import fitz
        
        if isinstance(content, str):
            doc = fitz.open(content)
        else:
            doc = fitz.open(stream=content, filetype="pdf")
        
        metadata = doc.metadata
        metadata["pages"] = len(doc)
        doc.close()
        
        return metadata
    except ImportError:
        pass
    
    try:
        from PyPDF2 import PdfReader
        
        if isinstance(content, bytes):
            pdf_file = io.BytesIO(content)
        else:
            pdf_file = open(content, 'rb')
        
        try:
            reader = PdfReader(pdf_file)
            info = reader.metadata
            
            return {
                "title": info.title if info else None,
                "author": info.author if info else None,
                "subject": info.subject if info else None,
                "creator": info.creator if info else None,
                "pages": len(reader.pages),
            }
        finally:
            if isinstance(content, str):
                pdf_file.close()
    except ImportError:
        pass
    
    return {"pages": 0, "error": "No PDF parser available"}


def extract_text_from_pdf_with_ocr(content: bytes) -> str:
    """
    Extrahiert Text aus PDF mit OCR für gescannte Dokumente
    Benötigt: pytesseract, pdf2image, tesseract-ocr
    """
    try:
        from pdf2image import convert_from_bytes
        import pytesseract
        
        # Convert PDF to images
        images = convert_from_bytes(content)
        
        text_parts = []
        for i, image in enumerate(images):
            # OCR on each page
            text = pytesseract.image_to_string(image, lang='deu+eng')
            if text.strip():
                text_parts.append(f"--- Seite {i + 1} (OCR) ---\n{text}")
        
        return "\n\n".join(text_parts)
        
    except ImportError as e:
        raise ImportError(
            f"OCR-Pakete nicht verfügbar: {e}. "
            "Installiere: pip install pytesseract pdf2image "
            "und tesseract-ocr (System-Installation erforderlich)"
        )

