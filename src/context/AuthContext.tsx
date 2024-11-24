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
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Get the API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
if (!API_URL) {
  console.error('VITE_API_URL environment variable is not set');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (username: string, password: string): Promise<any> => {
    setIsLoading(true);
    try {
      // For development, simulate a successful login
      const mockUser = {
        username,
        email: `${username}@beforest.co`,
        isAdmin: false
      };
      
      const mockResponse = {
        user: mockUser,
        token: 'mock-jwt-token'
      };

      setUser(mockResponse.user);
      setIsAuthenticated(true);
      localStorage.setItem('token', mockResponse.token);
      localStorage.setItem('user', JSON.stringify(mockResponse.user));
      return mockResponse;
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
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!email.endsWith('@beforest.co')) {
        throw new Error('Only @beforest.co email addresses are allowed');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // For development, simulate a successful registration
      const mockUser = {
        username,
        email,
        isAdmin: false
      };
      
      const mockResponse = {
        user: mockUser,
        token: 'mock-jwt-token'
      };

      setUser(mockResponse.user);
      setIsAuthenticated(true);
      localStorage.setItem('token', mockResponse.token);
      localStorage.setItem('user', JSON.stringify(mockResponse.user));
      return mockResponse;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
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
