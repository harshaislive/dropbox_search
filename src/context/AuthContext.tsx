import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';

// Types
interface User {
  username: string;
  email: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, email: string, password?: string, confirmPassword?: string) => Promise<{ success: boolean }>;
  resendOtp: (email: string, username: string) => Promise<void>;
}

interface StoredUser {
  username: string;
  email: string;
  isAdmin: boolean;
  sessionExpiry?: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Environment variables with fallbacks
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';
const NODE_ENV = import.meta.env.MODE || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const ANALYTICS_ENABLED = import.meta.env.VITE_ANALYTICS_ENABLED === 'true';
const ANALYTICS_ADMIN_EMAILS = (import.meta.env.VITE_ANALYTICS_ADMIN_EMAILS || '').split(',').map((email: string) => email.trim());

// Store OTPs and users in memory (in a real app, this should be in a database)
const otpStore = new Map<string, string>(); // Stores a single OTP per email
const userStore = new Map<string, StoredUser>();
const usernameIndex = new Map<string, string>();

// Log missing environment variables instead of throwing
if (!N8N_WEBHOOK_URL) {
  console.warn('VITE_N8N_WEBHOOK_URL environment variable is not set');
}

// Helper functions
const validateEmail = (email: string): boolean => {
  return email.trim().toLowerCase().endsWith('@beforest.co');
};

const logError = (context: string, error: any) => {
  console.error(`[${context}] Error:`, error);
  if (IS_PRODUCTION) {
    // Add production error logging here if needed
  }
};

// Internal helper for sending OTP
const _sendOtpInternal = async (email: string, usernameForEmail: string) => {
  console.log('[DEBUG] Email received for OTP:', JSON.stringify(email)); // Debug log

  if (!validateEmail(email)) {
    throw new Error('Invalid email domain. Only @beforest.co emails are allowed.');
  }
  const otp = Math.random().toString(36).substring(2, 8).toUpperCase();
  otpStore.set(email, otp);

  if (N8N_WEBHOOK_URL) {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username: usernameForEmail, otp }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      logError('_sendOtpInternal Fetch', `Status: ${response.status}, Body: ${errorBody}`);
      throw new Error('Failed to send OTP. Please check server logs.');
    }
  } else {
    console.log(`Development mode: OTP for ${email} (user: ${usernameForEmail}) generated: ${otp}`);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    console.log('[DEBUG] AuthProvider mounted');
    return () => {
      console.log('[DEBUG] AuthProvider unmounted');
    };
  }, []);

  // Synchronously load user from localStorage during initial render
  const [user, setUser] = useState<StoredUser | null>(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return null;
      
      const parsedUser = JSON.parse(storedUser) as StoredUser;
      const now = Date.now();
      
      // Check if session is still valid
      if (parsedUser.sessionExpiry && now < parsedUser.sessionExpiry) {
        userStore.set(parsedUser.email, parsedUser);
        return parsedUser;
      }
      
      // Clear expired session
      localStorage.removeItem('user');
      return null;
    } catch (error) {
      console.error('Error loading user from localStorage:', error);
      return null;
    }
  });
  
  const [isLoading, setIsLoading] = useState(!user); // Set loading to false if we have a user

  // Effect to handle auth state changes and persist to localStorage
  useEffect(() => {
    if (user) {
      // When user logs in or is restored
      localStorage.setItem('user', JSON.stringify(user));
      setIsLoading(false);
    } else {
      // When user logs out
      localStorage.removeItem('user');
      setIsLoading(false);
    }
  }, [user]);

  // This effect only logs the user state without modifying it
  useEffect(() => {
    console.log('[DEBUG] AuthContext user:', user, 'isAuthenticated:', !!user);
  }, [user]);

  const login = useCallback(async (email: string) => {
    const usernameForEmail = email.split('@')[0]; // Derive username for email personalization
    try {
      await _sendOtpInternal(email, usernameForEmail);
      // OTP is sent, user will verify it next. No user state change here.
    } catch (error) {
      logError('Login OTP Send', error);
      // Ensure the error message thrown is user-friendly or generic
      throw new Error(error instanceof Error ? error.message : 'Failed to initiate login. Please try again.');
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, otp: string): Promise<boolean> => {
    console.log('[DEBUG] Verifying OTP for email:', JSON.stringify(email), 'with OTP:', JSON.stringify(otp));
    const storedOtp = otpStore.get(email);
    console.log('[DEBUG] Stored OTP for email:', JSON.stringify(storedOtp));
    if (!storedOtp) {
      return false;
    }
    if (storedOtp !== otp) {
      // Do NOT delete the OTP if wrong, allow retry
      return false;
    }
    // Only clear OTP if correct
    otpStore.delete(email);

    const username = email.split('@')[0];
    const isAdmin = ANALYTICS_ENABLED && ANALYTICS_ADMIN_EMAILS.includes(username);
    // Always set sessionExpiry to 7 days from now unless overridden by env
    const defaultSessionDuration = 7 * 24 * 60 * 60 * 1000;
    const sessionDuration = parseInt(import.meta.env.VITE_ANALYTICS_SESSION_DURATION || `${defaultSessionDuration}`);
    const sessionExpiry = Date.now() + (isNaN(sessionDuration) ? defaultSessionDuration : sessionDuration);
    
    const userData: StoredUser = {
      username,
      email,
      isAdmin,
      sessionExpiry,
    };

    setUser(userData);
    userStore.set(email, userData);
    usernameIndex.set(username.toLowerCase(), email);
    localStorage.setItem('user', JSON.stringify(userData));

    return true;
  }, []);

  const register = useCallback(async (username: string, email: string, password?: string, confirmPassword?: string): Promise<{ success: boolean }> => {
    // Basic validation, passwords are not used by OTP logic but kept for potential future use
    if (!username || !email) {
      throw new Error('Username and email are required.');
    }
    if (password && password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }
    // validateEmail is called inside _sendOtpInternal

    try {
      await _sendOtpInternal(email, username); // Use the provided username for the registration email
      return { success: true }; // Indicates OTP was sent
    } catch (error) {
      logError('Register OTP Send', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to send registration OTP. Please try again.');
    }
  }, []);

  const resendOtp = useCallback(async (email: string, username: string) => {
    // validateEmail is called inside _sendOtpInternal
    try {
      await _sendOtpInternal(email, username);
    } catch (error) {
      logError('Resend OTP', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to resend OTP. Please try again.');
    }
  }, []);

  const logout = useCallback(() => {
    if (user) {
      userStore.delete(user.email);
      usernameIndex.delete(user.username.toLowerCase());
    }
    setUser(null);
    localStorage.removeItem('user');
    console.log('[DEBUG] logout called, setUser(null)');
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, verifyOtp, logout, register, resendOtp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
