import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { logoutUser } from '../firebase/auth';
import { Button } from './ui/Button';

export const Layout: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#020817]">
      <header className="sticky top-0 z-10 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-[#020817]/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-5xl">
          <Link to="/" className="flex items-center gap-3 sm:gap-4">
            <img src="/community.png" alt="AI Horizon Community" className="h-8 sm:h-10 w-auto object-contain" />
            <div className="h-6 sm:h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
            <img src="/college.png" alt="Biratnagar International College" className="h-8 sm:h-10 w-auto object-contain" />
          </Link>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline-block">
                  {user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={() => logoutUser()} className="text-gray-500">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <Outlet />
      </main>
      
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© {new Date().getFullYear()} AI Horizon Community. All rights reserved.</p>
      </footer>
    </div>
  );
};
