import * as Haptics from 'expo-haptics';

/**
 * Haptic Feedback Service
 * Provides tactile feedback for user interactions
 */
class HapticService {
  // Light tap feedback (button press)
  async light() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // Medium tap feedback (standard interaction)
  async medium() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  // Heavy tap feedback (important action)
  async heavy() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  // Success feedback (deal closed, task completed)
  async success() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // Warning feedback (missing data, validation error)
  async warning() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  // Error feedback (failed action)
  async error() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  // Selection changed (picker, toggle)
  async selection() {
    await Haptics.selectionAsync();
  }

  // Custom patterns for specific actions
  async dealClosed() {
    // Double success vibration
    await this.success();
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.success();
  }

  async newLead() {
    // Light + Medium pattern
    await this.light();
    await new Promise(resolve => setTimeout(resolve, 50));
    await this.medium();
  }

  async followUpReminder() {
    // Three quick light taps
    await this.light();
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.light();
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.light();
  }
}

export default new HapticService();

