/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - LINKEDIN EXTENSION BACKGROUND                            ║
 * ║  Service Worker für LinkedIn Automation                                   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

const API_BASE = 'http://localhost:8000/api/v1';

// =============================================================================
// STORAGE
// =============================================================================

async function getAuthToken() {
  const result = await chrome.storage.local.get(['auth_token']);
  return result.auth_token;
}

async function setAuthToken(token) {
  await chrome.storage.local.set({ auth_token: token });
}

async function getActionQueue() {
  const result = await chrome.storage.local.get(['action_queue']);
  return result.action_queue || [];
}

async function setActionQueue(queue) {
  await chrome.storage.local.set({ action_queue: queue });
}

// =============================================================================
// API CALLS
// =============================================================================

async function fetchPendingActions() {
  const token = await getAuthToken();
  if (!token) return [];
  
  try {
    const response = await fetch(`${API_BASE}/linkedin/pending-actions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.actions || [];
    }
  } catch (error) {
    console.error('Failed to fetch pending actions:', error);
  }
  
  return [];
}

async function reportActionResult(actionId, success, details = {}) {
  const token = await getAuthToken();
  if (!token) return;
  
  try {
    await fetch(`${API_BASE}/linkedin/action-result`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action_id: actionId,
        success,
        ...details,
      }),
    });
  } catch (error) {
    console.error('Failed to report action result:', error);
  }
}

// =============================================================================
// ACTION PROCESSING
// =============================================================================

async function processNextAction() {
  const queue = await getActionQueue();
  if (queue.length === 0) return null;
  
  const action = queue[0];
  
  // Send to content script
  const tabs = await chrome.tabs.query({ url: 'https://www.linkedin.com/*' });
  
  if (tabs.length === 0) {
    console.log('No LinkedIn tab open');
    return null;
  }
  
  try {
    const response = await chrome.tabs.sendMessage(tabs[0].id, {
      type: 'EXECUTE_ACTION',
      action,
    });
    
    if (response?.success) {
      // Remove from queue
      queue.shift();
      await setActionQueue(queue);
      
      // Report success
      await reportActionResult(action.id, true, response.details);
    } else {
      // Report failure
      await reportActionResult(action.id, false, { error: response?.error });
      
      // Remove from queue anyway (don't retry infinitely)
      queue.shift();
      await setActionQueue(queue);
    }
    
    return response;
  } catch (error) {
    console.error('Failed to execute action:', error);
    return null;
  }
}

// =============================================================================
// MESSAGE HANDLERS
// =============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_AUTH_TOKEN') {
    setAuthToken(message.token).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.type === 'GET_AUTH_TOKEN') {
    getAuthToken().then((token) => {
      sendResponse({ token });
    });
    return true;
  }
  
  if (message.type === 'FETCH_ACTIONS') {
    fetchPendingActions().then((actions) => {
      setActionQueue(actions);
      sendResponse({ actions });
    });
    return true;
  }
  
  if (message.type === 'PROCESS_NEXT') {
    processNextAction().then((result) => {
      sendResponse(result);
    });
    return true;
  }
  
  if (message.type === 'GET_QUEUE_STATUS') {
    getActionQueue().then((queue) => {
      sendResponse({ queue_length: queue.length, queue });
    });
    return true;
  }
});

// =============================================================================
// PERIODIC SYNC
// =============================================================================

// Check for new actions every 5 minutes
chrome.alarms.create('sync-actions', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'sync-actions') {
    const actions = await fetchPendingActions();
    if (actions.length > 0) {
      await setActionQueue(actions);
      console.log(`Synced ${actions.length} pending actions`);
    }
  }
});

console.log('AURA OS AI Extension loaded');

