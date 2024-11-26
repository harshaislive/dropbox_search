import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

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
  login: (username: string, email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
  logout: () => void;
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
const ANALYTICS_ADMIN_EMAILS = (import.meta.env.VITE_ANALYTICS_ADMIN_EMAILS || '').split(',').map(email => email.trim());

// Store OTPs and users in memory (in a real app, this should be in a database)
const otpStore = new Map<string, Set<string>>();
const userStore = new Map<string, StoredUser>();
const usernameIndex = new Map<string, string>();

// Log missing environment variables instead of throwing
if (!N8N_WEBHOOK_URL) {
  console.warn('VITE_N8N_WEBHOOK_URL environment variable is not set');
}

// Helper functions
const generateOtpSet = (email: string): string[] => {
  const otps = new Set<string>();
  // Generate 3 valid OTPs
  while (otps.size < 3) {
    otps.add(Math.random().toString(36).substring(2, 8).toUpperCase());
  }
  otpStore.set(email, otps);
  return Array.from(otps);
};

const validateEmail = (email: string): boolean => {
  return email.toLowerCase().endsWith('@beforest.co');
};

const logError = (context: string, error: any) => {
  console.error(`[${context}] Error:`, error);
  if (IS_PRODUCTION) {
    // Add production error logging here if needed
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser: StoredUser = JSON.parse(storedUser);
        const now = Date.now();
        if (!parsedUser.sessionExpiry || now < parsedUser.sessionExpiry) {
          setUser(parsedUser);
          userStore.set(parsedUser.email, parsedUser);
          usernameIndex.set(parsedUser.username.toLowerCase(), parsedUser.email);
        } else {
          localStorage.removeItem('user');
        }
      } catch (error) {
        logError('Session Restore', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, email: string) => {
    if (!validateEmail(email)) {
      throw new Error('Invalid email domain. Only @beforest.co emails are allowed.');
    }

    try {
      const otps = generateOtpSet(email);
      
      // Send OTP via N8N webhook
      if (N8N_WEBHOOK_URL) {
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otps }),
        });

        if (!response.ok) {
          throw new Error('Failed to send OTP');
        }
      } else {
        console.log('Development mode: OTPs generated:', otps);
      }
    } catch (error) {
      logError('Login', error);
      throw new Error('Failed to initiate login. Please try again.');
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, otp: string): Promise<boolean> => {
    const storedOtps = otpStore.get(email);
    if (!storedOtps?.has(otp)) {
      return false;
    }

    // Clear used OTP
    storedOtps.delete(otp);
    if (storedOtps.size === 0) {
      otpStore.delete(email);
    }

    const username = email.split('@')[0];
    const isAdmin = ANALYTICS_ENABLED && ANALYTICS_ADMIN_EMAILS.includes(username);
    const sessionDuration = parseInt(import.meta.env.VITE_ANALYTICS_SESSION_DURATION || '86400000');
    
    const userData: StoredUser = {
      username,
      email,
      isAdmin,
      sessionExpiry: Date.now() + sessionDuration
    };

    setUser(userData);
    userStore.set(email, userData);
    usernameIndex.set(username.toLowerCase(), email);
    localStorage.setItem('user', JSON.stringify(userData));

    return true;
  }, []);

  const logout = useCallback(() => {
    if (user) {
      userStore.delete(user.email);
      usernameIndex.delete(user.username.toLowerCase());
    }
    setUser(null);
    localStorage.removeItem('user');
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, verifyOtp, logout }}>
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
