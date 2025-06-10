import { Configuration, PublicApiApi } from '../api';
import type { WhitelistedUser } from '../api/models';

interface WhitelistData {
  users: WhitelistedUser[];
  lastSyncTime: number;
  totalCount: number;
}

export class WhitelistService {
  private api: PublicApiApi;
  private storageKey = 'goodreplies_whitelist';
  private lastSyncKey = 'goodreplies_last_sync';

  constructor(apiBaseUrl: string = 'http://localhost:5006') {
    const config = new Configuration({
      basePath: apiBaseUrl
    });
    this.api = new PublicApiApi(config);
  }

  async syncWhitelist(): Promise<WhitelistedUser[]> {
    try {
      const response = await this.api.getWhitelistedUsersApiWhitelistedUsersGet();
      const users = response.data.users;
      const totalCount = response.data.total_count;
      
      const whitelistData: WhitelistData = {
        users,
        lastSyncTime: Date.now(),
        totalCount
      };

      await this.saveToStorage(whitelistData);
      console.log(`Synced ${users.length} whitelisted users`);
      
      return users;
    } catch (error) {
      console.error('Failed to sync whitelist:', error);
      throw error;
    }
  }

  async getStoredWhitelist(): Promise<WhitelistedUser[]> {
    try {
      const data = await this.getFromStorage();
      return data?.users || [];
    } catch (error) {
      console.error('Failed to get stored whitelist:', error);
      return [];
    }
  }

  async getLastSyncTime(): Promise<number> {
    try {
      const data = await this.getFromStorage();
      return data?.lastSyncTime || 0;
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      return 0;
    }
  }

  async shouldSync(): Promise<boolean> {
    const lastSync = await this.getLastSyncTime();
    const fifteenMinutes = 15 * 60 * 1000;
    const jitter = Math.random() * 60 * 1000; // 0-60 seconds jitter
    
    return Date.now() - lastSync > (fifteenMinutes + jitter);
  }

  isUserWhitelisted(username: string): Promise<boolean> {
    return this.getStoredWhitelist().then(users => 
      users.some(user => user.username.toLowerCase() === username.toLowerCase())
    );
  }

  private async saveToStorage(data: WhitelistData): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [this.storageKey]: data }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    } else {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
  }

  private async getFromStorage(): Promise<WhitelistData | null> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get([this.storageKey], (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result[this.storageKey] || null);
          }
        });
      });
    } else {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    }
  }
}