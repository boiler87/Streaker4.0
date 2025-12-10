import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import Dashboard from './pages/Dashboard';
import Stats from './pages/Stats';
import Badges from './pages/Badges';
import History from './pages/History';
import About from './pages/About';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Navbar from './components/Navbar';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="h-screen bg-darker flex items-center justify-center text-primary">Loading...</div>;
  
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AppRoutes: React.FC = () => {
    const { user } = useAuth();
    
    return (
        <Router>
            <div className="min-h-screen bg-darker text-gray-100 font-sans selection:bg-primary/30">
                {user && <Navbar />}
                {/* Updated padding: 
                    Mobile: pt-6 (top spacing), pb-24 (bottom spacing for fixed nav h-16)
                    Desktop: pt-28 (top spacing for fixed nav h-20), pb-12 (standard bottom spacing) 
                */}
                <main className={`container mx-auto px-4 ${user ? 'pt-6 pb-24 md:pb-12 md:pt-28' : ''}`}>
                    <Routes>
                        <Route path="/login" element={!user ? <Auth /> : <Navigate to="/" />} />
                        <Route path="/u/:userId" element={<PublicProfile />} />
                        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                        <Route path="/stats" element={<PrivateRoute><Stats /></PrivateRoute>} />
                        <Route path="/badges" element={<PrivateRoute><Badges /></PrivateRoute>} />
                        <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
                        <Route path="/about" element={<PrivateRoute><About /></PrivateRoute>} />
                        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
        <AppRoutes />
    </AuthProvider>
  );
};

export default App;