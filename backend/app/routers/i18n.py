"""
i18n API Endpoints
Multilanguage support API
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, List, Optional

from app.services.i18n_service import i18n_service
from app.services.gpt_service import gpt_service
from app.middleware.auth import get_current_user


router = APIRouter(prefix="/api/i18n", tags=["i18n"])


# ═══════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════

class TranslationCreate(BaseModel):
    key: str = Field(..., min_length=1, max_length=255)
    language: str = Field(..., min_length=2, max_length=5)
    value: str = Field(..., min_length=1)
    category: Optional[str] = Field('ui', max_length=50)


class TemplateTranslationCreate(BaseModel):
    template_id: str
    language: str = Field(..., min_length=2, max_length=5)
    name: str
    body_template: str = Field(..., min_length=1)
    subject_template: Optional[str] = None
    short_template: Optional[str] = None
    reminder_template: Optional[str] = None
    fallback_template: Optional[str] = None


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1)
    from_language: str = Field(..., min_length=2, max_length=5)
    to_language: str = Field(..., min_length=2, max_length=5)


class UpdateLanguageRequest(BaseModel):
    language: str = Field(..., min_length=2, max_length=5)


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/languages")
async def get_supported_languages():
    """
    Get all supported languages
    
    Returns list of language objects with code, name, native_name
    """
    try:
        languages = await i18n_service.get_supported_languages()
        
        return {
            "success": True,
            "languages": languages,
            "count": len(languages)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get languages: {str(e)}"
        )


@router.get("/translations/{language}")
async def get_translations(
    language: str,
    category: Optional[str] = None
):
    """
    Get all translations for a language
    
    Args:
        language: Language code (e.g., 'de', 'en')
        category: Optional category filter (e.g., 'ui', 'email')
    
    Returns:
        Key-value pairs of translations
    """
    try:
        translations = await i18n_service.get_all_translations(
            language=language,
            category=category
        )
        
        return {
            "success": True,
            "language": language,
            "category": category,
            "translations": translations
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get translations: {str(e)}"
        )


@router.get("/translation/{key}")
async def get_translation(
    key: str,
    language: str = 'de'
):
    """
    Get single translation by key
    
    Args:
        key: Translation key (e.g., 'dashboard.title')
        language: Language code (defaults to 'de')
    
    Returns:
        Translation value
    """
    try:
        value = await i18n_service.get_translation(
            key=key,
            language=language
        )
        
        return {
            "success": True,
            "key": key,
            "language": language,
            "value": value
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get translation: {str(e)}"
        )


@router.post("/translations")
async def create_translation(
    translation: TranslationCreate,
    current_user = Depends(get_current_user)
):
    """
    Create or update translation
    
    Requires authentication and admin role
    """
    # TODO: Add admin role check
    
    try:
        success = await i18n_service.create_translation(
            key=translation.key,
            language=translation.language,
            value=translation.value,
            category=translation.category
        )
        
        return {
            "success": success,
            "message": "Translation created/updated successfully"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create translation: {str(e)}"
        )


@router.get("/template/{template_id}/{language}")
async def get_template_in_language(
    template_id: str,
    language: str,
    current_user = Depends(get_current_user)
):
    """
    Get follow-up template in specific language
    
    Args:
        template_id: Template UUID
        language: Language code
    
    Returns:
        Translated template with all fields
    """
    try:
        template = await i18n_service.get_template_in_language(
            template_id=template_id,
            language=language
        )
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        return {
            "success": True,
            "template": template
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get template: {str(e)}"
        )


@router.post("/template-translations")
async def create_template_translation(
    translation: TemplateTranslationCreate,
    current_user = Depends(get_current_user)
):
    """
    Create or update template translation
    
    Requires authentication
    """
    try:
        success = await i18n_service.create_template_translation(
            template_id=translation.template_id,
            language=translation.language,
            name=translation.name,
            body_template=translation.body_template,
            subject_template=translation.subject_template,
            short_template=translation.short_template,
            reminder_template=translation.reminder_template,
            fallback_template=translation.fallback_template
        )
        
        return {
            "success": success,
            "message": "Template translation created/updated successfully"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create template translation: {str(e)}"
        )


@router.post("/translate")
async def translate_text(
    request: TranslateRequest,
    current_user = Depends(get_current_user)
):
    """
    Translate text using GPT
    
    Args:
        text: Text to translate
        from_language: Source language
        to_language: Target language
    
    Returns:
        Translated text
    """
    try:
        result = await gpt_service.translate_template(
            template_text=request.text,
            from_language=request.from_language,
            to_language=request.to_language,
            user_id=current_user.id
        )
        
        if 'error' in result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result['error']
            )
        
        return {
            "success": True,
            "translated_text": result['translated_text'],
            "from_language": result['from_language'],
            "to_language": result['to_language'],
            "tokens_used": result.get('tokens_used', 0)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to translate: {str(e)}"
        )


@router.post("/users/language")
async def update_user_language(
    request: UpdateLanguageRequest,
    current_user = Depends(get_current_user)
):
    """
    Update current user's language preference
    
    Args:
        language: Language code (e.g., 'de', 'en')
    
    Returns:
        Success status
    """
    try:
        success = await i18n_service.update_user_language(
            user_id=current_user.id,
            language=request.language
        )
        
        return {
            "success": success,
            "language": request.language,
            "message": "Language updated successfully"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update language: {str(e)}"
        )


@router.get("/users/language")
async def get_user_language(
    current_user = Depends(get_current_user)
):
    """
    Get current user's language preference
    
    Returns:
        User's language code
    """
    try:
        language = await i18n_service.get_user_language(current_user.id)
        
        return {
            "success": True,
            "language": language
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get language: {str(e)}"
        )


@router.post("/detect-language")
async def detect_language(
    text: str,
    current_user = Depends(get_current_user)
):
    """
    Detect language of text using GPT
    
    Args:
        text: Text to analyze
    
    Returns:
        Detected language code
    """
    try:
        detected_lang = await gpt_service.detect_language(text)
        
        return {
            "success": True,
            "detected_language": detected_lang,
            "text_preview": text[:100]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to detect language: {str(e)}"
        )

