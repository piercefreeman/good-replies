import { PublicApiApi, Configuration, AuthRequest } from '../api';

interface AuthState {
  isLoggedIn: boolean;
  apiKey?: string;
  userId?: string;
}

class PopupManager {
  private api: PublicApiApi;
  private authState: AuthState = { isLoggedIn: false };

  constructor() {
    const config = new Configuration({
      //basePath: 'https://api.goodreplies.com'
      basePath: 'http://localhost:5006'
    });
    this.api = new PublicApiApi(config);
    this.init();
  }

  private async init() {
    await this.checkAuthStatus();
    this.setupEventListeners();
    this.updateUI();
  }

  private async checkAuthStatus() {
    try {
      const result = await chrome.storage.local.get(['apiKey', 'userId']);
      if (result.apiKey && result.userId) {
        this.authState = {
          isLoggedIn: true,
          apiKey: result.apiKey,
          userId: result.userId
        };
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  }

  private setupEventListeners() {
    const loginBtn = document.getElementById('loginBtn') as HTMLButtonElement;
    const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;
    const actionBtn = document.getElementById('actionBtn') as HTMLButtonElement;
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;

    loginBtn?.addEventListener('click', () => this.handleLogin());
    logoutBtn?.addEventListener('click', () => this.handleLogout());
    actionBtn?.addEventListener('click', () => this.handleParseComments());

    emailInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });

    passwordInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
  }

  private async handleLogin() {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const loginBtn = document.getElementById('loginBtn') as HTMLButtonElement;
    const loginBtnText = document.getElementById('loginBtnText') as HTMLSpanElement;
    const loginSpinner = document.getElementById('loginSpinner') as HTMLDivElement;

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      this.showStatus('Please enter both email and password', 'error');
      return;
    }

    try {
      loginBtn.disabled = true;
      loginBtnText.textContent = 'Logging in...';
      loginSpinner.classList.remove('hidden');
      loginSpinner.style.display = 'inline-block';

      const authRequest: AuthRequest = {
        email,
        password
      };

      const response = await this.api.verifyAuthApiAuthVerifyPost(authRequest);

      if (response.data.success && response.data.user_id && response.data.api_key) {
        await chrome.storage.local.set({
          apiKey: response.data.api_key,
          userId: response.data.user_id
        });

        this.authState = {
          isLoggedIn: true,
          apiKey: response.data.api_key,
          userId: response.data.user_id
        };

        this.updateUI();
        this.showStatus('Login successful!', 'success');
        
        emailInput.value = '';
        passwordInput.value = '';
      } else {
        this.showStatus(response.data.message || 'Login failed', 'error');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Login failed';
      this.showStatus(errorMessage, 'error');
    } finally {
      loginBtn.disabled = false;
      loginBtnText.textContent = 'Login';
      loginSpinner.classList.add('hidden');
      loginSpinner.style.display = 'none';
    }
  }

  private async handleLogout() {
    try {
      await chrome.storage.local.remove(['apiKey', 'userId']);
      this.authState = { isLoggedIn: false };
      this.updateUI();
      this.showStatus('Logged out successfully', 'success');
    } catch (error) {
      console.error('Logout error:', error);
      this.showStatus('Error during logout', 'error');
    }
  }

  private async handleParseComments() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'parseComments' });
        
        if (response.success) {
          this.showStatus(`Found ${response.count} comments! Check console for JSON.`, 'success');
          console.log('Parsed comments JSON:', response.data);
        } else {
          this.showStatus(`Error: ${response.error}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      this.showStatus('Error communicating with page', 'error');
    }
  }

  private updateUI() {
    const loginForm = document.getElementById('loginForm') as HTMLDivElement;
    const mainContent = document.getElementById('mainContent') as HTMLDivElement;

    if (this.authState.isLoggedIn) {
      loginForm.classList.add('hidden');
      mainContent.classList.remove('hidden');
    } else {
      loginForm.classList.remove('hidden');
      mainContent.classList.add('hidden');
    }
  }

  private showStatus(message: string, type: 'success' | 'error') {
    const status = document.getElementById('status') as HTMLDivElement;
    
    status.textContent = message;
    status.className = `mt-4 p-3 rounded-md text-sm ${
      type === 'success' 
        ? 'bg-green-100 text-green-800 border border-green-300' 
        : 'bg-red-100 text-red-800 border border-red-300'
    }`;
    status.classList.remove('hidden');

    setTimeout(() => {
      status.classList.add('hidden');
    }, 4000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});