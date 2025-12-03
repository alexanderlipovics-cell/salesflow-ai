/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - LINKEDIN CONTENT SCRIPT                                  ║
 * ║  Interagiert mit der LinkedIn-Seite                                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// =============================================================================
// HELPERS
// =============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min = 1000, max = 3000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function typeText(element, text) {
  element.focus();
  for (const char of text) {
    element.value += char;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(randomDelay(30, 100));
  }
}

async function clickElement(element) {
  element.click();
  await sleep(randomDelay(500, 1500));
}

// =============================================================================
// LINKEDIN ACTIONS
// =============================================================================

async function sendConnectionRequest(profileUrl, note = '') {
  // Navigate to profile if needed
  if (window.location.href !== profileUrl && !window.location.href.includes('/in/')) {
    window.location.href = profileUrl;
    return { success: false, error: 'Navigating to profile', retry: true };
  }
  
  await sleep(randomDelay(2000, 4000));
  
  // Find Connect button
  const connectButton = document.querySelector(
    'button[aria-label*="Connect"], button[aria-label*="Verbinden"]'
  );
  
  if (!connectButton) {
    // Maybe already connected or pending
    const pendingButton = document.querySelector('button[aria-label*="Pending"]');
    if (pendingButton) {
      return { success: true, details: { already_pending: true } };
    }
    
    const messageButton = document.querySelector('button[aria-label*="Message"]');
    if (messageButton) {
      return { success: true, details: { already_connected: true } };
    }
    
    // Try More button
    const moreButton = document.querySelector('button[aria-label*="More"]');
    if (moreButton) {
      await clickElement(moreButton);
      await sleep(randomDelay(500, 1000));
      
      const connectOption = document.querySelector('[data-control-name="connect"]');
      if (connectOption) {
        await clickElement(connectOption);
      }
    }
    
    return { success: false, error: 'Connect button not found' };
  }
  
  await clickElement(connectButton);
  await sleep(randomDelay(1000, 2000));
  
  // Check if note modal appeared
  if (note) {
    const addNoteButton = document.querySelector('button[aria-label*="Add a note"]');
    if (addNoteButton) {
      await clickElement(addNoteButton);
      await sleep(randomDelay(500, 1000));
      
      const noteTextarea = document.querySelector('textarea[name="message"]');
      if (noteTextarea) {
        await typeText(noteTextarea, note);
        await sleep(randomDelay(500, 1000));
      }
    }
  }
  
  // Send
  const sendButton = document.querySelector('button[aria-label*="Send"]');
  if (sendButton) {
    await clickElement(sendButton);
    return { success: true };
  }
  
  return { success: false, error: 'Send button not found' };
}

async function sendDirectMessage(profileUrl, message) {
  // Navigate to messaging
  const messageButton = document.querySelector(
    'button[aria-label*="Message"], a[href*="/messaging/"]'
  );
  
  if (messageButton) {
    await clickElement(messageButton);
    await sleep(randomDelay(2000, 3000));
  } else {
    return { success: false, error: 'Message button not found' };
  }
  
  // Find message input
  const messageInput = document.querySelector(
    'div[contenteditable="true"][role="textbox"], textarea.msg-form__contenteditable'
  );
  
  if (!messageInput) {
    return { success: false, error: 'Message input not found' };
  }
  
  // Type message
  messageInput.focus();
  messageInput.textContent = message;
  messageInput.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(randomDelay(500, 1000));
  
  // Send
  const sendButton = document.querySelector(
    'button[type="submit"], button.msg-form__send-button'
  );
  
  if (sendButton) {
    await clickElement(sendButton);
    return { success: true };
  }
  
  return { success: false, error: 'Send button not found' };
}

async function sendInMail(profileUrl, subject, message) {
  // This requires LinkedIn Premium
  return { success: false, error: 'InMail requires LinkedIn Premium - not implemented' };
}

async function scrapeProfile() {
  const name = document.querySelector('h1.text-heading-xlarge')?.textContent?.trim();
  const headline = document.querySelector('.text-body-medium')?.textContent?.trim();
  const location = document.querySelector('.text-body-small.inline.t-black--light')?.textContent?.trim();
  const about = document.querySelector('section.pv-about-section p')?.textContent?.trim();
  
  // Current position
  const currentPosition = document.querySelector('.pv-text-details__right-panel h2')?.textContent?.trim();
  
  return {
    name,
    headline,
    location,
    about,
    current_position: currentPosition,
    profile_url: window.location.href,
  };
}

// =============================================================================
// MESSAGE HANDLER
// =============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXECUTE_ACTION') {
    const { action } = message;
    
    (async () => {
      try {
        let result;
        
        switch (action.action_type) {
          case 'linkedin_connect':
            result = await sendConnectionRequest(
              action.linkedin_url,
              action.platform_response?.note || ''
            );
            break;
            
          case 'linkedin_dm':
            result = await sendDirectMessage(
              action.linkedin_url,
              action.sent_content
            );
            break;
            
          case 'linkedin_inmail':
            result = await sendInMail(
              action.linkedin_url,
              action.sent_subject,
              action.sent_content
            );
            break;
            
          case 'scrape_profile':
            result = await scrapeProfile();
            result.success = true;
            break;
            
          default:
            result = { success: false, error: `Unknown action type: ${action.action_type}` };
        }
        
        sendResponse(result);
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // Async response
  }
  
  if (message.type === 'PING') {
    sendResponse({ pong: true, url: window.location.href });
    return true;
  }
});

// =============================================================================
// UI INJECTION
// =============================================================================

function injectSalesFlowButton() {
  // Check if we're on a profile page
  if (!window.location.href.includes('/in/')) return;
  
  // Don't inject twice
  if (document.querySelector('#salesflow-quick-action')) return;
  
  const actionsContainer = document.querySelector('.pv-top-card-v2-ctas');
  if (!actionsContainer) return;
  
  const button = document.createElement('button');
  button.id = 'salesflow-quick-action';
  button.className = 'artdeco-button artdeco-button--secondary';
  button.innerHTML = `
    <span style="display: flex; align-items: center; gap: 4px;">
      <span>🚀</span>
      <span>AURA OS</span>
    </span>
  `;
  button.style.cssText = `
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: white;
    border: none;
    margin-left: 8px;
  `;
  
  button.addEventListener('click', async () => {
    const profileData = await scrapeProfile();
    
    // Send to extension popup or open enrollment modal
    chrome.runtime.sendMessage({
      type: 'PROFILE_SCRAPED',
      profile: profileData,
    });
    
    alert(`✅ ${profileData.name} kann jetzt in AURA OS AI zu einer Sequence hinzugefügt werden!`);
  });
  
  actionsContainer.appendChild(button);
}

// Inject button when page loads
setTimeout(injectSalesFlowButton, 2000);

// Re-inject on navigation (LinkedIn is SPA)
const observer = new MutationObserver(() => {
  injectSalesFlowButton();
});

observer.observe(document.body, { childList: true, subtree: true });

console.log('AURA OS AI Content Script loaded');

