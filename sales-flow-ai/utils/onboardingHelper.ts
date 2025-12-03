import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Helper functions for managing onboarding state
 */

export const OnboardingHelper = {
  /**
   * Check if user has completed onboarding
   */
  async isOnboardingComplete(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem('onboarding_completed');
      return value === 'true';
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      return false;
    }
  },

  /**
   * Mark onboarding as complete
   */
  async completeOnboarding(): Promise<void> {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
    } catch (error) {
      console.error('Failed to save onboarding status:', error);
    }
  },

  /**
   * Check if tutorial has been shown
   */
  async isTutorialShown(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem('tutorial_shown');
      return value === 'true';
    } catch (error) {
      console.error('Failed to check tutorial status:', error);
      return false;
    }
  },

  /**
   * Mark tutorial as shown
   */
  async markTutorialShown(): Promise<void> {
    try {
      await AsyncStorage.setItem('tutorial_shown', 'true');
    } catch (error) {
      console.error('Failed to save tutorial status:', error);
    }
  },

  /**
   * Get checklist progress
   */
  async getChecklistProgress(): Promise<string[]> {
    try {
      const value = await AsyncStorage.getItem('checklist_progress');
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Failed to get checklist progress:', error);
      return [];
    }
  },

  /**
   * Update checklist progress
   */
  async updateChecklistProgress(completedItems: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem('checklist_progress', JSON.stringify(completedItems));
    } catch (error) {
      console.error('Failed to save checklist progress:', error);
    }
  },

  /**
   * Mark a specific checklist item as complete
   */
  async markChecklistItemComplete(itemId: string): Promise<void> {
    try {
      const progress = await this.getChecklistProgress();
      if (!progress.includes(itemId)) {
        progress.push(itemId);
        await this.updateChecklistProgress(progress);
      }
    } catch (error) {
      console.error('Failed to mark checklist item complete:', error);
    }
  },

  /**
   * Reset all onboarding progress (useful for testing)
   */
  async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'onboarding_completed',
        'tutorial_shown',
        'checklist_progress',
        'tooltips_shown'
      ]);
    } catch (error) {
      console.error('Failed to reset onboarding:', error);
    }
  },

  /**
   * Get tooltips that have been shown
   */
  async getShownTooltips(): Promise<string[]> {
    try {
      const value = await AsyncStorage.getItem('tooltips_shown');
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Failed to get shown tooltips:', error);
      return [];
    }
  },

  /**
   * Mark a tooltip as shown
   */
  async markTooltipShown(tooltipId: string): Promise<void> {
    try {
      const shown = await this.getShownTooltips();
      if (!shown.includes(tooltipId)) {
        shown.push(tooltipId);
        await AsyncStorage.setItem('tooltips_shown', JSON.stringify(shown));
      }
    } catch (error) {
      console.error('Failed to mark tooltip shown:', error);
    }
  },
};

