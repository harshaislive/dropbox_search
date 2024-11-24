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
  login: (username: string, password: string) => Promise<any>;
  register: (username: string, email: string, password: string, confirmPassword: string) => Promise<any>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
  resendOtp: (email: string, username: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
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
    otpStore.set(email, otps);
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (token && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (!parsedUser.username) {
          throw new Error('Invalid user data');
        }
        setUser(parsedUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      logError('Auth initialization', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, []);

  const login = async (username: string, password: string): Promise<any> => {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    setIsLoading(true);
    try {
      const userEmail = usernameIndex.get(username);
      if (!userEmail) {
        throw new Error('Invalid username or password');
      }

      const storedUser = userStore.get(userEmail);
      if (!storedUser || storedUser.password !== hashPassword(password)) {
        throw new Error('Invalid username or password');
      }

      const userData = {
        username: storedUser.username,
        email: storedUser.email,
        isAdmin: storedUser.isAdmin
      };

      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('user', JSON.stringify(userData));
      return { user: userData, token: 'mock-token' };
    } catch (error: any) {
      logError('Login', error);
      throw new Error(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    confirmPassword: string
  ): Promise<any> => {
    setIsLoading(true);
    try {
      // Input validation
      if (!username || !email || !password || !confirmPassword) {
        throw new Error('All fields are required');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!validateEmail(email)) {
        throw new Error('Invalid email format. Only @beforest.co emails are allowed');
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.message);
      }

      // Check existing users with clear messages
      const existingUserByEmail = userStore.has(email);
      const existingUserByUsername = usernameIndex.has(username);

      if (existingUserByEmail && existingUserByUsername) {
        throw new Error('Account already exists. Please login instead.');
      }
      
      if (existingUserByEmail) {
        throw new Error('Email is already registered. Please use a different email or login.');
      }
      
      if (existingUserByUsername) {
        throw new Error('Username is already taken. Please choose a different username.');
      }

      // Store user data
      const hashedPassword = hashPassword(password);
      const userData: StoredUser = {
        username,
        email,
        password: hashedPassword,
        isAdmin: false
      };

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

      // Only store user data after successful OTP sending
      userStore.set(email, userData);
      usernameIndex.set(username, email);

      return { success: true, message: 'Registration successful. Please verify your email.' };
    } catch (error: any) {
      logError('Registration', error);
      // Cleanup any partial data
      if (user?.email) {
        userStore.delete(user.email);
        usernameIndex.delete(user.username);
        otpStore.delete(user.email);
      }
      throw new Error(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (email: string, otp: string): Promise<boolean> => {
    if (!email || !otp) {
      throw new Error('Email and OTP are required');
    }

    setIsLoading(true);
    try {
      const userData = userStore.get(email);
      if (!userData) {
        throw new Error('User not found');
      }

      const otpSet = otpStore.get(email);
      if (!otpSet || !otpSet.has(otp)) {
        throw new Error('Invalid or expired OTP');
      }

      otpSet.delete(otp);
      if (otpSet.size === 0) {
        otpStore.delete(email);
      }

      const user = {
        username: userData.username,
        email: userData.email,
        isAdmin: userData.isAdmin
      };

      setUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('user', JSON.stringify(user));
      
      return true;
    } catch (error: any) {
      logError('OTP verification', error);
      throw new Error(error.message || 'OTP verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (email: string, username: string): Promise<void> => {
    if (!email || !username) {
      throw new Error('Email and username are required');
    }

    setIsLoading(true);
    try {
      if (!userStore.has(email)) {
        throw new Error('User not found');
      }

      if (!otpStore.has(email)) {
        generateOtpSet(email);
      }

      const otps = Array.from(otpStore.get(email) || []);
      if (otps.length === 0) {
        throw new Error('No OTPs available');
      }

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
    } catch (error: any) {
      logError('Resend OTP', error);
      throw new Error(error.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    try {
      if (user?.email) {
        otpStore.delete(user.email);
      }
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (error) {
      logError('Logout', error);
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
        isAuthenticated,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
