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

// Environment variables
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
const NODE_ENV = import.meta.env.MODE || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// Store OTPs and users in memory (in a real app, this should be in a database)
const otpStore = new Map<string, Set<string>>();
const userStore = new Map<string, StoredUser>();
const usernameIndex = new Map<string, string>();

// Validate required environment variables
if (!N8N_WEBHOOK_URL) {
  const error = 'VITE_N8N_WEBHOOK_URL environment variable is not set';
  console.error(error);
  if (IS_PRODUCTION) {
    throw new Error(error);
  }
}

// Helper functions
const generateOtpSet = (email: string): string[] => {
  const otps = new Set<string>();
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otps.add(otp);
  otpStore.set(email, otps);
  return Array.from(otps);
};

const validateEmail = (email: string): boolean => {
  return email.endsWith('@beforest.co');
};

const logError = (context: string, error: any) => {
  console.error(`[${context}] Error:`, error);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize from localStorage and check session expiry
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const expiryTime = localStorage.getItem('sessionExpiry');
      
      if (storedUser && expiryTime) {
        const parsedUser = JSON.parse(storedUser);
        const expiry = parseInt(expiryTime);
        
        if (expiry > Date.now()) {
          setUser(parsedUser);
          setIsAuthenticated(true);
        } else {
          // Session expired
          logout();
        }
      }
    } catch (error) {
      logError('Auth initialization', error);
      logout();
    }
  }, []);

  const login = async (username: string, email: string): Promise<void> => {
    if (!username || !email) {
      throw new Error('Username and email are required');
    }

    setIsLoading(true);
    try {
      if (!validateEmail(email)) {
        throw new Error('Invalid email format. Only @beforest.co emails are allowed');
      }

      // Generate and send OTP
      const otps = generateOtpSet(email);
      const selectedOtp = otps[Math.floor(Math.random() * otps.length)];

      if (!N8N_WEBHOOK_URL) {
        throw new Error('OTP service not configured');
      }

      const otpResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username,
          otp: selectedOtp
        })
      });

      if (!otpResponse.ok) {
        throw new Error('Failed to send OTP');
      }

      // Store user data temporarily
      userStore.set(email, { username, email, isAdmin: false });
      usernameIndex.set(username, email);

    } catch (error: any) {
      logError('Login', error);
      throw new Error(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (email: string, otp: string): Promise<boolean> => {
    if (!email || !otp) {
      throw new Error('Email and OTP are required');
    }

    try {
      const otps = otpStore.get(email);
      if (!otps?.has(otp)) {
        throw new Error('Invalid OTP');
      }

      const userData = userStore.get(email);
      if (!userData) {
        throw new Error('User not found');
      }

      // Set session expiry to 24 hours from now
      const sessionExpiry = Date.now() + (24 * 60 * 60 * 1000);
      
      const userDataWithExpiry = {
        ...userData,
        sessionExpiry
      };

      // Update user data with session expiry
      userStore.set(email, userDataWithExpiry);
      
      // Store in localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('sessionExpiry', sessionExpiry.toString());

      setUser(userData);
      setIsAuthenticated(true);
      
      // Clear OTP after successful verification
      otpStore.delete(email);
      
      return true;
    } catch (error: any) {
      logError('OTP Verification', error);
      throw new Error(error.message || 'OTP verification failed');
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('sessionExpiry');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        verifyOtp,
        logout
      }}
    >
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
