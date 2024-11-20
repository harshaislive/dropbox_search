import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <img 
              src="https://beforest.co/wp-content/uploads/2024/10/23-Beforest-Black-with-Tagline.png#6421" 
              alt="Beforest Logo" 
              className="h-12 w-auto"
            />
            <h1 className="ml-3 text-xl font-semibold text-gray-900">
              Dropbox Search
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated && (
              <>
                <span className="text-sm text-gray-600">
                  Welcome, {user?.username}
                  {user?.isAdmin && ' (Admin)'}
                </span>
                <button
                  onClick={logout}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
