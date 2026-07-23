import React, { useEffect, useState } from 'react';
import { Search, Download, FileSpreadsheet, Edit, X, Save } from 'lucide-react';
import { subscribeToRegistrations, updateRegistration, updateAttendanceStatus } from '../firebase/db';
import { useAdminEvent } from '../contexts/AdminEventContext';
import { exportToCsv, exportToExcel } from '../utils/exportCsv';
import type { Registration, FormField } from '../types';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const AdminRegistrationsPage: React.FC = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const { selectedEvent: activeEvent } = useAdminEvent();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Editing state
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [editResponses, setEditResponses] = useState<Record<string, string>>({});
  const [editPresent, setEditPresent] = useState<boolean>(false);
  const [savingEdit, setSavingEdit] = useState(false);

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

  const filteredRegistrations = registrations.filter(reg => {
    const term = searchTerm.toLowerCase();
    return Object.values(reg.responses).some(val =>
      String(val).toLowerCase().includes(term)
    );
  });

  const handleExport = () => {
    if (filteredRegistrations.length > 0 && activeEvent) {
      exportToCsv(filteredRegistrations, activeEvent.formFields, `registrations_export_${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  const handleExportExcel = () => {
    if (filteredRegistrations.length > 0 && activeEvent) {
      exportToExcel(filteredRegistrations, activeEvent.formFields, `registrations_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  const getFullName = (reg: Registration) => reg.responses.fullName || Object.values(reg.responses)[0] || 'Unknown';
  const getEmail = (reg: Registration) => reg.responses.email || '';

  const handleOpenEdit = (reg: Registration) => {
    setEditingReg(reg);
    setEditResponses({ ...reg.responses });
    setEditPresent(reg.present);
  };

  const handleTogglePresentQuick = async (reg: Registration) => {
    if (!activeEvent) return;
    try {
      await updateAttendanceStatus(activeEvent.id, reg.id, !reg.present);
    } catch (err) {
      alert('Failed to update attendance status');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg || !activeEvent) return;
    setSavingEdit(true);
    try {
      await updateRegistration(activeEvent.id, editingReg.id, editResponses);
      if (editingReg.present !== editPresent) {
        await updateAttendanceStatus(activeEvent.id, editingReg.id, editPresent);
      }
      setEditingReg(null);
    } catch (err) {
      alert('Failed to update registration');
    } finally {
      setSavingEdit(false);
    }
  };

  if (!activeEvent && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg font-medium">No Active Event</p>
        <p className="text-sm">Please create and activate an event from the Events tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">All Registrations</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage and export attendees for <span className="font-semibold text-brand-600">{activeEvent?.name}</span>.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={handleExportExcel} variant="primary" disabled={filteredRegistrations.length === 0 || !activeEvent} className="w-full sm:w-auto">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={handleExport} variant="outline" disabled={filteredRegistrations.length === 0 || !activeEvent} className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
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
                {activeEvent?.formFields.filter(f => f.id !== 'fullName' && f.id !== 'email').map(field => (
                  <th key={field.id} className="px-6 py-4 font-medium whitespace-nowrap">{field.label}</th>
                ))}
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Registered</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
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
                      <div className="text-xs text-gray-400 font-mono mt-1">ID: {reg.id.slice(0, 8)}</div>
                    </td>
                    {activeEvent?.formFields.filter(f => f.id !== 'fullName' && f.id !== 'email').map(field => (
                      <td key={field.id} className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {reg.responses[field.id] || '-'}
                      </td>
                    ))}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePresentQuick(reg)}
                          title="Click to toggle attendance"
                          className="focus:outline-none"
                        >
                          {reg.present ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors whitespace-nowrap">
                              Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-200 transition-colors whitespace-nowrap">
                              Pending
                            </span>
                          )}
                        </button>
                        {reg.present && reg.checkedInAt && (
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">
                            {new Date(reg.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(reg.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(reg)}
                        className="text-gray-500 hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No registrations found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Admin Edit Registration Modal */}
      {editingReg && activeEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Edit Attendee Details</h3>
              <button 
                onClick={() => setEditingReg(null)}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-100 dark:border-brand-900/30 flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-white">Attendance Status</label>
                    <p className="text-xs text-gray-500">Mark attendee as present or absent</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditPresent(!editPresent)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      editPresent 
                        ? 'bg-green-600 text-white shadow-sm' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {editPresent ? 'Present' : 'Pending'}
                  </button>
                </div>

                {activeEvent.formFields.map((field: FormField) => (
                  <div key={field.id} className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {field.label} {field.required && <span className="text-brand-500">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        required={field.required}
                        value={editResponses[field.id] || ''}
                        onChange={(e) => setEditResponses(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-gray-700 dark:text-gray-50"
                      >
                        <option value="" disabled>Select an option</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        type={field.type}
                        required={field.required}
                        value={editResponses[field.id] || ''}
                        onChange={(e) => setEditResponses(prev => ({ ...prev, [field.id]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingReg(null)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={savingEdit}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
