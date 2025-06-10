import { CommentParser } from './parser';

console.log('BadBot content script loaded');

const parser = new CommentParser();

// Add debugging state tracking
const debugState = {
  filteringInProgress: false,
  buttonAdditionInProgress: false,
  lastFilterTime: 0,
  lastButtonAddTime: 0,
  filterCallCount: 0,
  buttonAddCallCount: 0,
  ourMutationInProgress: false, // Track when we're making DOM changes
  hiddenElementsCount: 0, // Track hidden elements for consistency
  lastFilteredCommentCount: 0 // Track how many comments we last filtered (global)
};

// Test connection to background script
async function testBackgroundConnection(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      console.log('Testing connection to background script...');
      chrome.runtime.sendMessage(
        { action: 'ping' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Background connection test failed:', chrome.runtime.lastError);
            resolve(false);
            return;
          }
          console.log('Background connection test successful:', response);
          resolve(true);
        }
      );
    } catch (error) {
      console.error('Failed to test background connection:', error);
      resolve(false);
    }
  });
}

// Test the connection when content script loads
testBackgroundConnection().then(connected => {
  if (connected) {
    console.log('✅ Background script connection verified');
  } else {
    console.error('❌ Background script connection failed');
  }
});

function showNotification(message: string, duration: number = 3000) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #007bff;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: opacity 0.3s ease;
    max-width: 300px;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, duration);
}

function isStatusPage(): boolean {
  return window.location.pathname.includes('/status/');
}

// Cache to prevent duplicate whitelist checks
const whitelistCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

async function checkUserWhitelisted(username: string, retryCount: number = 0): Promise<boolean> {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second
  
  console.log(`🔍 checkUserWhitelisted called for ${username} (attempt ${retryCount + 1})`);
  
  // Check cache first
  const cached = whitelistCache.get(username);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`📋 Using cached result for ${username}: ${cached.result}`);
    return cached.result;
  }
  
  return new Promise((resolve) => {
    try {
      console.log(`🌐 Checking if user ${username} is whitelisted (attempt ${retryCount + 1})`);
      chrome.runtime.sendMessage(
        { action: 'isUserWhitelisted', username },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome runtime error:', chrome.runtime.lastError);
            
            // If we haven't exceeded max retries, try again after a delay
            if (retryCount < maxRetries) {
              console.log(`🔄 Retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
              setTimeout(() => {
                checkUserWhitelisted(username, retryCount + 1).then(resolve);
              }, retryDelay);
              return;
            }
            
            console.error(`❌ Failed to check whitelist for ${username} after ${maxRetries} attempts`);
            resolve(false);
            return;
          }
          
          const result = response?.isWhitelisted || false;
          console.log(`✅ User ${username} whitelist result: ${result}`);
          
          // Cache the result
          whitelistCache.set(username, { result, timestamp: Date.now() });
          
          resolve(result);
        }
      );
    } catch (error) {
      console.error('Failed to send message to background script:', error);
      
      // If we haven't exceeded max retries, try again after a delay
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          checkUserWhitelisted(username, retryCount + 1).then(resolve);
        }, retryDelay);
        return;
      }
      
      resolve(false);
    }
  });
}



let isFilteringEnabled = false;

function createToggleButton(): HTMLElement {
  console.log('🔨 createToggleButton() called');
  
  // Create the timeline cell structure that integrates with Twitter's flow
  const cellContainer = document.createElement('div');
  cellContainer.className = 'css-175oi2r';
  cellContainer.setAttribute('data-testid', 'cellInnerDiv');
  cellContainer.setAttribute('data-good-replies-button-cell', 'true');
  cellContainer.style.cssText = `
    width: 100%;
    position: relative;
  `;

  const innerContainer = document.createElement('div');
  innerContainer.className = 'css-175oi2r r-1igl3o0 r-qklmqi r-1adg3ll r-1ny4l3l';

  const contentContainer = document.createElement('div');
  contentContainer.className = 'css-175oi2r';
  contentContainer.style.cssText = `
    display: flex;
    justify-content: center;
    padding: 20px 16px;
    border-top: 1px solid rgb(47, 51, 54);
    border-bottom: 1px solid rgb(47, 51, 54);
    background: rgb(16, 16, 16);
    margin: 12px 0;
  `;

  // Add a title/label above the button
  const titleContainer = document.createElement('div');
  titleContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  `;
  
  const title = document.createElement('div');
  title.style.cssText = `
    color: rgb(113, 118, 123);
    font-size: 13px;
    font-weight: 400;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  `;
  title.textContent = 'Reply Filter';

  const button = document.createElement('button');
  button.style.cssText = `
    background: #1d9bf0;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 9999px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 36px;
    min-width: 160px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  `;
  button.textContent = 'Hide Non-Whitelisted Replies';
  button.setAttribute('data-good-replies-toggle', 'true');
  button.id = 'good-replies-filter-button';
  
  button.addEventListener('click', () => {
    console.log(`🎯 Button clicked! Current filtering state: ${isFilteringEnabled}`);
    
    // Mark that we're making DOM changes
    debugState.ourMutationInProgress = true;
    
    isFilteringEnabled = !isFilteringEnabled;
    button.textContent = isFilteringEnabled ? 'Show All Replies' : 'Hide Non-Whitelisted Replies';
    button.style.background = isFilteringEnabled ? '#f91880' : '#1d9bf0';
    
    console.log(`🎯 New filtering state: ${isFilteringEnabled}`);
    
    if (isFilteringEnabled) {
      console.log('🔽 Starting reply filtering...');
      
      // Initialize comment count tracking when first enabling filtering
      const currentComments = parser.parseAllComments();
      debugState.lastFilteredCommentCount = currentComments.length;
      console.log(`📊 Initializing lastFilteredCommentCount to ${debugState.lastFilteredCommentCount}`);
      
      filterReplies().finally(() => {
        // Clear our mutation flag after filtering is complete
        setTimeout(() => {
          debugState.ourMutationInProgress = false;
        }, 500);
      });
    } else {
      console.log('🔼 Showing all replies...');
      showAllReplies();
      
      // Reset comment count tracking when disabling filtering
      debugState.lastFilteredCommentCount = 0;
      console.log('📊 Reset lastFilteredCommentCount to 0');
      
      // Clear our mutation flag after showing replies
      setTimeout(() => {
        debugState.ourMutationInProgress = false;
      }, 500);
    }
  });
  
  button.addEventListener('mouseenter', () => {
    button.style.background = isFilteringEnabled ? '#dc1670' : '#1a8cd8';
    button.style.transform = 'translateY(-1px)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.background = isFilteringEnabled ? '#f91880' : '#1d9bf0';
    button.style.transform = 'translateY(0px)';
  });

  // Assemble the timeline cell structure
  titleContainer.appendChild(title);
  titleContainer.appendChild(button);
  contentContainer.appendChild(titleContainer);
  innerContainer.appendChild(contentContainer);
  cellContainer.appendChild(innerContainer);
  
  console.log('✅ Button cell structure created:', cellContainer);
  
  return cellContainer;
}

function showAllReplies() {
  console.log('🔼 showAllReplies() called');
  console.log(`📊 Current hidden elements count: ${debugState.hiddenElementsCount}`);
  
  const hiddenElements = document.querySelectorAll('[data-good-replies-filtered="true"]');
  console.log(`👁️ Found ${hiddenElements.length} filtered elements to show`);
  
  if (hiddenElements.length !== debugState.hiddenElementsCount) {
    console.warn(`⚠️ Element count mismatch! Expected ${debugState.hiddenElementsCount}, found ${hiddenElements.length}`);
  }
  
  hiddenElements.forEach((element, index) => {
    console.log(`👁️ Showing element ${index + 1}/${hiddenElements.length}`);
    (element as HTMLElement).style.display = '';
    element.removeAttribute('data-good-replies-filtered');
    element.removeAttribute('data-good-replies-filter-reason');
  });
  
  // Reset our counter
  debugState.hiddenElementsCount = 0;
  
  console.log('✅ All replies shown');
}

async function filterReplies() {
  console.log('🔽 filterReplies() called');
  console.log(`📊 Debug state: filtering=${debugState.filteringInProgress}, enabled=${isFilteringEnabled}, statusPage=${isStatusPage()}`);
  
  if (!isStatusPage() || !isFilteringEnabled) {
    console.log('⏭️ Skipping filtering: not status page or filtering disabled');
    return;
  }

  if (debugState.filteringInProgress) {
    console.log('⏭️ Filtering already in progress, skipping');
    return;
  }

  debugState.filteringInProgress = true;
  debugState.filterCallCount++;
  debugState.lastFilterTime = Date.now();
  
  console.log(`🔢 Filter call count: ${debugState.filterCallCount}`);

  try {
    console.log('🔍 Parsing comments...');
    const comments = parser.parseAllComments();
    console.log(`📝 Found ${comments.length} comments`);
    
    if (comments.length === 0) {
      console.log('⏭️ No comments found, skipping filtering');
      return;
    }

    const whitelistedElements: HTMLElement[] = [];
    const nonWhitelistedElements: HTMLElement[] = [];

    console.log('🔍 Checking whitelist status for all users...');
    for (const comment of comments) {
      if (!comment.author.username) {
        console.log('👤 Found comment without username, adding to non-whitelisted');
        nonWhitelistedElements.push(comment.element);
        continue;
      }

      console.log(`👤 Checking user: ${comment.author.username}`);
      const isWhitelisted = await checkUserWhitelisted(comment.author.username);
      if (isWhitelisted) {
        console.log(`✅ ${comment.author.username} is whitelisted`);
        whitelistedElements.push(comment.element);
      } else {
        console.log(`❌ ${comment.author.username} is not whitelisted`);
        nonWhitelistedElements.push(comment.element);
      }
    }

    console.log(`📊 Results: ${whitelistedElements.length} whitelisted, ${nonWhitelistedElements.length} non-whitelisted`);

    if (nonWhitelistedElements.length === 0) {
      console.log('✅ No non-whitelisted elements to hide');
      return;
    }

    console.log(`🙈 Hiding ${nonWhitelistedElements.length} non-whitelisted elements in place`);
    nonWhitelistedElements.forEach((element, index) => {
      console.log(`🙈 Hiding element ${index + 1}/${nonWhitelistedElements.length}`);
      
      // Hide the element with CSS and add data attribute for identification
      element.style.display = 'none';
      element.setAttribute('data-good-replies-filtered', 'true');
      element.setAttribute('data-good-replies-filter-reason', 'not-whitelisted');
    });

    // Update our counter to track hidden elements
    debugState.hiddenElementsCount = nonWhitelistedElements.length;
    console.log(`📊 Updated hidden elements count: ${debugState.hiddenElementsCount}`);

    console.log('✅ Reply filtering completed - elements hidden in place');
  } catch (error) {
    console.error('❌ Error during filtering:', error);
  } finally {
    debugState.filteringInProgress = false;
  }
}

function observePageChanges() {
  console.log('👀 Setting up page change observer');
  
  let buttonAdditionTimeout: NodeJS.Timeout | null = null;
  let filterTimeout: NodeJS.Timeout | null = null;
  let filterCooldownUntil = 0; // Timestamp when we can filter again
  const FILTER_COOLDOWN_MS = 1000; // Don't filter more than once every 5 seconds
  const MIN_COMMENT_INCREASE = 5; // Only filter if comment count increased by at least 5
  
  const observer = new MutationObserver((mutations) => {
    // Skip if we're currently making our own mutations
    if (debugState.ourMutationInProgress) {
      console.log('⏭️ Skipping mutation handling - our operation in progress');
      return;
    }
    
    // Check cooldown period
    const now = Date.now();
    if (now < filterCooldownUntil) {
      console.log('⏭️ Skipping mutation handling - filter cooldown active');
      return;
    }
    
    let shouldFilter = false;
    let shouldAddButton = false;
    let newContentDetected = false;
    
    // Count mutations for debugging
    const mutationCount = mutations.length;
    const addedNodesCount = mutations.reduce((count, mut) => count + mut.addedNodes.length, 0);
    
    if (mutationCount > 50 || addedNodesCount > 100) {
      console.log(`⚠️ High mutation count detected: ${mutationCount} mutations, ${addedNodesCount} added nodes`);
    }
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Skip if this is one of our own elements
            if (element.hasAttribute && (
                element.hasAttribute('data-good-replies-button-cell') ||
                element.hasAttribute('data-good-replies-filtered') ||
                element.querySelector('[data-good-replies-button-cell]') ||
                element.querySelector('[data-good-replies-filtered]')
              )) {
              console.log('⏭️ Skipping mutation for our own element');
              continue;
            }
            
            // Check if new tweets were added (but not our own)
            if (element.querySelector('[data-testid="tweet"]') || 
                element.closest('[data-testid="tweet"]')) {
              console.log('🆕 New tweet detected, checking if it needs filtering');
              newContentDetected = true;
            }
            
            // Trigger button addition if we see the reply section or timeline changes
            if (element.querySelector('[aria-label="Timeline: Conversation"]') ||
                element.querySelector('[class*="r-1h8ys4a"][class*="r-1mmae3n"]') ||
                element.querySelector('[data-testid^="tweetTextarea"]') ||
                (element.getAttribute('data-testid') === 'cellInnerDiv' && 
                 !element.getAttribute('data-good-replies-button-cell'))) {
              console.log('🆕 Reply section or timeline change detected');
              shouldAddButton = true;
            }
          }
        }
      }
    });
    
    if (shouldAddButton && !document.querySelector('[data-good-replies-toggle]') && !document.getElementById('good-replies-filter-button')) {
      console.log('🔄 MutationObserver detected need to add button');
      
      // Debounce button addition to prevent spam
      if (buttonAdditionTimeout) {
        clearTimeout(buttonAdditionTimeout);
      }
      
      buttonAdditionTimeout = setTimeout(() => {
        if (isStatusPage() && !document.querySelector('[data-good-replies-toggle]') && !document.getElementById('good-replies-filter-button')) {
          console.log('📍 Adding button via MutationObserver');
          addToggleButton();
        }
      }, 500);
    }
    
    // Only consider filtering if we detected new content and filtering is enabled
    if (newContentDetected && isFilteringEnabled) {
      console.log('🔄 New content detected, checking if filtering needed...');
      
      // Check current comment count to see if it's worth filtering
      const currentComments = parser.parseAllComments();
      const currentCount = currentComments.length;
      
      console.log(`📊 Comment count: ${currentCount} (previously ${debugState.lastFilteredCommentCount})`);
      
      // Only filter if we have significantly more comments than last time
      if (currentCount > debugState.lastFilteredCommentCount + MIN_COMMENT_INCREASE) {
        console.log(`📈 Significant increase detected (${currentCount - debugState.lastFilteredCommentCount} new comments), scheduling filter`);
        shouldFilter = true;
      } else {
        console.log(`📊 Not enough new comments (${currentCount - debugState.lastFilteredCommentCount}), skipping filter`);
      }
    }
    
    if (shouldFilter) {
      console.log('🔄 MutationObserver detected new content, scheduling filter');
      
      // Set cooldown period
      filterCooldownUntil = now + FILTER_COOLDOWN_MS;
      
      // Debounce filtering to prevent excessive calls
      if (filterTimeout) {
        clearTimeout(filterTimeout);
      }
      
      filterTimeout = setTimeout(() => {
        console.log('🔄 MutationObserver triggered filtering');
        filterReplies().then(() => {
          // Update our comment count after successful filtering
          const filteredComments = parser.parseAllComments();
          debugState.lastFilteredCommentCount = filteredComments.length;
          console.log(`📊 Updated lastFilteredCommentCount to ${debugState.lastFilteredCommentCount}`);
        });
      }, 2000); // Increased debounce time
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ Page change observer setup complete');
}

function addToggleButton() {
  debugState.buttonAddCallCount++;
  debugState.lastButtonAddTime = Date.now();
  
  console.log(`🚀 addToggleButton() called (attempt ${debugState.buttonAddCallCount})`);
  console.log(`📊 Debug state: buttonInProgress=${debugState.buttonAdditionInProgress}`);
  
  if (debugState.buttonAdditionInProgress) {
    console.log('⏭️ Button addition already in progress, skipping');
    return;
  }
  
  debugState.buttonAdditionInProgress = true;
  
  try {
    // Mark that we're making DOM changes
    debugState.ourMutationInProgress = true;
    
    // More thorough check for existing buttons
    const existingButton = document.querySelector('[data-good-replies-toggle]');
    const existingButtonById = document.getElementById('good-replies-filter-button');
    const existingButtonCell = document.querySelector('[data-good-replies-button-cell]');
    
    if (existingButton || existingButtonById || existingButtonCell) {
      console.log('🗑️ Found existing button(s), hiding them instead of removing');
      
      // Hide instead of remove to prevent DOM issues
      if (existingButton) {
        const buttonContainer = existingButton.closest('[data-testid="cellInnerDiv"]');
        if (buttonContainer) {
          (buttonContainer as HTMLElement).style.display = 'none';
          buttonContainer.setAttribute('data-good-replies-hidden-button', 'true');
        }
      }
      
      if (existingButtonById) {
        const buttonContainer = existingButtonById.closest('[data-testid="cellInnerDiv"]');
        if (buttonContainer) {
          (buttonContainer as HTMLElement).style.display = 'none';
          buttonContainer.setAttribute('data-good-replies-hidden-button', 'true');
        }
      }
      
      if (existingButtonCell && 
          existingButtonCell !== existingButton?.closest('[data-testid="cellInnerDiv"]') &&
          existingButtonCell !== existingButtonById?.closest('[data-testid="cellInnerDiv"]')) {
        (existingButtonCell as HTMLElement).style.display = 'none';
        existingButtonCell.setAttribute('data-good-replies-hidden-button', 'true');
      }
    }
    
    const tryAddButton = () => {
      console.log('🔍 Attempting to add button...');
      
      // Look for multiple possible reply section selectors
      const replySelectors = [
        '[class*="r-1h8ys4a"][class*="r-1mmae3n"]',
        '[data-testid^="tweetTextarea"]',
        '[aria-label*="Tweet text"]',
        '[placeholder*="Tweet your reply"]'
      ];
      
      let replySection: Element | null = null;
      
      for (const selector of replySelectors) {
        replySection = document.querySelector(selector);
        if (replySection) {
          console.log(`✅ Found reply section with selector: ${selector}`);
          break;
        }
      }
      
      if (!replySection) {
        console.log('❌ Reply section not found with any selector');
        console.log('🔍 Available selectors checked:', replySelectors);
        
        // Log some DOM info for debugging
        const timelineCells = document.querySelectorAll('[data-testid="cellInnerDiv"]');
        console.log(`📊 Found ${timelineCells.length} timeline cells`);
        
        return false;
      }
      
      console.log('✅ Reply section found:', replySection);
      
      // Double-check this is the reply section
      const hasReplyingTo = replySection.textContent?.includes('Replying to');
      const hasTweetTextarea = replySection.querySelector('[data-testid^="tweetTextarea"]');
      const hasPlaceholder = replySection.querySelector('[placeholder*="Tweet your reply"]') || 
                           replySection.querySelector('[placeholder*="reply"]');
      
      if (!hasReplyingTo && !hasTweetTextarea && !hasPlaceholder) {
        console.log('❌ Found section but it doesn\'t look like reply compose area');
        console.log('  - Has "Replying to":', hasReplyingTo);
        console.log('  - Has tweet textarea:', !!hasTweetTextarea);
        console.log('  - Has reply placeholder:', !!hasPlaceholder);
        return false;
      }
      
      console.log('✅ Confirmed this is the reply compose section');
      
      // Create and insert the button right before the reply section
      console.log('🔨 Creating button cell...');
      const buttonCell = createToggleButton();
      
      console.log('📍 Inserting button above reply section...');
      
      // Insert the button right before the reply compose section
      if (replySection.parentNode) {
        replySection.parentNode.insertBefore(buttonCell, replySection);
        
        console.log('✅ Button successfully inserted above reply section');
        
        // Verify the button is actually visible
        const insertedButton = document.querySelector('[data-good-replies-toggle]');
        if (insertedButton) {
          const rect = insertedButton.getBoundingClientRect();
          console.log(`📏 Button bounding rect: ${rect.width}x${rect.height} at (${rect.x}, ${rect.y})`);
          console.log(`👁️ Button visible: ${rect.width > 0 && rect.height > 0}`);
        }
        
        return true;
      }
      
      console.log('❌ No parent node found for reply section');
      return false;
    };
    
    // Try with progressive delays to handle dynamic loading
    if (!tryAddButton()) {
      setTimeout(() => {
        if (!tryAddButton()) {
          setTimeout(() => {
            if (!tryAddButton()) {
              console.log('❌ Failed to add button after multiple attempts');
            }
          }, 1000);
        }
      }, 500);
    }
    
    // Clear our mutation flag after button addition
    setTimeout(() => {
      debugState.ourMutationInProgress = false;
    }, 1000);
  } finally {
    debugState.buttonAdditionInProgress = false;
  }
}

function init() {
  console.log('🎯 Initializing BadBot extension');
  console.log('  Current URL:', window.location.href);
  console.log('  Is status page:', isStatusPage());
  console.log('  Document ready state:', document.readyState);
  
  if (isStatusPage()) {
    console.log('📍 Status page detected, adding toggle button');
    addToggleButton();
    observePageChanges();
    
    // More conservative periodic check with better safeguards
    const intervalId = setInterval(() => {
      if (!isStatusPage()) {
        console.log('🛑 Not on status page anymore, clearing interval');
        clearInterval(intervalId);
        return;
      }
      
      // Check if too much time has passed since last successful operations
      const now = Date.now();
      const timeSinceLastFilter = now - debugState.lastFilterTime;
      const timeSinceLastButton = now - debugState.lastButtonAddTime;
      
      // Only run periodic check if it's been a while since last activity
      if (timeSinceLastButton < 10000) { // Skip if button was added recently
        return;
      }
      
      const button = document.querySelector('[data-good-replies-toggle]') || document.getElementById('good-replies-filter-button');
      const replySection = document.querySelector('[class*="r-1h8ys4a"][class*="r-1mmae3n"]');
      
      // Check if button exists and is positioned correctly
      if (!button || !replySection) {
        if (!button) {
          console.log('🔄 Periodic check: Button missing, re-adding...');
          addToggleButton();
        } else {
          console.log('🔄 Periodic check: Reply section missing, waiting...');
        }
      } else {
        // Verify the button is properly positioned before the reply section
        const buttonContainer = button.closest('[data-good-replies-button-cell]');
        
        if (buttonContainer) {
          // Check if button is positioned right before the reply section
          const buttonNext = buttonContainer.nextElementSibling;
          if (buttonNext !== replySection) {
            console.log('🔄 Periodic check: Button not positioned before reply section, re-adding...');
            addToggleButton();
          }
        }
      }
    }, 10000); // Increased to 10 seconds for less aggressive checking
    
    console.log('✅ BadBot initialization complete');
  } else {
    console.log('⏭️ Not a status page, skipping initialization');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

let lastUrl = window.location.href;
new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    console.log('🔄 URL changed from', lastUrl, 'to', currentUrl);
    lastUrl = currentUrl;
    
    // Clear debug state on URL change
    debugState.filteringInProgress = false;
    debugState.buttonAdditionInProgress = false;
    debugState.ourMutationInProgress = false;
    debugState.hiddenElementsCount = 0;
    debugState.lastFilteredCommentCount = 0;
    
    setTimeout(() => {
      console.log('🔄 Re-initializing after URL change');
      init();
    }, 500);
  }
}).observe(document, { subtree: true, childList: true });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showMessage') {
    showNotification('Hello from BadBot extension!');
    sendResponse({ success: true });
  }
  
  if (message.action === 'parseComments') {
    try {
      const json = parser.generateJSON();
      const comments = parser.parseAllComments();
      
      console.log('Parsed comments:', json);
      showNotification(`Found ${comments.length} comments`);
      
      sendResponse({ 
        success: true, 
        data: json,
        count: comments.length 
      });
    } catch (error) {
      console.error('Error parsing comments:', error);
      showNotification('Error parsing comments');
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
  
  return true;
});