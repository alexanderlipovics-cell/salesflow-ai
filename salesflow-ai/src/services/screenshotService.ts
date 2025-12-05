/**
 * Screenshot Import Service
 * 
 * API Integration für die Screenshot-to-Lead Pipeline.
 * Verbindet Frontend mit Gemini's GPT-4o Vision Backend.
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../config/apiConfig';

// ============================================
// TYPES
// ============================================

export interface LeadFromImage {
  platform: string;
  username_handle?: string;
  display_name?: string;
  bio_text_raw?: string;
  detected_keywords: string[];
  website_link?: string;
  email_detected?: string;
  phone_detected?: string;
  location?: string;
  follower_count_estimate?: string;
  following_count?: string;
  post_count?: string;
  is_business_account: boolean;
  is_creator_account: boolean;
  industry_guess?: string;
  lead_intent: 'business' | 'product' | 'both' | 'unclear';
  network_marketing_signals: string[];
  confidence_score: number;
  suggested_icebreaker_topic?: string;
  suggested_first_message?: string;
}

export interface ScreenshotUploadResponse {
  status: string;
  lead_id: string;
  lead_name: string;
  platform: string;
  icebreaker?: string;
  suggested_message?: string;
  confidence: number;
  message: string;
}

export interface SupportedPlatform {
  id: string;
  name: string;
  icon: string;
  tips: string[];
}

// ============================================
// API FUNCTIONS
// ============================================

export async function analyzeScreenshot(file: File): Promise<LeadFromImage> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/screenshot/analyze`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Screenshot analysis failed');
  }

  return response.json();
}

export async function importScreenshot(
  file: File,
  autoCreate: boolean = true
): Promise<ScreenshotUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const url = new URL(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/screenshot/import`
  );
  url.searchParams.set('auto_create', String(autoCreate));

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Screenshot import failed');
  }

  return response.json();
}

export async function getSupportedPlatforms(): Promise<{
  platforms: SupportedPlatform[];
  supported_formats: string[];
  max_file_size_mb: number;
  avg_processing_time_seconds: number;
}> {
  const response = await apiClient.get<{
    platforms: SupportedPlatform[];
    supported_formats: string[];
    max_file_size_mb: number;
    avg_processing_time_seconds: number;
  }>(API_ENDPOINTS.SCREENSHOT.PLATFORMS);
  return response.data;
}

export async function getScreenshotTips(): Promise<{
  do: string[];
  dont: string[];
  best_practices: string[];
}> {
  const response = await apiClient.get<{
    do: string[];
    dont: string[];
    best_practices: string[];
  }>(API_ENDPOINTS.SCREENSHOT.TIPS);
  return response.data;
}

// ============================================
// REACT QUERY KEYS
// ============================================

export const screenshotQueryKeys = {
  platforms: ['screenshot', 'platforms'] as const,
  tips: ['screenshot', 'tips'] as const,
};

export default {
  analyzeScreenshot,
  importScreenshot,
  getSupportedPlatforms,
  getScreenshotTips,
};

