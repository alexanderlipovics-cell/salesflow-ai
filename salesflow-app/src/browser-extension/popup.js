/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - POPUP SCRIPT                                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const loggedOutSection = document.getElementById('logged-out');
const loggedInSection = document.getElementById('logged-in');
const apiTokenInput = document.getElementById('api-token');
const connectBtn = document.getElementById('connect-btn');
const statusMessage = document.getElementById('status-message');
const queueCount = document.getElementById('queue-count');
const sentToday = document.getElementById('sent-today');
const successRate = document.getElementById('success-rate');
const processBtn = document.getElementById('process-btn');
const syncBtn = document.getElementById('sync-btn');
const logoutBtn = document.getElementById('logout-btn');
const queueList = document.getElementById('queue-list');

// =============================================================================
// INIT
// =============================================================================

async function init() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' });
  
  if (response?.token) {
    showLoggedIn();
    await updateStatus();
  } else {
    showLoggedOut();
  }
}

function showLoggedIn() {
  loggedOutSection.style.display = 'none';
  loggedInSection.style.display = 'block';
}

function showLoggedOut() {
  loggedOutSection.style.display = 'block';
  loggedInSection.style.display = 'none';
}

// =============================================================================
// STATUS UPDATE
// =============================================================================

async function updateStatus() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_QUEUE_STATUS' });
  
  queueCount.textContent = response?.queue_length || 0;
  
  // Update queue list
  if (response?.queue && response.queue.length > 0) {
    queueList.innerHTML = response.queue.slice(0, 5).map(action => `
      <div class="queue-item">
        <div class="queue-icon">${getActionIcon(action.action_type)}</div>
        <div class="queue-info">
          <div class="queue-title">${getActionLabel(action.action_type)}</div>
          <div class="queue-subtitle">${action.linkedin_url?.split('/in/')[1]?.split('/')[0] || 'Unknown'}</div>
        </div>
      </div>
    `).join('');
  } else {
    queueList.innerHTML = '<p style="text-align: center; color: #64748b; font-size: 12px;">Keine Aktionen in der Queue</p>';
  }
  
  // Load stats from storage
  const stats = await chrome.storage.local.get(['sent_today', 'success_count', 'total_count']);
  sentToday.textContent = stats.sent_today || 0;
  
  const total = stats.total_count || 0;
  const success = stats.success_count || 0;
  successRate.textContent = total > 0 ? Math.round((success / total) * 100) + '%' : '0%';
}

function getActionIcon(type) {
  const icons = {
    linkedin_connect: '🔗',
    linkedin_dm: '💬',
    linkedin_inmail: '📩',
  };
  return icons[type] || '📋';
}

function getActionLabel(type) {
  const labels = {
    linkedin_connect: 'Connection Request',
    linkedin_dm: 'Direct Message',
    linkedin_inmail: 'InMail',
  };
  return labels[type] || type;
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

connectBtn.addEventListener('click', async () => {
  const token = apiTokenInput.value.trim();
  
  if (!token) {
    statusMessage.textContent = '⚠️ Bitte Token eingeben';
    statusMessage.style.color = '#f59e0b';
    return;
  }
  
  // Validate token (simple check)
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SET_AUTH_TOKEN',
      token,
    });
    
    if (response?.success) {
      statusMessage.textContent = '✅ Erfolgreich verbunden!';
      statusMessage.style.color = '#22c55e';
      
      setTimeout(() => {
        showLoggedIn();
        updateStatus();
      }, 1000);
    }
  } catch (error) {
    statusMessage.textContent = '❌ Verbindung fehlgeschlagen';
    statusMessage.style.color = '#ef4444';
  }
});

syncBtn.addEventListener('click', async () => {
  syncBtn.textContent = '🔄 Synchronisiere...';
  syncBtn.disabled = true;
  
  await chrome.runtime.sendMessage({ type: 'FETCH_ACTIONS' });
  await updateStatus();
  
  syncBtn.textContent = '🔄 Aktionen synchronisieren';
  syncBtn.disabled = false;
});

processBtn.addEventListener('click', async () => {
  processBtn.textContent = '⏳ Führe aus...';
  processBtn.disabled = true;
  
  const result = await chrome.runtime.sendMessage({ type: 'PROCESS_NEXT' });
  
  if (result?.success) {
    // Update stats
    const stats = await chrome.storage.local.get(['sent_today', 'success_count', 'total_count']);
    await chrome.storage.local.set({
      sent_today: (stats.sent_today || 0) + 1,
      success_count: (stats.success_count || 0) + 1,
      total_count: (stats.total_count || 0) + 1,
    });
    
    processBtn.textContent = '✅ Erfolgreich!';
  } else if (result?.error) {
    processBtn.textContent = '❌ ' + result.error;
    
    const stats = await chrome.storage.local.get(['total_count']);
    await chrome.storage.local.set({
      total_count: (stats.total_count || 0) + 1,
    });
  } else {
    processBtn.textContent = 'Keine Aktionen';
  }
  
  setTimeout(async () => {
    processBtn.textContent = '▶️ Nächste Aktion ausführen';
    processBtn.disabled = false;
    await updateStatus();
  }, 2000);
});

logoutBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove(['auth_token', 'action_queue']);
  showLoggedOut();
  apiTokenInput.value = '';
  statusMessage.textContent = '';
});

// =============================================================================
// INIT
// =============================================================================

init();

