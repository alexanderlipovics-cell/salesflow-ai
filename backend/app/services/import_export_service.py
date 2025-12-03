"""
Import/Export Service
Handles data migration from CSV, Salesforce, HubSpot, etc.
"""

import pandas as pd
import json
import io
from typing import Dict, List, Optional
import asyncio
from datetime import datetime


class ImportExportService:
    """Data Import/Export"""
    
    def __init__(self, db, openai_client):
        self.db = db
        self.openai_client = openai_client
    
    async def ai_field_mapping(
        self,
        csv_headers: List[str],
        sample_data: List[Dict]
    ) -> Dict[str, str]:
        """
        Use GPT-4 to automatically map CSV fields to our schema.
        """
        
        prompt = f"""Analyze these CSV headers and sample data, then map them to our CRM fields.

CSV Headers: {csv_headers}

Sample Data (first 3 rows):
{json.dumps(sample_data[:3], indent=2)}

Our CRM Fields:
- name (Lead's full name)
- email
- phone
- company
- job_title
- source
- notes
- status (new, contacted, qualified, etc.)

Return ONLY a JSON mapping object like:
{{"First Name": "name", "Email Address": "email", "Phone": "phone"}}

Be smart about variations (e.g., "E-mail" → "email", "Company Name" → "company")
"""
        
        response = await self.openai_client.chat.completions.create(
            model="gpt-4",
            temperature=0.1,
            messages=[
                {"role": "system", "content": "You are a data mapping expert. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ]
        )
        
        mapping_text = response.choices[0].message.content.strip()
        # Remove markdown code blocks if present
        mapping_text = mapping_text.replace('```json', '').replace('```', '').strip()
        
        return json.loads(mapping_text)
    
    async def import_csv(
        self,
        user_id: str,
        file_content: bytes,
        file_name: str,
        manual_mapping: Optional[Dict] = None
    ) -> str:
        """
        Import leads from CSV file.
        """
        
        # Parse CSV
        df = pd.read_csv(io.BytesIO(file_content))
        
        # Create job
        job_id = await self.db.fetchval("""
            INSERT INTO import_jobs (
                user_id, import_type, file_name, file_size,
                total_rows, status, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id
        """,
            user_id, 'csv', file_name, len(file_content),
            len(df), 'processing'
        )
        
        # Get or generate mapping
        if not manual_mapping:
            sample_data = df.head(3).to_dict('records')
            mapping = await self.ai_field_mapping(list(df.columns), sample_data)
        else:
            mapping = manual_mapping
        
        # Save mapping
        await self.db.execute("""
            UPDATE import_jobs
            SET field_mapping = $1
            WHERE id = $2
        """, json.dumps(mapping), job_id)
        
        # Process rows
        asyncio.create_task(self._process_import(job_id, df, mapping, user_id))
        
        return job_id
    
    async def _process_import(
        self,
        job_id: str,
        df: pd.DataFrame,
        mapping: Dict,
        user_id: str
    ):
        """Process import in background."""
        
        created = 0
        updated = 0
        skipped = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Map fields
                lead_data = {}
                for csv_field, our_field in mapping.items():
                    if csv_field in row and pd.notna(row[csv_field]):
                        lead_data[our_field] = str(row[csv_field])
                
                # Check for duplicate
                existing = None
                if 'email' in lead_data:
                    existing = await self.db.fetchval("""
                        SELECT id FROM leads
                        WHERE user_id = $1 AND email = $2
                    """, user_id, lead_data['email'])
                
                if existing:
                    # Update existing lead
                    update_fields = []
                    update_values = [existing]
                    param_idx = 2
                    
                    for key, value in lead_data.items():
                        if key != 'email':
                            update_fields.append(f"{key} = ${param_idx}")
                            update_values.append(value)
                            param_idx += 1
                    
                    if update_fields:
                        query = f"""
                            UPDATE leads 
                            SET {', '.join(update_fields)}, updated_at = NOW()
                            WHERE id = $1
                        """
                        await self.db.execute(query, *update_values)
                    
                    updated += 1
                else:
                    # Create new lead
                    await self.db.execute("""
                        INSERT INTO leads (
                            user_id, name, email, phone, company, 
                            job_title, source, notes, status, created_at
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                    """,
                        user_id,
                        lead_data.get('name'),
                        lead_data.get('email'),
                        lead_data.get('phone'),
                        lead_data.get('company'),
                        lead_data.get('job_title'),
                        lead_data.get('source', 'import'),
                        lead_data.get('notes'),
                        lead_data.get('status', 'new')
                    )
                    created += 1
                
                # Update progress
                await self.db.execute("""
                    UPDATE import_jobs
                    SET processed_rows = $1
                    WHERE id = $2
                """, idx + 1, job_id)
                
            except Exception as e:
                errors.append({'row': idx + 1, 'error': str(e)})
                skipped += 1
        
        # Complete job
        await self.db.execute("""
            UPDATE import_jobs
            SET status = $1,
                created_leads = $2,
                updated_leads = $3,
                skipped_rows = $4,
                errors = $5,
                completed_at = NOW()
            WHERE id = $6
        """,
            'completed',
            created,
            updated,
            skipped,
            json.dumps(errors) if errors else None,
            job_id
        )
    
    async def export_leads(
        self,
        user_id: str,
        export_format: str = 'csv',
        filters: Optional[Dict] = None
    ) -> str:
        """
        Export leads to file.
        """
        
        # Create job
        job_id = await self.db.fetchval("""
            INSERT INTO export_jobs (
                user_id, export_type, export_scope, filters,
                status, created_at
            )
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING id
        """,
            user_id,
            export_format,
            'all_leads' if not filters else 'filtered_leads',
            json.dumps(filters) if filters else None,
            'processing'
        )
        
        # Process export
        asyncio.create_task(self._process_export(job_id, user_id, export_format, filters))
        
        return job_id
    
    async def _process_export(
        self,
        job_id: str,
        user_id: str,
        export_format: str,
        filters: Optional[Dict]
    ):
        """Process export in background."""
        
        # Get leads
        query = "SELECT * FROM leads WHERE user_id = $1"
        params = [user_id]
        
        # Apply filters
        if filters:
            if filters.get('status'):
                query += " AND status = $2"
                params.append(filters['status'])
            if filters.get('source'):
                query += f" AND source = ${len(params) + 1}"
                params.append(filters['source'])
        
        leads = await self.db.fetch(query, *params)
        
        # Convert to DataFrame
        df = pd.DataFrame([dict(l) for l in leads])
        
        # Export
        if export_format == 'csv':
            output = io.StringIO()
            df.to_csv(output, index=False)
            file_content = output.getvalue().encode()
            file_path = f"exports/{job_id}.csv"
            content_type = 'text/csv'
        
        elif export_format == 'excel':
            output = io.BytesIO()
            df.to_excel(output, index=False, engine='openpyxl')
            file_content = output.getvalue()
            file_path = f"exports/{job_id}.xlsx"
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        
        elif export_format == 'json':
            file_content = json.dumps([dict(l) for l in leads], default=str, indent=2).encode()
            file_path = f"exports/{job_id}.json"
            content_type = 'application/json'
        
        # Save file (to local storage - in production use S3)
        import os
        os.makedirs('exports', exist_ok=True)
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        download_url = f"/api/import-export/download/{job_id}"
        
        # Update job
        await self.db.execute("""
            UPDATE export_jobs
            SET status = $1,
                total_records = $2,
                file_path = $3,
                file_size = $4,
                download_url = $5,
                content_type = $6,
                expires_at = NOW() + INTERVAL '24 hours',
                completed_at = NOW()
            WHERE id = $7
        """,
            'completed',
            len(leads),
            file_path,
            len(file_content),
            download_url,
            content_type,
            job_id
        )
    
    async def get_export_file(self, job_id: str) -> tuple[bytes, str]:
        """Get export file content and content type."""
        
        job = await self.db.fetchrow("""
            SELECT file_path, content_type, expires_at
            FROM export_jobs
            WHERE id = $1
        """, job_id)
        
        if not job:
            raise FileNotFoundError("Export job not found")
        
        if job['expires_at'] and datetime.now() > job['expires_at']:
            raise FileNotFoundError("Export has expired")
        
        with open(job['file_path'], 'rb') as f:
            content = f.read()
        
        return content, job['content_type']

