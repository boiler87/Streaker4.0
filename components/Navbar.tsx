import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart2, Award, History, LogOut, Info, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { signOut, userProfile } = useAuth();

  const isActive = (path: string) => location.pathname === path ? 'text-primary' : 'text-gray-400 hover:text-white';

  return (
    <nav className="fixed bottom-0 md:top-0 md:bottom-auto w-full bg-card border-t md:border-t-0 md:border-b border-gray-700 z-50 h-16 md:h-20 flex items-center justify-center">
      <div className="container max-w-5xl mx-auto px-4 flex justify-between items-center h-full">
        <div className="hidden md:flex items-center space-x-2">
            <div className="bg-primary/20 p-2 rounded-lg">
                <Award className="text-primary w-6 h-6" />
            </div>
            <Link to="/" className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Streaker</Link>
        </div>

        <div className="flex w-full md:w-auto justify-around md:justify-center md:space-x-8">
          <Link to="/" className={`flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 transition-colors ${isActive('/')}`}>
            <Home size={24} />
            <span className="text-xs md:text-sm font-medium">Dashboard</span>
          </Link>
          <Link to="/stats" className={`flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 transition-colors ${isActive('/stats')}`}>
            <BarChart2 size={24} />
            <span className="text-xs md:text-sm font-medium">Stats</span>
          </Link>
          <Link to="/badges" className={`flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 transition-colors ${isActive('/badges')}`}>
            <Award size={24} />
            <span className="text-xs md:text-sm font-medium">Badges</span>
          </Link>
          <Link to="/history" className={`flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 transition-colors ${isActive('/history')}`}>
            <History size={24} />
            <span className="text-xs md:text-sm font-medium">History</span>
          </Link>
          {/* Mobile Only Profile Link */}
          <Link to="/profile" className={`md:hidden flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 transition-colors ${isActive('/profile')}`}>
            <User size={24} />
            <span className="text-xs md:text-sm font-medium">Profile</span>
          </Link>
          <Link to="/about" className={`flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 transition-colors ${isActive('/about')}`}>
            <Info size={24} />
            <span className="text-xs md:text-sm font-medium">About</span>
          </Link>
        </div>

        <div className="hidden md:flex items-center space-x-4">
            {userProfile && (
                <Link to="/profile" className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{userProfile.displayName}</span>
                        <span className="text-xs text-gray-500">View Profile</span>
                    </div>
                    <div className="bg-gray-800 p-2 rounded-full group-hover:bg-gray-700">
                        <User size={16} />
                    </div>
                </Link>
            )}
            <div className="w-px h-8 bg-gray-700 mx-2"></div>
            <button onClick={() => signOut()} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400" title="Sign Out">
                <LogOut size={20} />
            </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;