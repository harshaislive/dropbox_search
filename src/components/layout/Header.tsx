import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Mobile: Upload button (Col 1) */}
          <div className="flex sm:hidden">
            <a
              href="https://beforestuploads.replit.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900"
            >
              Upload
            </a>
          </div>

          {/* Logo (Col 2) */}
          <div className="flex justify-center flex-1 sm:flex-none">
            <Link to="/">
              <img 
                src="https://beforest.co/wp-content/uploads/2024/10/23-Beforest-Black-with-Tagline.png#6421" 
                alt="Beforest Logo" 
                className="h-8 sm:h-12 w-auto"
              />
            </Link>
          </div>

          {/* Desktop: Right section */}
          <div className="hidden sm:flex items-center space-x-4">
            {isAuthenticated && (
              <>
                <a
                  href="https://beforestuploads.replit.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-md transition-colors flex items-center space-x-2 text-sm sm:text-base"
                >
                  <span>Upload to Beforest</span>
                </a>
                <span className="text-sm text-gray-600">
                  Welcome, {user?.username}
                  {user?.isAdmin && ' (Admin)'}
                </span>
                {user?.isAdmin && (
                  <Link
                    to={isAdminPage ? "/" : "/admin/analytics"}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    {isAdminPage ? "Back to Search" : "Admin Panel"}
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Mobile: Logout button (Col 3) */}
          {isAuthenticated && (
            <div className="flex sm:hidden">
              <button
                onClick={logout}
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
