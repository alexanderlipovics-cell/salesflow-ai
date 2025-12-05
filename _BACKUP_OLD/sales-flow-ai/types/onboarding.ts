// types/onboarding.ts

export interface OnboardingStep {
  id: string;
  type: 'welcome' | 'company' | 'profile' | 'permissions' | 'tutorial';
  title: string;
  description: string;
  image?: string;
  required: boolean;
  completed: boolean;
}

export interface OnboardingState {
  isFirstLaunch: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  completedAt?: string;
  skipped: boolean;
}

export interface WelcomeSlide {
  id: string;
  title: string;
  description: string;
  image: string;
  animation?: 'fade' | 'slide' | 'scale';
}

export interface CompanyOption {
  id: string;
  name: string;
  logo: string;
  description: string;
  primary_color: string;
}

export interface PermissionRequest {
  type: 'notifications' | 'contacts' | 'camera' | 'location';
  title: string;
  description: string;
  required: boolean;
  granted: boolean;
}

