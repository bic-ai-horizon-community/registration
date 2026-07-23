import React, { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { subscribeToRegistrations } from '../firebase/db';
import { useAdminEvent } from '../contexts/AdminEventContext';
import type { Registration } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const { selectedEvent: activeEvent } = useAdminEvent();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeEvent) {
      setRegistrations([]);
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeToRegistrations(activeEvent.id, (data) => {
      data.sort((a: Registration, b: Registration) => b.createdAt - a.createdAt);
      setRegistrations(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeEvent]);

  if (loading) {
    return <div className="flex h-32 items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  }

  const total = registrations.length;
  const present = registrations.filter(r => r.present).length;
  const absent = total - present;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
  
  const recentRegistrations = registrations.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Overview of event registrations and attendance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Registrations</p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{total}</h2>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Checked In</p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{present}</h2>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Absent</p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{absent}</h2>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center">
              <UserX className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Attendance Rate</p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{percentage}%</h2>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-50">Recent Registrations</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/50 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  {activeEvent?.formFields.filter(f => f.id !== 'fullName' && f.id !== 'email').map(field => (
                    <th key={field.id} className="px-6 py-4 font-medium whitespace-nowrap">{field.label}</th>
                  ))}
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {recentRegistrations.length > 0 ? (
                  recentRegistrations.map((reg) => (
                    <tr key={reg.id} className="bg-white dark:bg-transparent">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{reg.responses['fullName'] || Object.values(reg.responses)[0] || 'Unknown'}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{reg.responses['email'] || '-'}</td>
                      {activeEvent?.formFields.filter(f => f.id !== 'fullName' && f.id !== 'email').map(field => (
                        <td key={field.id} className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {reg.responses[field.id] || '-'}
                        </td>
                      ))}
                      <td className="px-6 py-4">
                        {reg.present ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No registrations yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
