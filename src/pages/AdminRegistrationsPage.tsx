import React, { useEffect, useState } from 'react';
import { Search, Download, FileSpreadsheet } from 'lucide-react';
import { subscribeToRegistrations } from '../firebase/db';
import { subscribeToSettings } from '../firebase/settings';
import { exportToCsv } from '../utils/exportCsv';
import type { Registration, EventSettings } from '../types';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const AdminRegistrationsPage: React.FC = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let unsubscribeSettings: (() => void) | undefined;
    let unsubscribeRegistrations: (() => void) | undefined;

    unsubscribeSettings = subscribeToSettings((config) => {
      setSettings(config);
    });

    unsubscribeRegistrations = subscribeToRegistrations((data) => {
      data.sort((a, b) => b.createdAt - a.createdAt);
      setRegistrations(data);
      setLoading(false);
    });

    return () => {
      if (unsubscribeSettings) unsubscribeSettings();
      if (unsubscribeRegistrations) unsubscribeRegistrations();
    };
  }, []);

  const filteredRegistrations = registrations.filter(reg => {
    const term = searchTerm.toLowerCase();
    // Search across all dynamic responses
    return Object.values(reg.responses).some(val => 
      String(val).toLowerCase().includes(term)
    );
  });

  const handleExport = () => {
    if (registrations.length > 0 && settings) {
      exportToCsv(filteredRegistrations, settings.formFields, `registrations_export_${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  const getFullName = (reg: Registration) => reg.responses.fullName || Object.values(reg.responses)[0] || 'Unknown';
  const getEmail = (reg: Registration) => reg.responses.email || '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">All Registrations</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage and export all event attendees.</p>
        </div>
        <Button onClick={handleExport} variant="outline" disabled={filteredRegistrations.length === 0 || !settings} className="w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="p-4 flex items-center space-x-2">
        <Search className="w-5 h-5 text-gray-400" />
        <Input 
          type="text" 
          placeholder="Search registrations..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-0 focus:ring-0 px-0 h-auto text-base"
        />
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/50 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium">Primary Info</th>
                {settings?.formFields.filter(f => f.id !== 'fullName' && f.id !== 'email').slice(0, 2).map(field => (
                  <th key={field.id} className="px-6 py-4 font-medium hidden md:table-cell">{field.label}</th>
                ))}
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                  </td>
                </tr>
              ) : filteredRegistrations.length > 0 ? (
                filteredRegistrations.map((reg) => (
                  <tr key={reg.id} className="bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{getFullName(reg)}</div>
                      <div className="text-sm text-gray-500">{getEmail(reg)}</div>
                      <div className="text-xs text-gray-400 font-mono mt-1">ID: {reg.id.slice(0,8)}</div>
                    </td>
                    
                    {settings?.formFields.filter(f => f.id !== 'fullName' && f.id !== 'email').slice(0, 2).map(field => (
                      <td key={field.id} className="px-6 py-4 text-gray-600 dark:text-gray-300 hidden md:table-cell">
                        {reg.responses[field.id] || '-'}
                      </td>
                    ))}

                    <td className="px-6 py-4">
                      {reg.present ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 w-max">
                            Present
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            {reg.checkedInAt && new Date(reg.checkedInAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(reg.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center flex flex-col items-center">
                    <FileSpreadsheet className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-gray-500">No registrations found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
