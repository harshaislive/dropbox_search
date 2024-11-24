import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  username: string;
  email?: string;
  isAdmin?: boolean;
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

// Get the API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

// Store OTPs in memory (in a real app, this should be in a database)
const otpStore = new Map<string, Set<string>>();

if (!N8N_WEBHOOK_URL) {
  console.error('VITE_N8N_WEBHOOK_URL environment variable is not set');
}

// Generate a 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate 100 OTPs for an email
const generateOtpSet = (email: string) => {
  const otps = new Set<string>();
  while (otps.size < 100) {
    otps.add(generateOtp());
  }
  otpStore.set(email, otps);
  return Array.from(otps);
};

// Validation functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._-]+@beforest\.co$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): { isValid: boolean; message: string } => {
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
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (!parsedUser.username) {
          throw new Error('Invalid user data');
        }
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (username: string, password: string): Promise<any> => {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      if (!data.user || !data.token || !data.user.username) {
        throw new Error('Invalid response from server');
      }

      setUser(data.user);
      setIsAuthenticated(true);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } catch (error: any) {
      console.error('Login error:', error);
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

      // Generate 100 OTPs and select one randomly
      const otps = generateOtpSet(email);
      const selectedOtp = otps[Math.floor(Math.random() * otps.length)];

      // Send OTP via n8n webhook
      if (!N8N_WEBHOOK_URL) {
        throw new Error('N8N webhook URL not configured');
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
        throw new Error('Failed to send OTP. Please try again.');
      }

      return { success: true, message: 'Registration successful. Please verify your email.' };
    } catch (error: any) {
      console.error('Registration error:', error);
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
      // Check if OTP exists in the set of generated OTPs
      const otpSet = otpStore.get(email);
      if (!otpSet || !otpSet.has(otp)) {
        throw new Error('Invalid OTP');
      }

      // Remove the used OTP
      otpSet.delete(otp);

      // If this was the last OTP, remove the email entry
      if (otpSet.size === 0) {
        otpStore.delete(email);
      }

      // Create a mock user for now (in a real app, this would come from the backend)
      const user = {
        username: email.split('@')[0],
        email,
        isAdmin: false
      };

      setUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('user', JSON.stringify(user));
      
      return true;
    } catch (error: any) {
      console.error('OTP verification error:', error);
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
      // Generate new set of OTPs if needed
      if (!otpStore.has(email)) {
        generateOtpSet(email);
      }

      const otps = Array.from(otpStore.get(email) || []);
      if (otps.length === 0) {
        throw new Error('No OTPs available');
      }

      const selectedOtp = otps[Math.floor(Math.random() * otps.length)];

      if (!N8N_WEBHOOK_URL) {
        throw new Error('N8N webhook URL not configured');
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
      console.error('Resend OTP error:', error);
      throw new Error(error.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    try {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Clear any stored OTPs for the user
      if (user?.email) {
        otpStore.delete(user.email);
      }
    } catch (error) {
      console.error('Logout error:', error);
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
