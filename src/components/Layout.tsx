import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { logoutUser } from '../firebase/auth';
import { Button } from './ui/Button';

export const Layout: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#030712]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#030712]/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/community.png" 
              alt="AI Horizon Community" 
              className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105" 
            />
            <div className="h-5 w-px bg-white/10"></div>
            <img 
              src="/college.png" 
              alt="Biratnagar International College" 
              className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105" 
            />
          </Link>

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                <User className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm text-gray-300 max-w-[160px] truncate">
                  {user.email}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => logoutUser()} 
                className="text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-full px-3"
              >
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 text-center">
        <p className="text-xs text-gray-500 tracking-wide">
          &copy; {new Date().getFullYear()} AI Horizon Community &middot; Biratnagar International College
        </p>
      </footer>
    </div>
  );
};
