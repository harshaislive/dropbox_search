import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateOTP, sendOTPEmail, validateOTP } from '../utils/email';

interface User {
  username: string;
  email?: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<any>;
  verifyOtp: (registrationData: any, otp: string) => Promise<boolean>;
  resendOtp: (registrationData: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    if (username === 'beforest' && password === 'BI@work') {
      const user = { username, isAdmin: true };
      setUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(user));
      return true;
    }

    try {
      const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      const foundUser = users.find(
        (u: any) => u.username === username && 
        u.password === password && 
        u.isVerified === true
      );
      
      if (foundUser) {
        const user = { 
          username: foundUser.username,
          email: foundUser.email 
        };
        setUser(user);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(user));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<any> => {
    try {
      const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      
      if (users.some((u: any) => u.username === username)) {
        return { success: false, message: 'Username already exists' };
      }
      if (users.some((u: any) => u.email === email)) {
        return { success: false, message: 'Email already registered' };
      }

      const otp = generateOTP();
      await sendOTPEmail(email, otp, username);

      const tempUser = {
        username,
        email,
        password,
        isVerified: false
      };

      localStorage.setItem('tempUser', JSON.stringify(tempUser));

      return { 
        success: true,
        username,
        email
      };
    } catch (err) {
      console.error('Registration error:', err);
      return { success: false, message: 'Registration failed' };
    }
  };

  const verifyOtp = async (registrationData: any, inputOtp: string): Promise<boolean> => {
    try {
      const tempUser = JSON.parse(localStorage.getItem('tempUser') || '{}');
      
      if (!tempUser.email) {
        return false;
      }

      // Validate OTP
      const isValid = validateOTP(tempUser.email, inputOtp);
      
      if (!isValid) {
        return false;
      }

      // Get existing users and add verified user
      const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      const verifiedUser = {
        ...tempUser,
        isVerified: true
      };
      
      users.push(verifiedUser);
      localStorage.setItem('registeredUsers', JSON.stringify(users));
      localStorage.removeItem('tempUser');

      return true;
    } catch (err) {
      console.error('OTP verification error:', err);
      return false;
    }
  };

  const resendOtp = async (registrationData: any): Promise<void> => {
    try {
      const tempUser = JSON.parse(localStorage.getItem('tempUser') || '{}');
      if (!tempUser.email) {
        throw new Error('No pending registration found');
      }

      const newOtp = generateOTP();
      await sendOTPEmail(tempUser.email, newOtp, tempUser.username);
    } catch (err) {
      console.error('Resend OTP error:', err);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
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
