import { WhitelistService } from './whitelist-service';

const whitelistService = new WhitelistService();

chrome.runtime.onInstalled.addListener(async () => {
  console.log('Good Replies extension installed');
  
  try {
    await whitelistService.syncWhitelist();
    console.log('Initial whitelist sync completed');
  } catch (error) {
    console.error('Initial whitelist sync failed:', error);
  }

  setupPeriodicSync();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('Good Replies extension started');
  
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getWhitelist') {
    whitelistService.getStoredWhitelist().then(users => {
      sendResponse({ users });
    }).catch(error => {
      sendResponse({ error: error.message });
    });
    return true;
  }
  
  if (message.action === 'isUserWhitelisted') {
    whitelistService.isUserWhitelisted(message.username).then(isWhitelisted => {
      sendResponse({ isWhitelisted });
    }).catch(error => {
      sendResponse({ error: error.message });
    });
    return true;
  }
  
  if (message.action === 'syncWhitelist') {
    whitelistService.syncWhitelist().then(users => {
      sendResponse({ users, success: true });
    }).catch(error => {
      sendResponse({ error: error.message, success: false });
    });
    return true;
  }
});