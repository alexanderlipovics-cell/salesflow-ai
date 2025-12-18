"""
Genealogy Tree API Router - Downline-Struktur für MLM
"""

from __future__ import annotations

import logging
from typing import Optional, List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel

from app.supabase_client import get_supabase_client

router = APIRouter(
    prefix="/genealogy",
    tags=["genealogy"],
)
logger = logging.getLogger(__name__)

DEV_USER_ID = "dev-user-00000000-0000-0000-0000-000000000001"


# ============= Response Models =============

class DownlineMember(BaseModel):
    """Ein Downline-Mitglied mit allen relevanten Daten."""
    id: str
    user_id: str
    name: Optional[str] = None
    rank: Optional[str] = None
    monthly_pv: int = 0
    monthly_gv: int = 0
    total_downline_count: int = 0
    active_downline_count: int = 0
    is_active: bool = True
    level: int = 1  # Level in der Hierarchie (1 = direktes Downline)
    sponsor_id: Optional[str] = None
    children: List['DownlineMember'] = []  # Rekursiv für Tree-Struktur


class DownlineTreeResponse(BaseModel):
    """Response für die komplette Downline-Struktur."""
    user_id: str
    company_name: str
    root: DownlineMember
    total_members: int
    total_levels: int
    total_volume: int


# ============= Helper Functions =============

def build_tree_recursive(
    members: List[Dict[str, Any]],
    parent_id: Optional[str],
    level: int = 1,
    max_levels: int = 5
) -> List[DownlineMember]:
    """Baut rekursiv den Tree auf."""
    if level > max_levels:
        return []
    
    children = []
    for member in members:
        if member.get('sponsor_id') == parent_id:
            child = DownlineMember(
                id=str(member.get('id', '')),
                user_id=str(member.get('user_id', '')),
                name=member.get('name'),
                rank=member.get('rank'),
                monthly_pv=member.get('monthly_pv', 0),
                monthly_gv=member.get('monthly_gv', 0),
                total_downline_count=member.get('total_downline_count', 0),
                active_downline_count=member.get('active_downline_count', 0),
                is_active=member.get('is_active', True),
                level=level,
                sponsor_id=str(member.get('sponsor_id', '')) if member.get('sponsor_id') else None,
            )
            
            # Rekursiv Kinder laden
            child.children = build_tree_recursive(
                members,
                str(member.get('user_id', '')),
                level + 1,
                max_levels
            )
            
            children.append(child)
    
    return children


# ============= Endpoints =============

@router.get("/downline/{user_id}", response_model=DownlineTreeResponse)
async def get_downline_structure(
    user_id: str,
    company_name: Optional[str] = Query(None, description="Firma-Filter (optional)"),
    max_levels: int = Query(5, ge=1, le=10, description="Maximale Tiefe der Hierarchie"),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
):
    """
    Holt die komplette Downline-Struktur für einen User.
    
    Returns:
        DownlineTreeResponse mit rekursiver Tree-Struktur
    """
    try:
        db = get_supabase_client()
        
        # Lade Root-User
        root_query = db.table("mlm_downline_structure").select("*").eq("user_id", user_id)
        if company_name:
            root_query = root_query.eq("company_name", company_name)
        
        root_result = root_query.maybe_single().execute()
        
        if not root_result.data:
            raise HTTPException(
                status_code=404,
                detail=f"User {user_id} nicht in mlm_downline_structure gefunden"
            )
        
        root_data = root_result.data
        
        # Lade alle Downline-Mitglieder (alle die diesen User als Sponsor haben, rekursiv)
        # Wir laden alle Mitglieder der Firma und bauen dann den Tree
        all_members_query = db.table("mlm_downline_structure").select("*")
        if company_name:
            all_members_query = all_members_query.eq("company_name", company_name)
        
        all_members_result = all_members_query.execute()
        all_members = all_members_result.data or []
        
        # Lade User-Namen aus auth.users (falls vorhanden)
        # Für jetzt nutzen wir user_id als Name-Fallback
        
        # Baue Tree-Struktur
        root = DownlineMember(
            id=str(root_data.get('id', '')),
            user_id=str(root_data.get('user_id', '')),
            name=root_data.get('name') or f"User {user_id[:8]}",
            rank=root_data.get('rank'),
            monthly_pv=root_data.get('monthly_pv', 0),
            monthly_gv=root_data.get('monthly_gv', 0),
            total_downline_count=root_data.get('total_downline_count', 0),
            active_downline_count=root_data.get('active_downline_count', 0),
            is_active=root_data.get('is_active', True),
            level=0,
            sponsor_id=str(root_data.get('sponsor_id', '')) if root_data.get('sponsor_id') else None,
        )
        
        # Lade Kinder rekursiv
        root.children = build_tree_recursive(
            all_members,
            user_id,
            level=1,
            max_levels=max_levels
        )
        
        # Berechne Statistiken
        def count_members(node: DownlineMember) -> int:
            return 1 + sum(count_members(child) for child in node.children)
        
        def get_max_level(node: DownlineMember) -> int:
            if not node.children:
                return node.level
            return max(node.level, max(get_max_level(child) for child in node.children))
        
        def sum_volume(node: DownlineMember) -> int:
            return node.monthly_pv + sum(sum_volume(child) for child in node.children)
        
        total_members = count_members(root)
        total_levels = get_max_level(root)
        total_volume = sum_volume(root)
        
        return DownlineTreeResponse(
            user_id=user_id,
            company_name=company_name or "all",
            root=root,
            total_members=total_members,
            total_levels=total_levels,
            total_volume=total_volume,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error loading downline structure: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/downline/{user_id}/flat")
async def get_downline_flat(
    user_id: str,
    company_name: Optional[str] = Query(None),
    max_levels: int = Query(5, ge=1, le=10),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
):
    """
    Holt Downline als flache Liste (für Tabellen/Listen).
    
    Returns:
        Liste aller Downline-Mitglieder mit Level-Information
    """
    try:
        db = get_supabase_client()
        
        # Lade alle Mitglieder
        query = db.table("mlm_downline_structure").select("*")
        if company_name:
            query = query.eq("company_name", company_name)
        
        result = query.execute()
        all_members = result.data or []
        
        # Baue flache Liste mit Level-Information
        flat_list = []
        
        def add_children(parent_id: Optional[str], level: int):
            if level > max_levels:
                return
            
            for member in all_members:
                if str(member.get('sponsor_id', '')) == (parent_id or ''):
                    flat_list.append({
                        **member,
                        'level': level,
                    })
                    # Rekursiv Kinder hinzufügen
                    add_children(str(member.get('user_id', '')), level + 1)
        
        # Starte mit Root-User
        add_children(user_id, 1)
        
        return {
            "user_id": user_id,
            "company_name": company_name or "all",
            "members": flat_list,
            "total": len(flat_list),
        }
        
    except Exception as e:
        logger.exception(f"Error loading flat downline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/{user_id}")
async def get_downline_stats(
    user_id: str,
    company_name: Optional[str] = Query(None),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
):
    """
    Holt Statistiken zur Downline-Struktur.
    
    Returns:
        Statistiken (Anzahl Mitglieder, Volumen, etc.)
    """
    try:
        db = get_supabase_client()
        
        # Lade Root
        query = db.table("mlm_downline_structure").select("*").eq("user_id", user_id)
        if company_name:
            query = query.eq("company_name", company_name)
        
        root_result = query.maybe_single().execute()
        
        if not root_result.data:
            raise HTTPException(status_code=404, detail="User nicht gefunden")
        
        root = root_result.data
        
        return {
            "user_id": user_id,
            "company_name": company_name or "all",
            "stats": {
                "total_downline_count": root.get("total_downline_count", 0),
                "active_downline_count": root.get("active_downline_count", 0),
                "monthly_pv": root.get("monthly_pv", 0),
                "monthly_gv": root.get("monthly_gv", 0),
                "rank": root.get("rank"),
                "is_active": root.get("is_active", True),
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error loading stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

