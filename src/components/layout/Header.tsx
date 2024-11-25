import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-4">
        <div className="flex flex-col sm:flex-row justify-center sm:justify-between items-center space-y-3 sm:space-y-0">
          <div className="flex justify-center w-full sm:w-auto">
            <img 
              src="https://beforest.co/wp-content/uploads/2024/10/23-Beforest-Black-with-Tagline.png#6421" 
              alt="Beforest Logo" 
              className="h-10 sm:h-12 w-auto"
            />
          </div>
          
          {isAuthenticated && (
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <a
                href="https://dropboxuploader-production.up.railway.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-md transition-colors flex items-center space-x-2 text-sm sm:text-base"
              >
                <span>Upload to Beforest</span>
              </a>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600 hidden sm:inline">
                  Welcome, {user?.username}
                  {user?.isAdmin && ' (Admin)'}
                </span>
                <button
                  onClick={logout}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
