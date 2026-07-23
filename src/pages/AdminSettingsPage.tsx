import React, { useEffect, useState } from 'react';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { subscribeToSettings, updateSettings } from '../firebase/settings';
import type { EventSettings, FormField } from '../types';

export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToSettings((data) => {
      setSettings(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleToggleRegistration = () => {
    if (!settings) return;
    setSettings({ ...settings, isRegistrationOpen: !settings.isRegistrationOpen });
  };

  const handleAddField = () => {
    if (!settings) return;
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false
    };
    setSettings({ ...settings, formFields: [...settings.formFields, newField] });
  };

  const handleRemoveField = (id: string) => {
    if (!settings) return;
    // Don't allow removing the last field
    if (settings.formFields.length <= 1) return;
    
    setSettings({
      ...settings,
      formFields: settings.formFields.filter(f => f.id !== id)
    });
  };

  const handleUpdateField = (id: string, key: keyof FormField, value: any) => {
    if (!settings) return;
    const updatedFields = settings.formFields.map(field => {
      if (field.id === id) {
        return { ...field, [key]: value };
      }
      return field;
    });
    setSettings({ ...settings, formFields: updatedFields });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSuccess('');
    try {
      await updateSettings(settings);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="flex h-32 items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Event Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Configure registration forms and event status.</p>
        </div>
        <Button onClick={handleSave} isLoading={saving} className="w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {success && (
        <div className="p-3 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm font-medium">
          {success}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Registration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{settings.isRegistrationOpen ? 'Open' : 'Closed'}</p>
                <p className="text-sm text-gray-500">Allow new registrations</p>
              </div>
              <button
                onClick={handleToggleRegistration}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 ${settings.isRegistrationOpen ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.isRegistrationOpen ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Form Builder</CardTitle>
            <Button onClick={handleAddField} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.formFields.map((field) => (
              <div key={field.id} className="flex flex-col p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex gap-3">
                  <div className="flex items-center mt-2 text-gray-400 cursor-move hidden sm:block">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 grid gap-3 grid-cols-1 sm:grid-cols-12">
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Field Label</label>
                      <Input 
                        value={field.label} 
                        onChange={(e) => handleUpdateField(field.id, 'label', e.target.value)}
                      />
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Field Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => handleUpdateField(field.id, 'type', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:text-gray-50"
                      >
                        <option value="text" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50">Text</option>
                        <option value="email" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50">Email</option>
                        <option value="tel" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50">Phone</option>
                        <option value="number" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50">Number</option>
                        <option value="select" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50">Dropdown Select</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center space-x-2 pt-5">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => handleUpdateField(field.id, 'required', e.target.checked)}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <label className="text-sm font-medium">Required</label>
                    </div>

                    <div className="flex items-center justify-end mt-2">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleRemoveField(field.id)}
                        disabled={settings.formFields.length <= 1}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {field.type === 'select' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Options (comma-separated)
                    </label>
                    <Input
                      value={field.options ? field.options.join(', ') : ''}
                      onChange={(e) => {
                        const opts = e.target.value.split(',').map(s => s.trim());
                        handleUpdateField(field.id, 'options', opts);
                      }}
                      placeholder="Option 1, Option 2, Option 3"
                    />
                  </div>
                )}
              </div>
            ))}
            
            <div className="text-sm text-gray-500 mt-4">
              <p>Note: Ensure you include an "Email" field type to prevent duplicate registrations automatically.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
