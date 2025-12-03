/**
 * Deep Linking Configuration
 * Handles navigation via URLs (push notifications, emails, etc.)
 */

export const deepLinkingConfig = {
  prefixes: [
    'salesflow://',
    'https://salesflow.ai',
    'https://*.salesflow.ai'
  ],
  config: {
    screens: {
      // Tab Navigator
      '(tabs)': {
        screens: {
          // Today Screen
          index: {
            path: 'today',
          },
          // Follow-ups
          follow_ups: {
            path: 'follow-ups',
          },
          // Speed Hunter
          speed_hunter: {
            path: 'speed-hunter',
          },
          hunter: {
            path: 'hunter',
          },
          // Squad
          squad: {
            path: 'squad',
          },
          // Field Ops
          field_ops: {
            path: 'field-ops',
          },
          // Notifications
          notifications: {
            path: 'notifications',
          },
          // Search
          search: {
            path: 'search',
          },
          // Profile
          profile: {
            path: 'profile',
          },
        },
      },
      // Lead Detail
      'lead-detail': {
        path: 'lead/:leadId',
        parse: {
          leadId: (leadId: string) => leadId,
        },
      },
      // Chat with Lead
      'chat/:leadId': {
        path: 'chat/:leadId',
        parse: {
          leadId: (leadId: string) => leadId,
        },
      },
      // Not found
      NotFound: '*',
    },
  },
};

/**
 * Parse deep link URL and extract parameters
 */
export function parseDeepLink(url: string): { screen: string; params: any } | null {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.replace(/^\//, '');
    const searchParams = Object.fromEntries(urlObj.searchParams);

    // Lead detail
    if (path.startsWith('lead/')) {
      const leadId = path.split('/')[1];
      return {
        screen: 'lead-detail',
        params: { leadId, ...searchParams },
      };
    }

    // Chat
    if (path.startsWith('chat/')) {
      const leadId = path.split('/')[1];
      return {
        screen: `chat/${leadId}`,
        params: { leadId, ...searchParams },
      };
    }

    // Tab screens
    const tabScreens = [
      'today',
      'follow-ups',
      'speed-hunter',
      'hunter',
      'squad',
      'field-ops',
      'notifications',
      'search',
      'profile',
    ];

    if (tabScreens.includes(path)) {
      return {
        screen: `(tabs)/${path}`,
        params: searchParams,
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to parse deep link:', error);
    return null;
  }
}

/**
 * Build deep link URL
 */
export function buildDeepLink(screen: string, params?: Record<string, any>): string {
  const baseUrl = 'salesflow://';
  
  let path = screen;
  if (params) {
    const queryParams = new URLSearchParams(params).toString();
    path = `${screen}${queryParams ? `?${queryParams}` : ''}`;
  }
  
  return `${baseUrl}${path}`;
}

/**
 * Example deep link URLs:
 * 
 * - salesflow://today
 * - salesflow://lead/123
 * - salesflow://chat/123
 * - salesflow://follow-ups?filter=overdue
 * - salesflow://notifications?type=reminder
 */

