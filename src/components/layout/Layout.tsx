import React from 'react';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, showHeader = true }) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-brand-offwhite flex flex-col">
      {showHeader && user && <Header />}
      <main className={`flex-1 w-full max-w-full px-0 bg-brand-offwhite ${showHeader && user ? 'pt-16' : 'pt-8'} pb-8`}>
        {children}
      </main>
      <footer className="mt-auto py-6 text-center text-sm text-brand-charcoal/70 bg-brand-offwhite border-t border-brand-softgray/30">
        <div className="max-w-7xl mx-auto px-6">
          &copy; {new Date().getFullYear()} Beforest. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
