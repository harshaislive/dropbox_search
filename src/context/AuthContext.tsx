import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  username: string;
  email?: string;
  isAdmin?: boolean;
}

interface StoredUser {
  username: string;
  email: string;
  password: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<any>;
  register: (username: string, email: string, password: string, confirmPassword: string) => Promise<any>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
  resendOtp: (email: string, username: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Environment variables
const API_URL = import.meta.env.VITE_API_URL || 'https://dropbox-search-production.up.railway.app';
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'https://dropbox-search-feature-remember-me.vercel.app';
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
const NODE_ENV = import.meta.env.MODE || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// Validate required environment variables
if (!N8N_WEBHOOK_URL) {
  const error = 'VITE_N8N_WEBHOOK_URL environment variable is not set';
  console.error(error);
  if (IS_PRODUCTION) {
    throw new Error(error);
  }
}

// Simple password hashing (in a real app, use bcrypt or similar)
const hashPassword = (password: string): string => {
  try {
    return Array.from(password)
      .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Error processing password');
  }
};

// Generate a 6-digit OTP
const generateOtp = () => {
  try {
    return Math.floor(100000 + Math.random() * 900000).toString();
  } catch (error) {
    console.error('OTP generation error:', error);
    throw new Error('Failed to generate OTP');
  }
};

// Generate 100 OTPs for an email
const generateOtpSet = (email: string) => {
  try {
    const otps = new Set<string>();
    while (otps.size < 100) {
      otps.add(generateOtp());
    }
    return Array.from(otps);
  } catch (error) {
    console.error('OTP set generation error:', error);
    throw new Error('Failed to generate OTP set');
  }
};

// Validation functions
const validateEmail = (email: string): boolean => {
  try {
    const emailRegex = /^[a-zA-Z0-9._-]+@beforest\.co$/;
    return emailRegex.test(email);
  } catch (error) {
    console.error('Email validation error:', error);
    return false;
  }
};

const validatePassword = (password: string): { isValid: boolean; message: string } => {
  try {
    if (!password || typeof password !== 'string') {
      return { isValid: false, message: 'Invalid password format' };
    }

    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number' };
    }
    return { isValid: true, message: '' };
  } catch (error) {
    console.error('Password validation error:', error);
    return { isValid: false, message: 'Error validating password' };
  }
};

// Log error with consistent format
const logError = (context: string, error: any) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ${context}:`, {
    message: error.message || 'Unknown error',
    ...(error.stack && { stack: error.stack }),
    ...(IS_PRODUCTION ? {} : { fullError: error })
  });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/check-auth`, {
          credentials: 'include', // Important for sending cookies
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for receiving cookies
        body: JSON.stringify({ email, password, rememberMe }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      setUser(data.user);
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string, confirmPassword: string) => {
    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      console.log('Attempting registration with:', { username, email });

      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Registration failed:', data);
        throw new Error(data.message || 'Registration failed');
      }

      console.log('Registration successful:', data);
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    try {
      const response = await fetch(`${API_URL}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, otp }),
      });

      if (!response.ok) {
        throw new Error('OTP verification failed');
      }

      const data = await response.json();
      if (data.success) {
        setUser(data.user);
      }
      return data.success;
    } catch (error) {
      console.error('OTP verification error:', error);
      throw error;
    }
  };

  const resendOtp = async (email: string, username: string) => {
    try {
      const response = await fetch(`${API_URL}/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username }),
      });

      if (!response.ok) {
        throw new Error('Failed to resend OTP');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        isAuthenticated: !!user,
        isLoading,
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
