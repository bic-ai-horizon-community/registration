import React from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ScanLine, LogOut, Settings, CalendarDays, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { logoutUser } from '../firebase/auth';
import { ADMIN_EMAIL } from '../config';
import { useAdminEvent } from '../contexts/AdminEventContext';

export const AdminLayout: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { events, selectedEventId, setSelectedEventId, loading: eventLoading } = useAdminEvent();
  const location = useLocation();

  if (authLoading || eventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#020817]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!user || !user.email || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Events', path: '/admin/events', icon: CalendarDays },
    { name: 'Scanner', path: '/admin/scanner', icon: ScanLine },
    { name: 'Registrations', path: '/admin/registrations', icon: Users },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020817] flex flex-col md:flex-row">
      {/* Sidebar — desktop only */}
      <aside className="w-64 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-[#020817] hidden md:flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-gray-50">Admin Panel</span>
          </Link>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => logoutUser()}
            className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header - Desktop & Mobile */}
        <header className="h-14 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-[#020817] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center space-x-2 md:hidden">
            <div className="h-7 w-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-bold text-base">Admin</span>
          </div>
          
          <div className="hidden md:flex items-center text-sm font-medium text-gray-500">
            Viewing Event:
          </div>

          <div className="flex-1 md:flex-none flex justify-end md:justify-start ml-2 mr-2 md:ml-4">
            <div className="relative inline-block text-left w-48 sm:w-64">
              <select
                value={selectedEventId || ''}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="block w-full appearance-none rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-3 py-1.5 pr-8 text-sm focus:border-brand-500 focus:outline-none focus:ring-brand-500 dark:border-gray-700 dark:text-gray-50 truncate font-semibold"
              >
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name} {event.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          <button onClick={() => logoutUser()} className="md:hidden p-2 text-gray-500 hover:text-red-500 transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav — Fixed */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0a0f1a] border-t border-gray-200 dark:border-gray-800 flex justify-around items-center h-16 z-50 safe-area-bottom">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-1.5 px-2 min-w-[60px] transition-colors ${
                  isActive 
                    ? 'text-brand-600 dark:text-brand-400' 
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] font-medium mt-0.5">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
