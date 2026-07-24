import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Save, Circle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { updateEvent, setActiveEvent } from '../firebase/events';
import { useAdminEvent } from '../contexts/AdminEventContext';
import type { FormField } from '../types';

export const AdminSettingsPage: React.FC = () => {
  const { selectedEvent: activeEvent } = useAdminEvent();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const handleToggleRegistration = () => {
    if (!activeEvent) return;
    updateEvent(activeEvent.id, { isRegistrationOpen: !activeEvent.isRegistrationOpen });
  };

  const handleAddField = () => {
    if (!activeEvent) return;
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false
    };
    updateEvent(activeEvent.id, { formFields: [...activeEvent.formFields, newField] });
  };

  const handleRemoveField = (id: string) => {
    if (!activeEvent) return;
    if (activeEvent.formFields.length <= 1) return;
    updateEvent(activeEvent.id, {
      formFields: activeEvent.formFields.filter(f => f.id !== id)
    });
  };

  const handleUpdateField = (id: string, key: keyof FormField, value: any) => {
    if (!activeEvent) return;
    const updatedFields = activeEvent.formFields.map(field => {
      if (field.id === id) {
        return { ...field, [key]: value };
      }
      return field;
    });
    updateEvent(activeEvent.id, { formFields: updatedFields });
  };

  const handleSave = async () => {
    if (!activeEvent) return;
    setSaving(true);
    try {
      // In this setup, we just trigger a save animation to give user feedback, 
      // since updates are real-time. But for form fields, we could batch it if we wanted.
      // We already do real-time updates above, so this just shows success.
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg font-medium">No Active Event</p>
        <p className="text-sm">Please create and select an event to edit settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Configure settings for <span className="font-semibold text-brand-600">{activeEvent.name}</span></p>
        </div>
        <Button onClick={handleSave} isLoading={saving} className="bg-brand-600 hover:bg-brand-700">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-900/50 rounded-lg text-green-700 dark:text-green-400 text-sm font-medium">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-800">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-50">Registration Status</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {activeEvent.isRegistrationOpen 
                  ? 'Registration is currently open. Attendees can sign up.' 
                  : 'Registration is closed. The form is disabled.'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={activeEvent.isRegistrationOpen}
                onChange={handleToggleRegistration}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-800">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-50">Active Event Status</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {activeEvent.isActive 
                  ? 'This is the active event shown on the public registration page.' 
                  : 'This event is hidden from the public registration page.'}
              </p>
            </div>
            {!activeEvent.isActive ? (
              <Button 
                variant="outline" 
                className="text-brand-600 hover:text-brand-700 hover:bg-brand-50" 
                onClick={() => setActiveEvent(activeEvent.id)}
              >
                <Circle className="w-4 h-4 mr-2" />
                Set as Active
              </Button>
            ) : (
              <Button 
                variant="secondary" 
                className="opacity-50 cursor-default hover:bg-secondary"
                disabled
              >
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                Currently Active
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Registration Form Fields</CardTitle>
          <Button variant="outline" size="sm" onClick={handleAddField}>
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeEvent.formFields.map((field) => (
              <div key={field.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg group">
                <div className="cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hidden sm:block">
                  <GripVertical className="w-5 h-5" />
                </div>
                
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-4 w-full">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Field Label</label>
                    <Input 
                      value={field.label}
                      onChange={(e) => handleUpdateField(field.id, 'label', e.target.value)}
                      placeholder="e.g. Phone Number"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Field Type</label>
                    <select 
                      value={field.type}
                      onChange={(e) => handleUpdateField(field.id, 'type', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-gray-700 dark:text-gray-50"
                    >
                      <option value="text">Text (Short)</option>
                      <option value="textarea">Textarea (Multi-line / Referrals)</option>
                      <option value="email">Email</option>
                      <option value="tel">Phone Number</option>
                      <option value="number">Number</option>
                      <option value="select">Dropdown Select</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-4 h-full pt-5">
                    <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={field.required}
                        onChange={(e) => handleUpdateField(field.id, 'required', e.target.checked)}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900"
                      />
                      <span>Required</span>
                    </label>
                    
                    <button 
                      onClick={() => handleRemoveField(field.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                      title="Remove field"
                      disabled={activeEvent.formFields.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {field.type === 'select' && (
                  <div className="w-full sm:w-auto sm:ml-10 mt-2 sm:mt-0 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-100 dark:border-gray-800">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Dropdown Options (comma separated)</label>
                    <Input 
                      value={(field.options || []).join(', ')}
                      onChange={(e) => handleUpdateField(field.id, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="Option 1, Option 2, Option 3"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
