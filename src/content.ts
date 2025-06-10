import { CommentParser } from './parser';

console.log('Good Replies content script loaded');

const parser = new CommentParser();

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
      document.body.removeChild(notification);
    }, 300);
  }, duration);
}

function isStatusPage(): boolean {
  return window.location.pathname.includes('/status/');
}

async function checkUserWhitelisted(username: string): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'isUserWhitelisted', username },
      (response) => {
        resolve(response?.isWhitelisted || false);
      }
    );
  });
}

function createCollapsibleSection(hiddenReplies: HTMLElement[]): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText = `
    margin: 16px 0;
    border: 1px solid rgb(51, 54, 57);
    border-radius: 16px;
    background: rgb(22, 24, 28);
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    padding: 12px 16px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgb(51, 54, 57);
    background: rgb(32, 35, 39);
    border-radius: 16px 16px 0 0;
  `;

  const headerText = document.createElement('span');
  headerText.style.cssText = `
    color: rgb(113, 118, 123);
    font-size: 15px;
    font-weight: 400;
  `;
  headerText.textContent = `${hiddenReplies.length} additional replies (filtered)`;

  const arrow = document.createElement('span');
  arrow.style.cssText = `
    color: rgb(113, 118, 123);
    font-size: 14px;
    transition: transform 0.2s ease;
  `;
  arrow.textContent = '▼';

  header.appendChild(headerText);
  header.appendChild(arrow);

  const content = document.createElement('div');
  content.style.cssText = `
    display: none;
    border-radius: 0 0 16px 16px;
    overflow: hidden;
  `;

  hiddenReplies.forEach(reply => {
    // Reset any hidden styling before moving to collapsible section
    reply.style.display = '';
    reply.removeAttribute('data-good-replies-hidden');
    content.appendChild(reply);
  });

  let isExpanded = false;
  header.addEventListener('click', () => {
    isExpanded = !isExpanded;
    
    if (isExpanded) {
      content.style.display = 'block';
      // Ensure all nested elements are visible
      const allElements = content.querySelectorAll('*');
      allElements.forEach(el => {
        const element = el as HTMLElement;
        if (element.style.display === 'none') {
          element.style.display = '';
        }
      });
    } else {
      content.style.display = 'none';
    }
    
    arrow.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
    
    // Update header text to reflect state
    headerText.textContent = `${hiddenReplies.length} additional replies (filtered)${isExpanded ? ' - Click to collapse' : ' - Click to expand'}`;
  });

  container.appendChild(header);
  container.appendChild(content);

  return container;
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
  
  button.addEventListener('click', () => {
    isFilteringEnabled = !isFilteringEnabled;
    button.textContent = isFilteringEnabled ? 'Show All Replies' : 'Hide Non-Whitelisted Replies';
    button.style.background = isFilteringEnabled ? '#f91880' : '#1d9bf0';
    
    if (isFilteringEnabled) {
      filterReplies();
    } else {
      showAllReplies();
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
  console.log('  Cell container classes:', cellContainer.className);
  console.log('  Cell container testid:', cellContainer.getAttribute('data-testid'));
  console.log('  Button text:', button.textContent);
  
  return cellContainer;
}

function showAllReplies() {
  const existingCollapsible = document.querySelector('[data-good-replies-collapsible]');
  if (existingCollapsible) {
    existingCollapsible.remove();
  }
  
  const hiddenElements = document.querySelectorAll('[data-good-replies-hidden]');
  hiddenElements.forEach(element => {
    (element as HTMLElement).style.display = '';
    element.removeAttribute('data-good-replies-hidden');
  });
}

async function filterReplies() {
  if (!isStatusPage() || !isFilteringEnabled) return;

  const comments = parser.parseAllComments();
  if (comments.length === 0) return;

  const whitelistedElements: HTMLElement[] = [];
  const nonWhitelistedElements: HTMLElement[] = [];

  for (const comment of comments) {
    if (!comment.author.username) {
      nonWhitelistedElements.push(comment.element);
      continue;
    }

    const isWhitelisted = await checkUserWhitelisted(comment.author.username);
    if (isWhitelisted) {
      whitelistedElements.push(comment.element);
    } else {
      nonWhitelistedElements.push(comment.element);
    }
  }

  if (nonWhitelistedElements.length === 0) return;

  const existingCollapsible = document.querySelector('[data-good-replies-collapsible]');
  if (existingCollapsible) {
    existingCollapsible.remove();
  }

  nonWhitelistedElements.forEach(element => {
    element.style.display = 'none';
    element.setAttribute('data-good-replies-hidden', 'true');
  });

  // Find where to place the collapsible section
  // If there are whitelisted replies, place it after the last one
  // Otherwise, place it after the toggle button
  let insertionPoint: Element | null = null;
  
  if (whitelistedElements.length > 0) {
    const lastWhitelistedElement = whitelistedElements[whitelistedElements.length - 1];
    const cellDiv = lastWhitelistedElement.closest('[data-testid="cellInnerDiv"]');
    insertionPoint = cellDiv;
  } else {
    // Place after toggle button if no whitelisted replies
    const toggleButton = document.querySelector('[data-good-replies-toggle]');
    insertionPoint = toggleButton;
  }
  
  if (insertionPoint && insertionPoint.parentNode) {
    const collapsibleSection = createCollapsibleSection(nonWhitelistedElements);
    collapsibleSection.setAttribute('data-good-replies-collapsible', 'true');
    
    insertionPoint.parentNode.insertBefore(
      collapsibleSection, 
      insertionPoint.nextSibling
    );
  }
}

function observePageChanges() {
  let buttonAdditionTimeout: NodeJS.Timeout | null = null;
  
  const observer = new MutationObserver((mutations) => {
    let shouldFilter = false;
    let shouldAddButton = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Check if new tweets were added
            if (element.querySelector('[data-testid="tweet"]') || 
                element.closest('[data-testid="tweet"]')) {
              shouldFilter = true;
            }
            
            // Trigger button addition if we see the reply section or timeline changes
            if (element.querySelector('[aria-label="Timeline: Conversation"]') ||
                element.querySelector('[class*="r-1h8ys4a"][class*="r-1mmae3n"]') ||
                element.querySelector('[data-testid^="tweetTextarea"]') ||
                (element.getAttribute('data-testid') === 'cellInnerDiv' && 
                 !element.getAttribute('data-good-replies-button-cell'))) {
              shouldAddButton = true;
            }
          }
        }
      }
    });
    
    if (shouldAddButton && !document.querySelector('[data-good-replies-toggle]')) {
      console.log('🔄 MutationObserver detected need to add button');
      
      // Debounce button addition to prevent spam
      if (buttonAdditionTimeout) {
        clearTimeout(buttonAdditionTimeout);
      }
      
      buttonAdditionTimeout = setTimeout(() => {
        if (isStatusPage() && !document.querySelector('[data-good-replies-toggle]')) {
          console.log('📍 Adding button via MutationObserver');
          addToggleButton();
        } else {
          console.log('⏭️ Skipping button addition: not status page or button already exists');
        }
      }, 500);
    }
    
    if (shouldFilter && isFilteringEnabled) {
      setTimeout(filterReplies, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function addToggleButton() {
  console.log('🚀 addToggleButton() called');
  
  // More thorough check for existing buttons
  const existingButton = document.querySelector('[data-good-replies-toggle]');
  const existingButtonCell = document.querySelector('[data-good-replies-button-cell]');
  
  if (existingButton || existingButtonCell) {
    console.log('🗑️ Removing existing button(s)');
    existingButton?.closest('[data-testid="cellInnerDiv"]')?.remove();
    existingButtonCell?.remove();
    
    // Remove any duplicate buttons
    const allButtons = document.querySelectorAll('[data-good-replies-toggle]');
    allButtons.forEach(btn => btn.closest('[data-testid="cellInnerDiv"]')?.remove());
  }
  
  const tryAddButton = () => {
    console.log('🔍 Attempting to add button...');
    
    // Look for the reply compose section - this is much more reliable positioning
    const replySection = document.querySelector('[class*="r-1h8ys4a"][class*="r-1mmae3n"]');
    if (!replySection) {
      console.log('❌ Reply section not found');
      return false;
    }
    console.log('✅ Reply section found:', replySection);
    
    // Double-check this is the reply section by looking for "Replying to" text or tweet textarea
    const hasReplyingTo = replySection.textContent?.includes('Replying to');
    const hasTweetTextarea = replySection.querySelector('[data-testid^="tweetTextarea"]');
    
    if (!hasReplyingTo && !hasTweetTextarea) {
      console.log('❌ Found section but it doesn\'t look like reply compose area');
      return false;
    }
    console.log('✅ Confirmed this is the reply compose section');
    
    // Create and insert the button right before the reply section
    console.log('🔨 Creating button cell...');
    const buttonCell = createToggleButton();
    
    console.log('📍 Inserting button above reply section...');
    console.log('  Reply section:', replySection);
    console.log('  Parent node:', replySection.parentNode);
    
    // Insert the button right before the reply compose section
    if (replySection.parentNode) {
      replySection.parentNode.insertBefore(buttonCell, replySection);
      
      console.log('✅ Button successfully inserted above reply section');
      console.log('  Button element:', buttonCell);
      console.log('  Button now in DOM:', document.contains(buttonCell));
      
      // Verify the button is actually visible
      const insertedButton = document.querySelector('[data-good-replies-toggle]');
      if (insertedButton) {
        const rect = insertedButton.getBoundingClientRect();
        console.log('  Button bounding rect:', rect);
        console.log('  Button visible:', rect.width > 0 && rect.height > 0);
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
            console.log('Failed to add button after multiple attempts');
          }
        }, 1000);
      }
    }, 500);
  }
}

function init() {
  console.log('🎯 Initializing Good Replies extension');
  console.log('  Current URL:', window.location.href);
  console.log('  Is status page:', isStatusPage());
  
  if (isStatusPage()) {
    console.log('📍 Status page detected, adding toggle button');
    addToggleButton();
    observePageChanges();
    
    // Periodic check to ensure button is properly positioned
    const intervalId = setInterval(() => {
      if (!isStatusPage()) {
        clearInterval(intervalId);
        return;
      }
      
      const button = document.querySelector('[data-good-replies-toggle]');
      const replySection = document.querySelector('[class*="r-1h8ys4a"][class*="r-1mmae3n"]');
      
      // Check if button exists and is positioned correctly
      if (!button || !replySection) {
        if (!button) {
          console.log('🔄 Periodic check: Button missing, re-adding...');
        } else {
          console.log('🔄 Periodic check: Reply section missing, waiting...');
          return; // Don't re-add if reply section is gone, wait for it to appear
        }
        addToggleButton();
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
    }, 5000);
    
    console.log('✅ Good Replies initialization complete');
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
    setTimeout(() => {
      console.log('🔄 Re-initializing after URL change');
      init();
    }, 500);
  }
}).observe(document, { subtree: true, childList: true });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showMessage') {
    showNotification('Hello from Good Replies extension!');
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