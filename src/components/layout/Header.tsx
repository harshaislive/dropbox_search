import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-brand-offwhite/80 border-b border-brand-softgray/30">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <img 
                src="https://beforest.co/wp-content/uploads/2024/10/23-Beforest-Black-with-Tagline.png#6421" 
                alt="Beforest" 
                className="h-8 w-auto transition-transform duration-200 hover:scale-105"
              />
            </div>
            <div className="hidden md:block h-6 w-px bg-brand-softgray/50" />
            <span className="hidden md:inline font-body text-sm font-medium text-brand-charcoal tracking-wide">
              Dropbox Search
            </span>
          </div>

          {/* User Actions */}
          {isAuthenticated && (
            <div className="flex items-center space-x-3">
              {/* Upload Button */}
              <a
                href="https://dropboxuploader-production.up.railway.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center px-4 py-2 text-sm font-medium text-brand-offwhite bg-brand-forest rounded-full hover:bg-brand-olive transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-forest focus:ring-offset-2 focus:ring-offset-brand-offwhite"
              >
                <span className="relative z-10 transition-colors duration-200 group-hover:text-white">Upload to Beforest</span>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-forest to-brand-olive opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </a>

              {/* User Info */}
              <div className="hidden lg:flex items-center space-x-3 px-3 py-2 rounded-full bg-brand-softgray/30">
                <div className="w-6 h-6 rounded-full bg-brand-forest flex items-center justify-center">
                  <span className="text-xs font-medium text-brand-offwhite">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-brand-charcoal">
                  {user?.username}
                  {user?.isAdmin && (
                    <span className="ml-1 text-xs text-brand-forest font-medium">Admin</span>
                  )}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="group flex items-center justify-center w-9 h-9 rounded-full text-brand-charcoal hover:text-brand-red hover:bg-brand-softgray/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-forest focus:ring-offset-2 focus:ring-offset-brand-offwhite"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
