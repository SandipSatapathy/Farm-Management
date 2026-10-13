import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { LoginPage } from './pages/LoginPage';
import { SimpleFarmViewPage } from './pages/SimpleFarmViewPage';

export const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="app-container" style={{ display: 'block', minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Unified Farm Header */}
      <Navbar />

      {/* Unified Farm Management Interface */}
      <main>
        <SimpleFarmViewPage />
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

