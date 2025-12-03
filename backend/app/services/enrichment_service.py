"""
Lead Enrichment Service
Clearbit, Hunter.io, LinkedIn integration
Auto-enrich leads with external data
"""

from typing import Dict, Optional, List
import requests
import os
from datetime import datetime, timedelta
import asyncio
import json


class LeadEnrichmentService:
    """Main Enrichment Service"""
    
    def __init__(self, db):
        self.db = db
        self.clearbit_key = os.getenv('CLEARBIT_API_KEY')
        self.hunter_key = os.getenv('HUNTER_API_KEY')
        self.linkedin_key = os.getenv('LINKEDIN_API_KEY')
    
    # ═══════════════════════════════════════════════════════════════
    # AUTO-ENRICH LEAD
    # ═══════════════════════════════════════════════════════════════
    
    async def enrich_lead(
        self,
        lead_id: str,
        enrichment_type: str = 'full'  # 'email', 'company', 'social', 'full'
    ) -> Dict:
        """
        Enrich lead with external data.
        
        Process:
        1. Check if we have recent cached data
        2. If not, query external APIs
        3. Cache results
        4. Update lead record
        """
        # Get lead
        lead = await self.db.fetchrow("""
            SELECT * FROM leads WHERE id = $1
        """, lead_id)
        
        if not lead:
            raise ValueError(f"Lead {lead_id} not found")
        
        # Create enrichment job
        job_id = await self.db.fetchval("""
            INSERT INTO lead_enrichment_jobs (
                lead_id, enrichment_type, status,
                sources_queried, enriched_fields, created_at
            )
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING id
        """, lead_id, enrichment_type, 'processing', [], [])
        
        enriched_data = {}
        sources_queried = []
        enriched_fields = []
        
        try:
            # 1. Enrich by Email (if available)
            if lead['email']:
                email_data = await self._enrich_by_email(lead['email'])
                if email_data:
                    enriched_data.update(email_data)
                    sources_queried.append('clearbit')
            
            # 2. Enrich Company Data (if company known)
            if lead['company'] and enrichment_type in ['company', 'full']:
                company_data = await self._enrich_company(lead['company'])
                if company_data:
                    enriched_data.update(company_data)
                    sources_queried.append('clearbit_company')
            
            # 3. Find Email (if missing)
            if not lead['email'] and lead['name'] and lead['company'] and enrichment_type in ['email', 'full']:
                email = await self._find_email(lead['name'], lead['company'])
                if email:
                    enriched_data['email'] = email
                    sources_queried.append('hunter')
            
            # 4. Social Profiles
            if enrichment_type in ['social', 'full']:
                social_data = await self._find_social_profiles(lead['name'], lead['company'])
                if social_data:
                    enriched_data.update(social_data)
                    sources_queried.append('social_search')
            
            # Update lead with enriched data
            update_fields = []
            update_values = []
            param_idx = 1
            
            for key, value in enriched_data.items():
                if value:
                    update_fields.append(f"{key} = ${param_idx}")
                    update_values.append(value)
                    enriched_fields.append(key)
                    param_idx += 1
            
            if update_fields:
                query = f"""
                    UPDATE leads 
                    SET {', '.join(update_fields)}, updated_at = NOW()
                    WHERE id = ${param_idx}
                """
                update_values.append(lead_id)
                await self.db.execute(query, *update_values)
            
            # Update job
            await self.db.execute("""
                UPDATE lead_enrichment_jobs
                SET status = $1,
                    data_found = $2,
                    sources_queried = $3,
                    enriched_fields = $4,
                    completed_at = NOW()
                WHERE id = $5
            """, 'completed', len(enriched_data) > 0, sources_queried, enriched_fields, job_id)
            
            return {
                'success': True,
                'enriched_fields': enriched_fields,
                'data': enriched_data,
                'sources': sources_queried
            }
            
        except Exception as e:
            await self.db.execute("""
                UPDATE lead_enrichment_jobs
                SET status = $1, error_message = $2
                WHERE id = $3
            """, 'failed', str(e), job_id)
            raise
    
    # ═══════════════════════════════════════════════════════════════
    # CLEARBIT - EMAIL ENRICHMENT
    # ═══════════════════════════════════════════════════════════════
    
    async def _enrich_by_email(self, email: str) -> Optional[Dict]:
        """
        Enrich lead using Clearbit Enrichment API.
        Returns: name, job_title, company, phone, social profiles, etc.
        """
        # Check cache first
        cached = await self._get_cached_data('email', email, 'clearbit')
        if cached:
            return cached
        
        if not self.clearbit_key:
            return None
        
        try:
            response = requests.get(
                f'https://person.clearbit.com/v2/combined/find?email={email}',
                auth=(self.clearbit_key, ''),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                person = data.get('person', {})
                company = data.get('company', {})
                
                enriched = {
                    'name': person.get('name', {}).get('fullName'),
                    'job_title': person.get('employment', {}).get('title'),
                    'company': company.get('name'),
                    'phone': person.get('phone'),
                    'linkedin_url': f"https://linkedin.com/in/{person.get('linkedin', {}).get('handle')}" if person.get('linkedin', {}).get('handle') else None,
                    'twitter_handle': person.get('twitter', {}).get('handle'),
                    'facebook_url': person.get('facebook', {}).get('handle'),
                    'bio': person.get('bio'),
                    'location': person.get('location'),
                }
                
                # Cache results
                await self._cache_data('email', email, 'clearbit', enriched)
                
                return {k: v for k, v in enriched.items() if v}  # Remove None values
            
            return None
            
        except Exception as e:
            print(f"Clearbit enrichment failed: {e}")
            return None
    
    # ═══════════════════════════════════════════════════════════════
    # CLEARBIT - COMPANY ENRICHMENT
    # ═══════════════════════════════════════════════════════════════
    
    async def _enrich_company(self, company_name: str) -> Optional[Dict]:
        """
        Enrich company data using Clearbit Company API.
        Returns: domain, description, size, industry, revenue, etc.
        """
        # Check cache
        cached = await self._get_cached_data('company', company_name, 'clearbit')
        if cached:
            return cached
        
        if not self.clearbit_key:
            return None
        
        try:
            # First, find domain
            response = requests.get(
                f'https://company.clearbit.com/v1/domains/find?name={company_name}',
                auth=(self.clearbit_key, ''),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                enriched = {
                    'company_domain': data.get('domain'),
                    'company_size': data.get('metrics', {}).get('employees'),
                    'company_industry': data.get('category', {}).get('industry'),
                    'company_description': data.get('description'),
                    'company_revenue': data.get('metrics', {}).get('estimatedAnnualRevenue'),
                    'company_website': f"https://{data.get('domain')}" if data.get('domain') else None,
                    'company_location': data.get('location'),
                    'company_tech': data.get('tech', []),
                }
                
                # Cache
                await self._cache_data('company', company_name, 'clearbit', enriched)
                
                return {k: v for k, v in enriched.items() if v}
            
            return None
            
        except Exception as e:
            print(f"Company enrichment failed: {e}")
            return None
    
    # ═══════════════════════════════════════════════════════════════
    # HUNTER.IO - EMAIL FINDER
    # ═══════════════════════════════════════════════════════════════
    
    async def _find_email(self, name: str, company: str) -> Optional[str]:
        """
        Find email address using Hunter.io.
        """
        # Check cache
        cache_key = f"{name}_{company}"
        cached = await self._get_cached_data('email_lookup', cache_key, 'hunter')
        if cached and cached.get('email'):
            return cached['email']
        
        if not self.hunter_key:
            return None
        
        try:
            # Split name into first and last
            parts = name.split()
            first_name = parts[0] if parts else ''
            last_name = parts[-1] if len(parts) > 1 else ''
            
            # Try common domain formats
            domain_variations = [
                f"{company.lower().replace(' ', '')}.com",
                f"{company.lower().replace(' ', '')}.de",
                f"{company.lower().replace(' ', '')}.io",
            ]
            
            for domain in domain_variations:
                response = requests.get(
                    'https://api.hunter.io/v2/email-finder',
                    params={
                        'domain': domain,
                        'first_name': first_name,
                        'last_name': last_name,
                        'api_key': self.hunter_key
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    email = data.get('data', {}).get('email')
                    
                    if email and data.get('data', {}).get('score', 0) > 50:
                        # Cache
                        await self._cache_data('email_lookup', cache_key, 'hunter', {'email': email})
                        return email
            
            return None
            
        except Exception as e:
            print(f"Email finder failed: {e}")
            return None
    
    # ═══════════════════════════════════════════════════════════════
    # EMAIL VALIDATION
    # ═══════════════════════════════════════════════════════════════
    
    async def validate_email(self, email: str) -> Dict:
        """
        Validate email address using Hunter.io Email Verifier.
        Returns: valid, score, disposable, webmail, etc.
        """
        if not self.hunter_key:
            return {'valid': False, 'error': 'Hunter API key not configured'}
        
        try:
            response = requests.get(
                'https://api.hunter.io/v2/email-verifier',
                params={
                    'email': email,
                    'api_key': self.hunter_key
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json().get('data', {})
                
                return {
                    'valid': data.get('status') == 'valid',
                    'score': data.get('score'),
                    'disposable': data.get('disposable'),
                    'webmail': data.get('webmail'),
                    'result': data.get('result'),
                    'status': data.get('status')
                }
            
            return {'valid': False, 'error': 'Validation failed'}
            
        except Exception as e:
            print(f"Email validation failed: {e}")
            return {'valid': False, 'error': str(e)}
    
    # ═══════════════════════════════════════════════════════════════
    # SOCIAL MEDIA PROFILES
    # ═══════════════════════════════════════════════════════════════
    
    async def _find_social_profiles(self, name: str, company: Optional[str]) -> Optional[Dict]:
        """
        Find social media profiles (LinkedIn, Instagram, Facebook).
        Note: This requires specialized APIs or web scraping.
        For now, returns None - implement with proper APIs in production.
        """
        # This would typically use:
        # - LinkedIn API (requires OAuth)
        # - Instagram API
        # - Facebook Graph API
        # - Or services like Pipl, FullContact
        
        # Placeholder for future implementation
        return None
    
    # ═══════════════════════════════════════════════════════════════
    # CACHING
    # ═══════════════════════════════════════════════════════════════
    
    async def _cache_data(
        self,
        lookup_type: str,
        lookup_value: str,
        source: str,
        data: Dict
    ):
        """Cache enriched data to avoid duplicate API calls"""
        
        await self.db.execute("""
            INSERT INTO enriched_data_cache (
                lookup_type, lookup_value, source, data,
                cached_at, expires_at, hit_count
            )
            VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '30 days', 0)
        """, lookup_type, lookup_value, source, json.dumps(data))
    
    async def _get_cached_data(
        self,
        lookup_type: str,
        lookup_value: str,
        source: str
    ) -> Optional[Dict]:
        """Get cached enrichment data"""
        
        result = await self.db.fetchrow("""
            SELECT data FROM enriched_data_cache
            WHERE lookup_type = $1
              AND lookup_value = $2
              AND source = $3
              AND expires_at > NOW()
            ORDER BY cached_at DESC
            LIMIT 1
        """, lookup_type, lookup_value, source)
        
        if result:
            # Update hit count
            await self.db.execute("""
                UPDATE enriched_data_cache
                SET hit_count = hit_count + 1,
                    last_accessed_at = NOW()
                WHERE lookup_type = $1
                  AND lookup_value = $2
                  AND source = $3
            """, lookup_type, lookup_value, source)
            
            return result['data']  # Already a dict (JSONB)
        
        return None
    
    # ═══════════════════════════════════════════════════════════════
    # BULK ENRICHMENT
    # ═══════════════════════════════════════════════════════════════
    
    async def bulk_enrich_leads(self, user_id: str, lead_ids: List[str]):
        """
        Enrich multiple leads in background.
        Use task queue in production (Celery, RQ, etc.)
        """
        for lead_id in lead_ids:
            try:
                await self.enrich_lead(lead_id, enrichment_type='full')
                await asyncio.sleep(2)  # Rate limiting - respect API limits
            except Exception as e:
                print(f"Failed to enrich lead {lead_id}: {e}")
                continue
    
    # ═══════════════════════════════════════════════════════════════
    # STATISTICS
    # ═══════════════════════════════════════════════════════════════
    
    async def get_enrichment_stats(self, user_id: str) -> Dict:
        """Get enrichment statistics for user"""
        
        stats = await self.db.fetchrow("""
            SELECT 
                COUNT(*) as total_jobs,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN data_found = TRUE THEN 1 ELSE 0 END) as enriched,
                AVG(ARRAY_LENGTH(enriched_fields, 1)) as avg_fields_found
            FROM lead_enrichment_jobs lej
            JOIN leads l ON lej.lead_id = l.id
            WHERE l.user_id = $1
        """, user_id)
        
        cache_stats = await self.db.fetchrow("""
            SELECT 
                COUNT(*) as total_cached,
                SUM(hit_count) as total_hits,
                AVG(hit_count) as avg_hits
            FROM enriched_data_cache
        """)
        
        return {
            'jobs': dict(stats) if stats else {},
            'cache': dict(cache_stats) if cache_stats else {}
        }

