"""
Video Meeting Models
Zoom, Teams, Google Meet integration
"""

from sqlalchemy import Column, String, DateTime, Boolean, JSON, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class VideoMeeting(Base):
    """Video Meeting Model"""
    __tablename__ = "video_meetings"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    lead_id = Column(String, ForeignKey("leads.id"), nullable=True)
    
    # Platform info
    platform = Column(String, nullable=False)  # 'zoom', 'teams', 'google_meet'
    platform_meeting_id = Column(String, nullable=False)
    
    # Meeting details
    title = Column(String, nullable=False)
    join_url = Column(String, nullable=False)
    host_url = Column(String, nullable=True)
    password = Column(String, nullable=True)
    
    # Scheduling
    scheduled_start = Column(DateTime, nullable=False)
    scheduled_end = Column(DateTime, nullable=False)
    actual_start = Column(DateTime, nullable=True)
    actual_end = Column(DateTime, nullable=True)
    
    # Status
    status = Column(String, default='scheduled')  # 'scheduled', 'in_progress', 'completed', 'cancelled'
    
    # Recording & Transcript
    has_recording = Column(Boolean, default=False)
    recording_url = Column(String, nullable=True)
    recording_download_url = Column(String, nullable=True)
    has_transcript = Column(Boolean, default=False)
    
    # AI Analysis Results
    ai_summary = Column(Text, nullable=True)
    key_topics = Column(JSON, nullable=True)  # Array of topics
    action_items = Column(JSON, nullable=True)  # Array of action items
    sentiment_analysis = Column(JSON, nullable=True)  # Sentiment data
    
    # Metadata
    duration_minutes = Column(Integer, nullable=True)
    participants_count = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="video_meetings")
    lead = relationship("Lead", back_populates="video_meetings")
    transcript = relationship("MeetingTranscript", back_populates="meeting", uselist=False)
    participants = relationship("MeetingParticipant", back_populates="meeting")


class MeetingTranscript(Base):
    """Meeting Transcript Model"""
    __tablename__ = "meeting_transcripts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String, ForeignKey("video_meetings.id"), nullable=False)
    
    # Transcript data
    transcript_text = Column(Text, nullable=False)
    transcript_vtt = Column(Text, nullable=True)  # WebVTT format
    language = Column(String, default='de')
    
    # Processing
    is_processed = Column(Boolean, default=False)
    processing_error = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    meeting = relationship("VideoMeeting", back_populates="transcript")


class MeetingParticipant(Base):
    """Meeting Participant Model"""
    __tablename__ = "meeting_participants"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String, ForeignKey("video_meetings.id"), nullable=False)
    
    # Participant info
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    # Participation stats
    joined_at = Column(DateTime, nullable=True)
    left_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    
    # Relationships
    meeting = relationship("VideoMeeting", back_populates="participants")
    user = relationship("User")


class VideoIntegration(Base):
    """User's Video Platform Integrations"""
    __tablename__ = "video_integrations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Platform
    platform = Column(String, nullable=False)  # 'zoom', 'teams', 'google_meet'
    
    # OAuth tokens (encrypted)
    access_token = Column(String, nullable=False)
    refresh_token = Column(String, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    
    # Platform-specific data
    platform_user_id = Column(String, nullable=True)
    platform_email = Column(String, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    connected_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="video_integrations")

