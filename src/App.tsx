import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LoginForm } from './components/LoginForm';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SearchContainer } from './components/SearchContainer';
import GalleryList from './components/gallery/GalleryList';
import GalleryDetail from './components/gallery/GalleryDetail';
import { isGalleryEnabled, isAnalyticsEnabled, getAnalyticsAdminEmails } from './utils/config';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AnalyticsRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isAnalyticsUser = user?.email && isAnalyticsEnabled() && 
    getAnalyticsAdminEmails().some((email: string) => 
      user.email.toLowerCase().includes(email.toLowerCase())
    );
  
  if (!isAnalyticsUser) {
    return <Navigate to="/" />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const galleryEnabled = isGalleryEnabled();

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={
              <Layout showHeader={false}>
                <LoginForm />
              </Layout>
            } 
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <SearchContainer />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsRoute>
                  <AnalyticsDashboard />
                </AnalyticsRoute>
              </ProtectedRoute>
            }
          />
          {/* Gallery routes - conditionally rendered */}
          {galleryEnabled && (
            <>
              <Route
                path="/gallery"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <GalleryList />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/gallery/:galleryId"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <GalleryDetail />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route path="/gallery/:galleryId/edit" element={<div>Edit Gallery (Coming Soon)</div>} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;