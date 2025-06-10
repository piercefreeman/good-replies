// Add immediate execution check
console.log('🚀 Background script executing at:', new Date().toISOString());

// Force immediate registration
self.addEventListener('install', (event) => {
  console.log('🔧 Service worker installing');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service worker activated');
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

import { WhitelistService } from './whitelist-service';

console.log('BadBot background script loading...');

const whitelistService = new WhitelistService();

console.log('WhitelistService initialized');

// Immediately test if we can log
setInterval(() => {
  console.log('🔄 Background script heartbeat:', new Date().toISOString());
}, 30000); // Every 30 seconds

chrome.runtime.onInstalled.addListener(async () => {
  console.log('BadBot extension installed');
  
  try {
    await whitelistService.syncWhitelist();
    console.log('Initial whitelist sync completed');
  } catch (error) {
    console.error('Initial whitelist sync failed:', error);
  }

  setupPeriodicSync();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('BadBot extension started');
  
  if (await whitelistService.shouldSync()) {
    try {
      await whitelistService.syncWhitelist();
      console.log('Startup whitelist sync completed');
    } catch (error) {
      console.error('Startup whitelist sync failed:', error);
    }
  }

  setupPeriodicSync();
});

function setupPeriodicSync() {
  chrome.alarms.create('syncWhitelist', {
    delayInMinutes: 15,
    periodInMinutes: 15
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Alarm triggered:', alarm.name);
  if (alarm.name === 'syncWhitelist') {
    if (await whitelistService.shouldSync()) {
      try {
        await whitelistService.syncWhitelist();
        console.log('Periodic whitelist sync completed');
      } catch (error) {
        console.error('Periodic whitelist sync failed:', error);
      }
    }
  }
});

// Add a console log when the message listener is being set up
console.log('Setting up message listener...');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message, 'from sender:', sender);
  
  if (message.action === 'ping') {
    console.log('Received ping, responding with pong');
    sendResponse({ pong: true });
    return true;
  }
  
  if (message.action === 'getWhitelist') {
    console.log('Handling getWhitelist request');
    whitelistService.getStoredWhitelist().then(users => {
      console.log('Sending whitelist response:', users.length, 'users');
      sendResponse({ users });
    }).catch(error => {
      console.error('Error getting whitelist:', error);
      sendResponse({ error: error.message });
    });
    return true;
  }
  
  if (message.action === 'isUserWhitelisted') {
    console.log('Handling isUserWhitelisted request for username:', message.username);
    whitelistService.isUserWhitelisted(message.username).then(isWhitelisted => {
      console.log('User whitelist check result:', message.username, '=', isWhitelisted);
      sendResponse({ isWhitelisted });
    }).catch(error => {
      console.error('Error checking user whitelist:', error);
      sendResponse({ error: error.message });
    });
    return true;
  }
  
  if (message.action === 'syncWhitelist') {
    console.log('Handling syncWhitelist request');
    whitelistService.syncWhitelist().then(users => {
      console.log('Sync completed, sending response with', users.length, 'users');
      sendResponse({ users, success: true });
    }).catch(error => {
      console.error('Error syncing whitelist:', error);
      sendResponse({ error: error.message, success: false });
    });
    return true;
  }
  
  console.log('Unknown message action:', message.action);
  return false;
});

console.log('BadBot background script setup complete');