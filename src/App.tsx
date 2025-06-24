import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { LoginForm } from './components/LoginForm';
import { SearchContainer } from './components/SearchContainer';
import GalleryList from './components/gallery/GalleryList';
import GalleryDetail from './components/gallery/GalleryDetail';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import EnvironmentError from './components/EnvironmentError';
import { isGalleryEnabled } from './utils/config';
import { validateRequiredEnv } from './config/env';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Main App Content
const AppContent: React.FC = () => {
  const { user, isAuthConfigured } = useAuth();
  const [showEnvironmentError, setShowEnvironmentError] = useState(true);
  const validation = validateRequiredEnv();

  // Show environment error if there are missing variables and user hasn't dismissed it
  const shouldShowEnvironmentError = !validation.isValid && showEnvironmentError;

  return (
    <div className="min-h-screen bg-gray-50">
      {shouldShowEnvironmentError && (
        <EnvironmentError 
          feature="Dropbox Search Application"
          onDismiss={() => setShowEnvironmentError(false)}
        />
      )}

      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/" replace /> : (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                  {!isAuthConfigured() ? (
                    <div className="max-w-md w-full">
                      <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="text-center mb-6">
                          <h2 className="text-2xl font-bold text-gray-900">Authentication Unavailable</h2>
                          <p className="mt-2 text-sm text-gray-600">
                            Authentication service is not configured. Please set up your environment variables.
                          </p>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm text-yellow-800">
                            Missing VITE_N8N_WEBHOOK_URL environment variable.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <LoginForm />
                  )}
                </div>
              )
            } 
          />
          
          <Route path="/*" element={
            <Layout>
              <Routes>
                <Route path="/" element={
                  <ProtectedRoute>
                    <SearchContainer />
                  </ProtectedRoute>
                } />
                
                {isGalleryEnabled() && (
                  <>
                    <Route path="/galleries" element={
                      <ProtectedRoute>
                        <GalleryList />
                      </ProtectedRoute>
                    } />
                    <Route path="/galleries/:id" element={
                      <ProtectedRoute>
                        <GalleryDetail />
                      </ProtectedRoute>
                    } />
                  </>
                )}
                
                <Route path="/analytics" element={
                  <ProtectedRoute>
                    <AnalyticsDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </Router>
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;