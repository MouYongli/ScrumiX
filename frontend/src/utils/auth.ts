/**
 * Authentication utility functions for cookie-based session management
 */

export interface User {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  is_verified: boolean;
  provider: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user: User;
  provider?: string;
  auth_method?: string;
}

/**
 * Set whether to use mock authentication (for development without database)
 */
const USE_MOCK_AUTH = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_USE_REAL_AUTH;

// Log authentication mode for debugging
if (typeof window !== 'undefined') {
  console.log(`🔐 Authentication Mode: ${USE_MOCK_AUTH ? 'MOCK (No Database Required)' : 'REAL (Database Required)'}`);
  if (USE_MOCK_AUTH) {
    console.log('💡 To use real authentication, set NEXT_PUBLIC_USE_REAL_AUTH=true in your .env.local file');
    console.log('🔑 Keycloak authentication will work in hybrid mode (real backend + mock tokens)');
  }
}

/**
 * Mock authentication functions for development
 */
const mockAuth = {
  login: async (email: string, password: string, rememberMe: boolean): Promise<LoginResponse> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simulate authentication logic
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    
    // Create mock user data
    const mockUser: User = {
      id: Math.random().toString(), // Simulate database ID
      email: email,
      full_name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
      username: email.split('@')[0],
      avatar_url: undefined,
      is_verified: true,
      provider: 'local'
    };
    
    // Simulate cookie behavior by storing auth indicator
    if (typeof window !== 'undefined') {
      localStorage.setItem('mock_auth_token', 'mock-session-' + Date.now());
      localStorage.setItem('mock_auth_expires', (Date.now() + (30 * 60 * 1000)).toString()); // 30 min
      if (rememberMe) {
        localStorage.setItem('mock_refresh_token', 'mock-refresh-' + Date.now());
        localStorage.setItem('mock_refresh_expires', (Date.now() + (7 * 24 * 60 * 60 * 1000)).toString()); // 7 days
      }
    }
    
    return {
      access_token: '', // Don't expose tokens (simulating HTTP-only cookies)
      refresh_token: '',
      token_type: 'bearer',
      expires_in: 1800,
      user: mockUser,
      auth_method: 'cookie'
    };
  },

  register: async (userData: {
    email: string;
    password: string;
    full_name?: string;
    username?: string;
  }): Promise<User> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate validation
    if (userData.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    
    // Create mock user
    const mockUser: User = {
      id: Math.random().toString(),
      email: userData.email,
      full_name: userData.full_name || userData.email.split('@')[0],
      username: userData.username || userData.email.split('@')[0],
      avatar_url: undefined,
      is_verified: false, // Would need email verification
      provider: 'local'
    };
    
    return mockUser;
  },

  isAuthenticated: async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    
    const authToken = localStorage.getItem('mock_auth_token');
    const expires = localStorage.getItem('mock_auth_expires');
    
    if (!authToken || !expires) return false;
    
    // Check if token is expired
    if (Date.now() > parseInt(expires)) {
      // Try to refresh if refresh token exists
      const refreshToken = localStorage.getItem('mock_refresh_token');
      const refreshExpires = localStorage.getItem('mock_refresh_expires');
      
      if (refreshToken && refreshExpires && Date.now() < parseInt(refreshExpires)) {
        // Simulate refresh
        localStorage.setItem('mock_auth_expires', (Date.now() + (30 * 60 * 1000)).toString());
        return true;
      }
      
      // Clear expired tokens
      localStorage.removeItem('mock_auth_token');
      localStorage.removeItem('mock_auth_expires');
      localStorage.removeItem('mock_refresh_token');
      localStorage.removeItem('mock_refresh_expires');
      return false;
    }
    
    return true;
  },

  logout: async (): Promise<void> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Clear mock auth tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mock_auth_token');
      localStorage.removeItem('mock_auth_expires');
      localStorage.removeItem('mock_refresh_token');
      localStorage.removeItem('mock_refresh_expires');
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    const isAuth = await mockAuth.isAuthenticated();
    if (!isAuth) return null;
    
    const user = getCurrentUser();
    if (user) return user;
    
    // Return a default mock user if none stored
    return {
      id: '1',
      email: 'user@example.com',
      full_name: 'Mock User',
      username: 'mockuser',
      avatar_url: undefined,
      is_verified: true,
      provider: 'local'
    };
  }
};

/**
 * Get the current user from localStorage (user info is not sensitive)
 */
export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Set current user data in localStorage
 */
const setCurrentUser = (user: User): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user', JSON.stringify(user));
};

/**
 * Get authentication provider
 */
export const getAuthProvider = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_provider');
};

/**
 * Set authentication provider
 */
const setAuthProvider = (provider: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_provider', provider);
};

/**
 * Check if user is authenticated by verifying with the server
 * This works because cookies are automatically included in the request
 */
export const isAuthenticated = async (): Promise<boolean> => {
  // In mock mode, check for both mock tokens AND Keycloak authentication
  if (USE_MOCK_AUTH) {
    // First check if we have a Keycloak user stored
    const currentUser = getCurrentUser();
    const authProvider = getAuthProvider();
    
    if (currentUser && authProvider === 'keycloak') {
      // For Keycloak users in mock mode, verify with server using cookies
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
          method: 'GET',
          credentials: 'include', // Include HTTP-only cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const serverUser = await response.json();
          // Update local storage with fresh server data
          setCurrentUser(serverUser);
          console.log('✅ Keycloak authentication verified with server:', serverUser);
          return true;
        } else {
          console.log('❌ Keycloak server verification failed');
        }
      } catch (error) {
        console.error('Keycloak auth verification failed:', error);
      }
    }
    
    // Fall back to mock authentication check
    return await mockAuth.isAuthenticated();
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
      method: 'GET',
      credentials: 'include', // Include HTTP-only cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const user = await response.json();
      setCurrentUser(user);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Auth check failed:', error);
    return false;
  }
};

/**
 * Synchronous auth check using stored user data
 * Note: This only checks if user data exists locally, not server validity
 */
export const isAuthenticatedSync = (): boolean => {
  return getCurrentUser() !== null;
};

/**
 * Login with email and password
 */
export const login = async (
  email: string, 
  password: string, 
  rememberMe: boolean = false
): Promise<LoginResponse> => {
  // Use mock authentication in development mode
  if (USE_MOCK_AUTH) {
    const loginData = await mockAuth.login(email, password, rememberMe);
    setCurrentUser(loginData.user);
    setAuthProvider('local');
    return loginData;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies in request
    body: JSON.stringify({ 
      email, 
      password, 
      remember_me: rememberMe 
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Login failed');
  }
  
  const loginData: LoginResponse = await response.json();
  
  // Store user data (tokens are in HTTP-only cookies)
  setCurrentUser(loginData.user);
  setAuthProvider('local');
  
  return loginData;
};

/**
 * Register new user
 */
export const register = async (userData: {
  email: string;
  password: string;
  full_name?: string;
  username?: string;
}): Promise<User> => {
  // Use mock authentication in development mode
  if (USE_MOCK_AUTH) {
    return await mockAuth.register(userData);
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(userData),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Registration failed');
  }
  
  return response.json();
};

/**
 * Logout user by calling the logout endpoint and clearing local data
 */
export const logout = async (): Promise<void> => {
  // Use mock authentication in development mode
  if (USE_MOCK_AUTH) {
    await mockAuth.logout();
    // Clear local user data for mock mode
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('auth_provider');
      localStorage.removeItem('oauth_state');
    }
    return;
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include', // Include cookies for logout
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Logout API call failed:', error);
    // Continue with local cleanup even if API call fails
  }
  
  // Clear local user data
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_provider');
    localStorage.removeItem('oauth_state');
  }
};

/**
 * Refresh access token using refresh token cookie
 * Handles both local and Keycloak authentication
 */
export const refreshToken = async (): Promise<boolean> => {
  try {
    const authProvider = getAuthProvider();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // Choose refresh endpoint based on auth provider
    const refreshEndpoint = authProvider === 'keycloak' 
      ? `${baseUrl}/api/v1/auth/oauth/keycloak/refresh`
      : `${baseUrl}/api/v1/auth/refresh`;
    
    const response = await fetch(refreshEndpoint, {
      method: 'POST',
      credentials: 'include', // Include refresh token cookie
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const refreshData: LoginResponse = await response.json();
      setCurrentUser(refreshData.user);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return false;
  }
};

/**
 * Make an authenticated API request
 * Cookies are automatically included, so no manual token handling needed
 */
export const authenticatedFetch = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  // Convert relative URLs to absolute URLs
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const fullUrl = url.startsWith('/') ? `${baseUrl}${url}` : url;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  const config: RequestInit = {
    ...options,
    credentials: 'include', // Always include cookies
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  const response = await fetch(fullUrl, config);
  
  // If unauthorized, try to refresh token once
  if (response.status === 401) {
    const refreshSuccessful = await refreshToken();
    
    if (refreshSuccessful) {
      // Retry the original request
      return fetch(fullUrl, config);
    } else {
      // Refresh failed, redirect to login
      logout();
      window.location.href = '/auth/login';
      throw new Error('Authentication failed');
    }
  }
  
  return response;
};

/**
 * Get current user info from server (useful for updating user data)
 */
export const getCurrentUserFromServer = async (): Promise<User | null> => {
  // Use mock authentication in development mode
  if (USE_MOCK_AUTH) {
    return await mockAuth.getCurrentUser();
  }

  try {
    const response = await authenticatedFetch('/api/v1/auth/me');
    
    if (response.ok) {
      const user = await response.json();
      setCurrentUser(user);
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};

/**
 * Login with Keycloak OAuth (using secure cookies)
 * This function ALWAYS uses real authentication, regardless of mock mode
 */
export const loginWithKeycloak = async (
  code: string, 
  state: string, 
  redirectUri: string
): Promise<LoginResponse> => {
  // Always use real backend for Keycloak (never mock)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const url = `${baseUrl}/api/v1/auth/oauth/keycloak/callback`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies in request
    body: JSON.stringify({ 
      code, 
      state, 
      redirect_uri: redirectUri 
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Keycloak login failed');
  }
  
  const loginData: LoginResponse = await response.json();
  
  // Debug logging for Keycloak user data
  console.log('🔐 Keycloak loginData received:', loginData);
  console.log('👤 User data to store:', loginData.user);
  
  // Store user data and set auth provider (works in both mock and real mode)
  setCurrentUser(loginData.user);
  setAuthProvider('keycloak');
  
  // If in mock mode, also set mock tokens to make isAuthenticated work
  if (USE_MOCK_AUTH && typeof window !== 'undefined') {
    localStorage.setItem('mock_auth_token', 'keycloak-session-' + Date.now());
    localStorage.setItem('mock_auth_expires', (Date.now() + (30 * 60 * 1000)).toString()); // 30 min
    localStorage.setItem('mock_refresh_token', 'keycloak-refresh-' + Date.now());
    localStorage.setItem('mock_refresh_expires', (Date.now() + (7 * 24 * 60 * 60 * 1000)).toString()); // 7 days
    console.log('🔄 Mock mode detected: Set mock tokens for Keycloak session');
  }
  
  return loginData;
};

/**
 * Get Keycloak authorization URL
 * This function ALWAYS uses real backend, regardless of mock mode
 */
export const getKeycloakAuthUrl = async (origin: string = 'login'): Promise<{
  authorization_url: string;
  state: string;
}> => {
  // Always use real backend for Keycloak (never mock)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const url = `${baseUrl}/api/v1/auth/oauth/keycloak/authorize?origin=${origin}`;
  
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to get Keycloak authorization URL');
  }
  
  return response.json();
};

/**
 * Check if user is using Keycloak authentication
 */
export const isKeycloakAuth = (): boolean => {
  return getAuthProvider() === 'keycloak';
};

/**
 * Check if user is using local authentication
 */
export const isLocalAuth = (): boolean => {
  return getAuthProvider() === 'local';
};

/**
 * Change user password
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const response = await authenticatedFetch('/api/v1/auth/password/change', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Password change failed');
  }
}; 