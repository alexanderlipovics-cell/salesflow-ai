"""
Video Conferencing Service
Zoom, Teams, Google Meet integration
"""

from typing import Optional, Dict, List
import requests
from datetime import datetime, timedelta
import uuid
import os
import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.video import VideoMeeting, MeetingTranscript, VideoIntegration, MeetingParticipant
from app.database import get_db


class VideoConferencingService:
    """Main Video Service"""
    
    # ═══════════════════════════════════════════════════════════════
    # ZOOM INTEGRATION
    # ═══════════════════════════════════════════════════════════════
    
    async def create_zoom_meeting(
        self,
        user_id: str,
        lead_id: Optional[str],
        title: str,
        start_time: datetime,
        duration_minutes: int = 60,
        db: AsyncSession = None
    ) -> VideoMeeting:
        """Create Zoom meeting"""
        
        # Get Zoom OAuth token for user
        zoom_token = await self._get_zoom_token(user_id, db)
        
        if not zoom_token:
            raise Exception("Zoom not connected. Please connect your Zoom account first.")
        
        # Create meeting via Zoom API
        headers = {
            'Authorization': f'Bearer {zoom_token}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'topic': title,
            'type': 2,  # Scheduled meeting
            'start_time': start_time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'duration': duration_minutes,
            'timezone': 'Europe/Berlin',
            'settings': {
                'host_video': True,
                'participant_video': True,
                'join_before_host': False,
                'mute_upon_entry': False,
                'auto_recording': 'cloud',  # Record to cloud
                'approval_type': 2,  # No registration required
            }
        }
        
        try:
            response = requests.post(
                'https://api.zoom.us/v2/users/me/meetings',
                headers=headers,
                json=data,
                timeout=10
            )
            
            if response.status_code != 201:
                raise Exception(f"Zoom API error: {response.text}")
            
            zoom_data = response.json()
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Zoom API request failed: {str(e)}")
        
        # Save to database
        if db is None:
            async with get_db() as db:
                meeting = await self._save_zoom_meeting(db, user_id, lead_id, title, start_time, duration_minutes, zoom_data)
        else:
            meeting = await self._save_zoom_meeting(db, user_id, lead_id, title, start_time, duration_minutes, zoom_data)
        
        return meeting
    
    async def _save_zoom_meeting(
        self,
        db: AsyncSession,
        user_id: str,
        lead_id: Optional[str],
        title: str,
        start_time: datetime,
        duration_minutes: int,
        zoom_data: dict
    ) -> VideoMeeting:
        """Save Zoom meeting to database"""
        
        meeting = VideoMeeting(
            id=str(uuid.uuid4()),
            user_id=user_id,
            lead_id=lead_id,
            platform='zoom',
            platform_meeting_id=str(zoom_data['id']),
            title=title,
            join_url=zoom_data['join_url'],
            host_url=zoom_data.get('start_url', ''),
            password=zoom_data.get('password'),
            scheduled_start=start_time,
            scheduled_end=start_time + timedelta(minutes=duration_minutes),
            duration_minutes=duration_minutes,
            status='scheduled'
        )
        
        db.add(meeting)
        await db.commit()
        await db.refresh(meeting)
        
        return meeting
    
    async def get_zoom_recording(self, meeting_id: str, db: AsyncSession = None):
        """
        Fetch Zoom recording after meeting ends.
        Zoom sends webhook when recording is ready.
        """
        if db is None:
            async with get_db() as db:
                await self._fetch_zoom_recording(db, meeting_id)
        else:
            await self._fetch_zoom_recording(db, meeting_id)
    
    async def _fetch_zoom_recording(self, db: AsyncSession, meeting_id: str):
        """Internal method to fetch Zoom recording"""
        
        result = await db.execute(
            select(VideoMeeting).where(VideoMeeting.id == meeting_id)
        )
        meeting = result.scalar_one_or_none()
        
        if not meeting or meeting.platform != 'zoom':
            return
        
        zoom_token = await self._get_zoom_token(meeting.user_id, db)
        
        if not zoom_token:
            return
        
        headers = {'Authorization': f'Bearer {zoom_token}'}
        
        try:
            response = requests.get(
                f'https://api.zoom.us/v2/meetings/{meeting.platform_meeting_id}/recordings',
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                recording_data = response.json()
                
                # Save recording URLs
                meeting.has_recording = True
                if recording_data.get('recording_files'):
                    meeting.recording_url = recording_data['recording_files'][0].get('play_url', '')
                    meeting.recording_download_url = recording_data['recording_files'][0].get('download_url', '')
                
                # Download transcript if available
                for file in recording_data.get('recording_files', []):
                    if file.get('file_type') == 'TRANSCRIPT':
                        transcript_url = file.get('download_url')
                        if transcript_url:
                            transcript_text = await self._download_zoom_transcript(transcript_url, zoom_token)
                            
                            if transcript_text:
                                meeting.has_transcript = True
                                
                                # Save transcript
                                transcript_obj = MeetingTranscript(
                                    id=str(uuid.uuid4()),
                                    meeting_id=meeting.id,
                                    transcript_text=transcript_text,
                                    is_processed=False
                                )
                                db.add(transcript_obj)
                
                await db.commit()
                
                # Analyze with AI
                if meeting.has_transcript:
                    await self.analyze_meeting_with_ai(meeting_id, db)
                    
        except requests.exceptions.RequestException as e:
            print(f"Failed to fetch Zoom recording: {str(e)}")
    
    async def _download_zoom_transcript(self, url: str, token: str) -> Optional[str]:
        """Download Zoom transcript file"""
        try:
            headers = {'Authorization': f'Bearer {token}'}
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                return response.text
            
        except requests.exceptions.RequestException:
            pass
        
        return None
    
    async def _get_zoom_token(self, user_id: str, db: AsyncSession) -> Optional[str]:
        """Get Zoom OAuth token for user"""
        
        result = await db.execute(
            select(VideoIntegration).where(
                VideoIntegration.user_id == user_id,
                VideoIntegration.platform == 'zoom',
                VideoIntegration.is_active == True
            )
        )
        integration = result.scalar_one_or_none()
        
        if not integration:
            return None
        
        # Check if token expired
        if integration.token_expires_at and integration.token_expires_at < datetime.utcnow():
            # Refresh token
            refreshed = await self._refresh_zoom_token(integration, db)
            if refreshed:
                return integration.access_token
            return None
        
        return integration.access_token
    
    async def _refresh_zoom_token(self, integration: VideoIntegration, db: AsyncSession) -> bool:
        """Refresh Zoom OAuth token"""
        
        if not integration.refresh_token:
            return False
        
        try:
            response = requests.post(
                'https://zoom.us/oauth/token',
                data={
                    'grant_type': 'refresh_token',
                    'refresh_token': integration.refresh_token
                },
                auth=(
                    os.getenv('ZOOM_CLIENT_ID', ''),
                    os.getenv('ZOOM_CLIENT_SECRET', '')
                ),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                integration.access_token = data['access_token']
                integration.refresh_token = data.get('refresh_token', integration.refresh_token)
                integration.token_expires_at = datetime.utcnow() + timedelta(seconds=data['expires_in'])
                await db.commit()
                return True
                
        except requests.exceptions.RequestException:
            pass
        
        return False
    
    # ═══════════════════════════════════════════════════════════════
    # MICROSOFT TEAMS INTEGRATION
    # ═══════════════════════════════════════════════════════════════
    
    async def create_teams_meeting(
        self,
        user_id: str,
        lead_id: Optional[str],
        title: str,
        start_time: datetime,
        duration_minutes: int = 60,
        db: AsyncSession = None
    ) -> VideoMeeting:
        """Create Microsoft Teams meeting"""
        
        # Get Microsoft Graph token
        graph_token = await self._get_graph_token(user_id, db)
        
        if not graph_token:
            raise Exception("Microsoft Teams not connected. Please connect your Microsoft account first.")
        
        headers = {
            'Authorization': f'Bearer {graph_token}',
            'Content-Type': 'application/json'
        }
        
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        data = {
            'subject': title,
            'start': {
                'dateTime': start_time.strftime('%Y-%m-%dT%H:%M:%S'),
                'timeZone': 'Europe/Berlin'
            },
            'end': {
                'dateTime': end_time.strftime('%Y-%m-%dT%H:%M:%S'),
                'timeZone': 'Europe/Berlin'
            },
            'isOnlineMeeting': True,
            'onlineMeetingProvider': 'teamsForBusiness'
        }
        
        try:
            response = requests.post(
                'https://graph.microsoft.com/v1.0/me/events',
                headers=headers,
                json=data,
                timeout=10
            )
            
            if response.status_code != 201:
                raise Exception(f"Teams API error: {response.text}")
            
            event = response.json()
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Teams API request failed: {str(e)}")
        
        # Save to database
        if db is None:
            async with get_db() as db:
                meeting = await self._save_teams_meeting(db, user_id, lead_id, title, start_time, end_time, event)
        else:
            meeting = await self._save_teams_meeting(db, user_id, lead_id, title, start_time, end_time, event)
        
        return meeting
    
    async def _save_teams_meeting(
        self,
        db: AsyncSession,
        user_id: str,
        lead_id: Optional[str],
        title: str,
        start_time: datetime,
        end_time: datetime,
        event: dict
    ) -> VideoMeeting:
        """Save Teams meeting to database"""
        
        online_meeting = event.get('onlineMeeting', {})
        
        meeting = VideoMeeting(
            id=str(uuid.uuid4()),
            user_id=user_id,
            lead_id=lead_id,
            platform='teams',
            platform_meeting_id=event['id'],
            title=title,
            join_url=online_meeting.get('joinUrl', ''),
            scheduled_start=start_time,
            scheduled_end=end_time,
            duration_minutes=int((end_time - start_time).total_seconds() / 60),
            status='scheduled'
        )
        
        db.add(meeting)
        await db.commit()
        await db.refresh(meeting)
        
        return meeting
    
    async def _get_graph_token(self, user_id: str, db: AsyncSession) -> Optional[str]:
        """Get Microsoft Graph token"""
        
        result = await db.execute(
            select(VideoIntegration).where(
                VideoIntegration.user_id == user_id,
                VideoIntegration.platform == 'teams',
                VideoIntegration.is_active == True
            )
        )
        integration = result.scalar_one_or_none()
        
        if not integration:
            return None
        
        # Check if token expired
        if integration.token_expires_at and integration.token_expires_at < datetime.utcnow():
            # Refresh token
            refreshed = await self._refresh_graph_token(integration, db)
            if refreshed:
                return integration.access_token
            return None
        
        return integration.access_token
    
    async def _refresh_graph_token(self, integration: VideoIntegration, db: AsyncSession) -> bool:
        """Refresh Microsoft Graph token"""
        
        if not integration.refresh_token:
            return False
        
        try:
            response = requests.post(
                f'https://login.microsoftonline.com/common/oauth2/v2.0/token',
                data={
                    'client_id': os.getenv('MICROSOFT_CLIENT_ID', ''),
                    'client_secret': os.getenv('MICROSOFT_CLIENT_SECRET', ''),
                    'refresh_token': integration.refresh_token,
                    'grant_type': 'refresh_token',
                    'scope': 'https://graph.microsoft.com/.default'
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                integration.access_token = data['access_token']
                integration.refresh_token = data.get('refresh_token', integration.refresh_token)
                integration.token_expires_at = datetime.utcnow() + timedelta(seconds=data['expires_in'])
                await db.commit()
                return True
                
        except requests.exceptions.RequestException:
            pass
        
        return False
    
    # ═══════════════════════════════════════════════════════════════
    # GOOGLE MEET INTEGRATION
    # ═══════════════════════════════════════════════════════════════
    
    async def create_google_meet(
        self,
        user_id: str,
        lead_id: Optional[str],
        title: str,
        start_time: datetime,
        duration_minutes: int = 60,
        db: AsyncSession = None
    ) -> VideoMeeting:
        """Create Google Meet via Calendar API"""
        
        try:
            from google.oauth2.credentials import Credentials
            from googleapiclient.discovery import build
        except ImportError:
            raise Exception("Google API client not installed. Please install google-api-python-client and google-auth-httplib2")
        
        # Get Google Calendar credentials
        creds = await self._get_google_calendar_creds(user_id, db)
        
        if not creds:
            raise Exception("Google Calendar not connected. Please connect your Google account first.")
        
        try:
            service = build('calendar', 'v3', credentials=creds)
            
            end_time = start_time + timedelta(minutes=duration_minutes)
            
            event = {
                'summary': title,
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': 'Europe/Berlin',
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': 'Europe/Berlin',
                },
                'conferenceData': {
                    'createRequest': {
                        'requestId': str(uuid.uuid4()),
                        'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                    }
                }
            }
            
            created_event = service.events().insert(
                calendarId='primary',
                body=event,
                conferenceDataVersion=1
            ).execute()
            
        except Exception as e:
            raise Exception(f"Google Calendar API error: {str(e)}")
        
        # Save to database
        if db is None:
            async with get_db() as db:
                meeting = await self._save_google_meet(db, user_id, lead_id, title, start_time, end_time, created_event)
        else:
            meeting = await self._save_google_meet(db, user_id, lead_id, title, start_time, end_time, created_event)
        
        return meeting
    
    async def _save_google_meet(
        self,
        db: AsyncSession,
        user_id: str,
        lead_id: Optional[str],
        title: str,
        start_time: datetime,
        end_time: datetime,
        event: dict
    ) -> VideoMeeting:
        """Save Google Meet to database"""
        
        meeting = VideoMeeting(
            id=str(uuid.uuid4()),
            user_id=user_id,
            lead_id=lead_id,
            platform='google_meet',
            platform_meeting_id=event['id'],
            title=title,
            join_url=event.get('hangoutLink', ''),
            scheduled_start=start_time,
            scheduled_end=end_time,
            duration_minutes=int((end_time - start_time).total_seconds() / 60),
            status='scheduled'
        )
        
        db.add(meeting)
        await db.commit()
        await db.refresh(meeting)
        
        return meeting
    
    async def _get_google_calendar_creds(self, user_id: str, db: AsyncSession):
        """Get Google Calendar credentials"""
        
        try:
            from google.oauth2.credentials import Credentials
        except ImportError:
            return None
        
        result = await db.execute(
            select(VideoIntegration).where(
                VideoIntegration.user_id == user_id,
                VideoIntegration.platform == 'google_meet',
                VideoIntegration.is_active == True
            )
        )
        integration = result.scalar_one_or_none()
        
        if not integration:
            return None
        
        creds = Credentials(
            token=integration.access_token,
            refresh_token=integration.refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=os.getenv('GOOGLE_CLIENT_ID', ''),
            client_secret=os.getenv('GOOGLE_CLIENT_SECRET', '')
        )
        
        return creds
    
    # ═══════════════════════════════════════════════════════════════
    # AI ANALYSIS
    # ═══════════════════════════════════════════════════════════════
    
    async def analyze_meeting_with_ai(self, meeting_id: str, db: AsyncSession = None):
        """
        Use GPT-4 to analyze meeting transcript:
        - Key topics discussed
        - Action items
        - Sentiment analysis
        - Summary
        """
        
        if db is None:
            async with get_db() as db:
                await self._analyze_meeting(db, meeting_id)
        else:
            await self._analyze_meeting(db, meeting_id)
    
    async def _analyze_meeting(self, db: AsyncSession, meeting_id: str):
        """Internal method to analyze meeting"""
        
        try:
            from openai import OpenAI
        except ImportError:
            print("OpenAI not installed. Skipping AI analysis.")
            return
        
        # Get meeting
        result = await db.execute(
            select(VideoMeeting).where(VideoMeeting.id == meeting_id)
        )
        meeting = result.scalar_one_or_none()
        
        if not meeting:
            return
        
        # Get transcript
        transcript_result = await db.execute(
            select(MeetingTranscript).where(MeetingTranscript.meeting_id == meeting_id)
        )
        transcript_obj = transcript_result.scalar_one_or_none()
        
        if not transcript_obj or not transcript_obj.transcript_text:
            return
        
        transcript_text = transcript_obj.transcript_text
        
        # Analyze with OpenAI
        try:
            client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
            
            prompt = f"""
Analysiere dieses Sales-Meeting-Transkript und extrahiere:

1. Key Topics: Welche Themen wurden besprochen?
2. Action Items: Was muss als Nächstes getan werden?
3. Sentiment: Wie lief das Gespräch? (positive/neutral/negative)
4. Summary: Kurze 2-3 Satz Zusammenfassung

Transkript:
{transcript_text[:8000]}

Gib JSON zurück:
{{
  "key_topics": ["Thema1", "Thema2"],
  "action_items": ["Action1", "Action2"],
  "sentiment": "positive|neutral|negative",
  "summary": "Kurze Zusammenfassung"
}}
"""
            
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            
            analysis = json.loads(response.choices[0].message.content)
            
            # Update meeting
            meeting.ai_summary = analysis.get('summary', '')
            meeting.key_topics = analysis.get('key_topics', [])
            meeting.action_items = analysis.get('action_items', [])
            meeting.sentiment_analysis = {'overall': analysis.get('sentiment', 'neutral')}
            
            # Mark transcript as processed
            transcript_obj.is_processed = True
            
            await db.commit()
            
        except Exception as e:
            print(f"AI analysis failed: {str(e)}")
            transcript_obj.processing_error = str(e)
            await db.commit()
    
    # ═══════════════════════════════════════════════════════════════
    # MEETING MANAGEMENT
    # ═══════════════════════════════════════════════════════════════
    
    async def get_user_meetings(
        self,
        user_id: str,
        upcoming: bool = True,
        limit: int = 50,
        db: AsyncSession = None
    ) -> List[VideoMeeting]:
        """Get user's meetings"""
        
        if db is None:
            async with get_db() as db:
                return await self._get_user_meetings(db, user_id, upcoming, limit)
        else:
            return await self._get_user_meetings(db, user_id, upcoming, limit)
    
    async def _get_user_meetings(
        self,
        db: AsyncSession,
        user_id: str,
        upcoming: bool,
        limit: int
    ) -> List[VideoMeeting]:
        """Internal method to get user meetings"""
        
        query = select(VideoMeeting).where(VideoMeeting.user_id == user_id)
        
        if upcoming:
            query = query.where(VideoMeeting.scheduled_start >= datetime.utcnow())
            query = query.order_by(VideoMeeting.scheduled_start.asc())
        else:
            query = query.where(VideoMeeting.scheduled_start < datetime.utcnow())
            query = query.order_by(VideoMeeting.scheduled_start.desc())
        
        query = query.limit(limit)
        
        result = await db.execute(query)
        meetings = result.scalars().all()
        
        return list(meetings)
    
    async def get_meeting_by_id(
        self,
        meeting_id: str,
        db: AsyncSession = None
    ) -> Optional[VideoMeeting]:
        """Get meeting by ID"""
        
        if db is None:
            async with get_db() as db:
                return await self._get_meeting_by_id(db, meeting_id)
        else:
            return await self._get_meeting_by_id(db, meeting_id)
    
    async def _get_meeting_by_id(
        self,
        db: AsyncSession,
        meeting_id: str
    ) -> Optional[VideoMeeting]:
        """Internal method to get meeting by ID"""
        
        result = await db.execute(
            select(VideoMeeting).where(VideoMeeting.id == meeting_id)
        )
        meeting = result.scalar_one_or_none()
        
        return meeting
    
    async def cancel_meeting(
        self,
        meeting_id: str,
        user_id: str,
        db: AsyncSession = None
    ) -> bool:
        """Cancel meeting"""
        
        if db is None:
            async with get_db() as db:
                return await self._cancel_meeting(db, meeting_id, user_id)
        else:
            return await self._cancel_meeting(db, meeting_id, user_id)
    
    async def _cancel_meeting(
        self,
        db: AsyncSession,
        meeting_id: str,
        user_id: str
    ) -> bool:
        """Internal method to cancel meeting"""
        
        result = await db.execute(
            select(VideoMeeting).where(
                VideoMeeting.id == meeting_id,
                VideoMeeting.user_id == user_id
            )
        )
        meeting = result.scalar_one_or_none()
        
        if not meeting:
            return False
        
        # Cancel on platform
        # TODO: Implement platform-specific cancellation
        
        # Update status
        meeting.status = 'cancelled'
        await db.commit()
        
        return True


# Initialize service
video_service = VideoConferencingService()

