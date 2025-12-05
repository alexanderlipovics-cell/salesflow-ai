"""
SalesFlow AI - Repository Factory
Dependency injection for repositories.
"""

from functools import lru_cache
from typing import Type, TypeVar

from supabase import Client

from app.db.repositories.base import BaseRepository
from app.db.repositories.leads import LeadRepository
from app.db.repositories.contacts import ContactRepository
from app.db.repositories.message_events import MessageEventRepository


T = TypeVar("T", bound=BaseRepository)


class RepositoryFactory:
    """
    Factory for creating repository instances.
    
    Provides dependency injection for repositories with shared
    Supabase client instance.
    
    Usage:
        factory = RepositoryFactory(supabase_client)
        lead_repo = factory.leads
        contact_repo = factory.contacts
    """
    
    def __init__(self, supabase: Client):
        """
        Initialize factory with Supabase client.
        
        Args:
            supabase: Authenticated Supabase client.
        """
        self._supabase = supabase
        self._repositories: dict[Type[BaseRepository], BaseRepository] = {}
    
    def _get_or_create(self, repo_class: Type[T]) -> T:
        """Get cached repository or create new instance."""
        if repo_class not in self._repositories:
            self._repositories[repo_class] = repo_class(self._supabase)
        return self._repositories[repo_class]
    
    @property
    def leads(self) -> LeadRepository:
        """Get LeadRepository instance."""
        return self._get_or_create(LeadRepository)
    
    @property
    def contacts(self) -> ContactRepository:
        """Get ContactRepository instance."""
        return self._get_or_create(ContactRepository)
    
    @property
    def message_events(self) -> MessageEventRepository:
        """Get MessageEventRepository instance."""
        return self._get_or_create(MessageEventRepository)


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI Dependencies
# ─────────────────────────────────────────────────────────────────────────────

# Global factory instance (set in app startup)
_factory: RepositoryFactory | None = None


def init_repositories(supabase: Client) -> RepositoryFactory:
    """
    Initialize repository factory with Supabase client.
    Call this during app startup.
    
    Args:
        supabase: Authenticated Supabase client.
        
    Returns:
        Initialized RepositoryFactory.
    """
    global _factory
    _factory = RepositoryFactory(supabase)
    return _factory


def get_repository_factory() -> RepositoryFactory:
    """
    Get repository factory instance.
    For use in FastAPI dependencies.
    
    Returns:
        RepositoryFactory instance.
        
    Raises:
        RuntimeError: If factory not initialized.
    """
    if _factory is None:
        raise RuntimeError(
            "Repository factory not initialized. "
            "Call init_repositories() during app startup."
        )
    return _factory


def get_lead_repository() -> LeadRepository:
    """FastAPI dependency for LeadRepository."""
    return get_repository_factory().leads


def get_contact_repository() -> ContactRepository:
    """FastAPI dependency for ContactRepository."""
    return get_repository_factory().contacts


def get_message_event_repository() -> MessageEventRepository:
    """FastAPI dependency for MessageEventRepository."""
    return get_repository_factory().message_events
