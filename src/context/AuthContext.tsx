import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { N8N_WEBHOOK_URL, validateRequiredEnv } from '../config/env';

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
  isAuthConfigured: () => boolean;
}

interface StoredUser {
  username: string;
  email: string;
  isAdmin: boolean;
  sessionExpiry?: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Environment variables with fallbacks
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
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Validate environment variables on initialization
    const validation = validateRequiredEnv();
    
    if (!validation.isValid) {
      console.warn('⚠️ Some environment variables are missing:');
      validation.missing.forEach(variable => {
        console.warn(`   • ${variable}`);
      });
      
      if (!N8N_WEBHOOK_URL) {
        console.warn('⚠️ N8N_WEBHOOK_URL environment variable is not set - authentication features may not work properly');
        console.warn('📋 Please set VITE_N8N_WEBHOOK_URL in your Railway dashboard if you want to use OTP authentication');
      }
    } else {
      console.log('✅ Authentication environment variables configured correctly');
    }
  }, []);

  const sendOTP = async (email: string) => {
    if (!N8N_WEBHOOK_URL) {
      throw new Error('Authentication service is not configured. Please check your environment variables.');
    }

    setIsLoading(true);
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          action: 'send_otp'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send OTP: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    if (!N8N_WEBHOOK_URL) {
      throw new Error('Authentication service is not configured. Please check your environment variables.');
    }

    setIsLoading(true);
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp,
          action: 'verify_otp'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to verify OTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const userData = { email, otpVerified: true };
        setUser(userData);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        return result;
      } else {
        throw new Error(result.message || 'OTP verification failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  // Check if authentication is properly configured
  const isAuthConfigured = () => {
    return !!N8N_WEBHOOK_URL;
  };

  const value: AuthContextType = {
    user,
    isLoading,
    sendOTP,
    verifyOTP,
    logout,
    isAuthConfigured
  };

  return (
    <AuthContext.Provider value={value}>
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
