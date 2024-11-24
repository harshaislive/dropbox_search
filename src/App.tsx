import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SearchInterface } from './components/SearchInterface';
import { Header } from './components/layout/Header';
import { AuthForm } from './components/AuthForm';
import { AdminPanel } from './components/AdminPanel';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserCounter } from './components/UserCounter';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ 
  children, 
  adminOnly = false 
}) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && !user?.isAdmin) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gray-50">
    <Header />
    <main className="py-6">
      {children}
      <UserCounter />
    </main>
  </div>
);

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/" /> : <AuthForm />} 
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <Routes>
                    <Route path="analytics" element={<AdminPanel />} />
                    <Route path="*" element={<Navigate to="/admin/analytics" />} />
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <SearchInterface />
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;