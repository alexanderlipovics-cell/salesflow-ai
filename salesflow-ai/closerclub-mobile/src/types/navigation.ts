/**
 * Navigation Types für CloserClub Mobile
 */

export type RootStackParamList = {
  Dashboard: undefined;
  SpeedHunter: undefined;
  LeadManagement: undefined;
  AICoach: undefined;
  LeadDetail: { leadId: string };
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

