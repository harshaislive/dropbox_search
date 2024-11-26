import React, { ReactNode } from 'react';
import { Header } from './Header';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAnalyticsUser = user?.email && 
    (user.email.includes('seshu') || user.email.includes('harsha'));

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-800">
                Beforest Search
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {isAnalyticsUser && (
                <Link
                  to="/analytics"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/analytics'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Analytics
                </Link>
              )}
              <button
                onClick={logout}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Header />
        {children}
      </main>
      <footer className="mt-auto py-4 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Dropbox Search. All rights reserved.
      </footer>
    </div>
  );
};
