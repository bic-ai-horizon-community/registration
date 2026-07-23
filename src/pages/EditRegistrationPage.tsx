import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { subscribeToRegistrationByToken, updateRegistration } from '../firebase/db';
import { subscribeToSettings } from '../firebase/settings';
import { useAuth } from '../hooks/useAuth';
import type { EventSettings, Registration } from '../types';

export const EditRegistrationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [responses, setResponses] = useState<Record<string, string>>({});

  useEffect(() => {
    let unsubscribeSettings: (() => void) | undefined;
    let unsubscribeRegistration: (() => void) | undefined;

    if (!token) {
      navigate('/');
      return;
    }

    if (!authLoading) {
      unsubscribeSettings = subscribeToSettings((config) => {
        setSettings(config);
        
        unsubscribeRegistration = subscribeToRegistrationByToken(token, (reg) => {
          if (!reg) {
            setError('Registration not found. Invalid token.');
            setLoadingConfig(false);
            return;
          }

          if (reg.userId && (!user || reg.userId !== user.uid)) {
            setError('Access denied. You must be signed in with the account that created this registration.');
            setLoadingConfig(false);
            return;
          }

          setRegistration(reg);
          
          setResponses(prev => {
            if (Object.keys(prev).length > 0) return prev;
            const initialResponses: Record<string, string> = { ...reg.responses };
            config.formFields.forEach(field => {
              if (initialResponses[field.id] === undefined) {
                initialResponses[field.id] = '';
              }
            });
            return initialResponses;
          });
          
          setLoadingConfig(false);
        });
      });
    }

    return () => {
      if (unsubscribeSettings) unsubscribeSettings();
      if (unsubscribeRegistration) unsubscribeRegistration();
    };
  }, [token, navigate, user, authLoading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setResponses(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateRegistration(registration.id, responses);
      setSuccess('Registration updated successfully!');
      
      // Update local registration state
      setRegistration({ ...registration, responses });
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred during update. Check permissions.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loadingConfig) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error && !registration) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <Card className="p-12 border-red-200 bg-red-50 dark:bg-red-950/20">
          <h2 className="text-2xl font-bold mb-2 text-red-600">Access Error</h2>
          <p className="text-red-500">{error}</p>
          <Button onClick={() => navigate('/')} className="mt-6" variant="outline">
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight mb-3 text-gray-900 dark:text-gray-50">
          Edit Registration
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Update your details below.
        </p>
      </div>

      <Card className="shadow-lg border-0 ring-1 ring-gray-200 dark:ring-gray-800">
        <CardHeader className="bg-brand-50/50 dark:bg-brand-950/20 border-b border-gray-100 dark:border-gray-800 rounded-t-xl">
          <CardTitle className="text-xl">Your Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm font-medium">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {settings?.formFields.map(field => (
                field.type === 'select' ? (
                  <div key={field.id} className={field.id === 'email' ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      name={field.id}
                      required={field.required}
                      value={responses[field.id] || ''}
                      onChange={handleChange}
                      className="flex h-12 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:text-gray-50"
                    >
                      <option value="" disabled className="bg-white dark:bg-gray-900 text-gray-500">Select {field.label.toLowerCase()}</option>
                      {(field.options || []).map((opt, i) => (
                        <option key={i} value={opt} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50">
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <Input
                    key={field.id}
                    label={field.label}
                    name={field.id}
                    type={field.type}
                    required={field.required}
                    value={responses[field.id] || ''}
                    onChange={handleChange}
                    readOnly={field.id === 'email'}
                    placeholder={`Enter your ${field.label.toLowerCase()}`}
                    className={field.id === 'email' ? 'md:col-span-2 bg-gray-50 dark:bg-gray-900 cursor-not-allowed' : ''}
                  />
                )
              ))}
            </div>
            
            <div className="pt-4 flex gap-4">
              <Button type="submit" className="flex-1 h-12 text-lg" isLoading={loading}>
                Save Changes
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 h-12 text-lg"
                onClick={() => navigate('/')}
              >
                View Ticket
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
