import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { registerAttendee, subscribeToRegistrationByUid } from '../firebase/db';
import { subscribeToSettings } from '../firebase/settings';
import { useAuth } from '../hooks/useAuth';
import { signInWithGoogle } from '../firebase/auth';
import type { EventSettings, Registration } from '../types';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    let unsubscribeSettings: (() => void) | undefined;
    let unsubscribeRegistration: (() => void) | undefined;

    if (!authLoading) {
      unsubscribeSettings = subscribeToSettings((config) => {
        setSettings(config);
        
        if (user) {
          unsubscribeRegistration = subscribeToRegistrationByUid(user.uid, async (existingReg) => {
            if (existingReg) {
              setRegistration(existingReg);
              const editUrl = `${window.location.origin}/edit/${existingReg.token}`;
              try {
                const qrUrl = await QRCode.toDataURL(editUrl, {
                  width: 300,
                  margin: 2,
                  color: { dark: '#000000', light: '#ffffff' },
                });
                setQrCodeUrl(qrUrl);
              } catch (err) {
                console.error(err);
              }
            } else {
              setRegistration(null);
              setResponses(prev => {
                if (Object.keys(prev).length > 0) return prev;
                const initialResponses: Record<string, string> = {};
                config.formFields.forEach(field => {
                  if (field.id === 'email' && user.email) {
                    initialResponses[field.id] = user.email;
                  } else if ((field.id === 'fullName' || field.label.toLowerCase().includes('name')) && user.displayName) {
                    initialResponses[field.id] = user.displayName;
                  } else {
                    initialResponses[field.id] = '';
                  }
                });
                return initialResponses;
              });
            }
            setLoadingConfig(false);
          });
        } else {
          setLoadingConfig(false);
        }
      });
    }

    return () => {
      if (unsubscribeSettings) unsubscribeSettings();
      if (unsubscribeRegistration) unsubscribeRegistration();
    };
  }, [user, authLoading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setResponses(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError('');

    try {
      const { token, id } = await registerAttendee(responses, user.uid);
      
      // Try to find full name for display on success page
      const fullNameField = settings?.formFields.find(f => f.id === 'fullName' || f.label.toLowerCase().includes('name'));
      const displayName = fullNameField ? responses[fullNameField.id] : 'Attendee';
      
      navigate('/success', { 
        state: { 
          token, 
          fullName: displayName,
          id
        } 
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
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

  // STATE 1: Logged in, Already Registered -> Show QR Code
  if (user && registration) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3 text-gray-900 dark:text-gray-50">
            Your Ticket
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Present this QR code at the entrance.
          </p>
        </div>

        <Card className="shadow-lg border-0 ring-1 ring-brand-200 dark:ring-brand-900/50 bg-gradient-to-b from-white to-brand-50/30 dark:from-gray-900 dark:to-brand-950/20">
          <CardContent className="pt-12 pb-12 flex flex-col items-center text-center">
            <div className="inline-block p-4 bg-white rounded-2xl shadow-sm mb-8 ring-1 ring-gray-100">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="Registration QR Code" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 bg-gray-100 animate-pulse rounded-lg"></div>
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {registration.responses['fullName'] || Object.values(registration.responses)[0] || 'Attendee'}
            </h2>
            <p className="text-brand-600 font-mono mb-8">{registration.id}</p>
            
            <Button 
              onClick={() => navigate(`/edit/${registration.token}`)}
              variant="outline"
              className="w-full max-w-xs"
            >
              Edit Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STATE 2: Logged out -> Prompt to login
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-gray-50">
          AI Horizon 2026
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Join the future of artificial intelligence. Secure your spot now.
        </p>
        <Card className="p-12 mt-8 max-w-md mx-auto shadow-lg border-0 ring-1 ring-gray-200 dark:ring-gray-800">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          <Button onClick={handleLogin} isLoading={loading} className="w-full h-14 text-lg bg-white text-gray-800 hover:bg-gray-50 ring-1 ring-gray-300 shadow-sm flex items-center justify-center">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              <path fill="none" d="M1 1h22v22H1z" />
            </svg>
            Continue with Google
          </Button>
        </Card>
      </div>
    );
  }

  // STATE 3: Registration Closed
  if (settings && !settings.isRegistrationOpen) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-gray-50">
          AI Horizon 2026
        </h1>
        <Card className="p-12 mt-8">
          <div className="text-gray-500 mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Registrations Closed</h2>
          <p className="text-gray-500">We are no longer accepting new registrations for this event.</p>
        </Card>
      </div>
    );
  }

  // STATE 4: Logged in, Not Registered -> Show Registration Form
  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight mb-3 text-gray-900 dark:text-gray-50">
          AI Horizon 2026
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Complete your registration below.
        </p>
      </div>

      <Card className="shadow-lg border-0 ring-1 ring-gray-200 dark:ring-gray-800">
        <CardHeader className="bg-brand-50/50 dark:bg-brand-950/20 border-b border-gray-100 dark:border-gray-800 rounded-t-xl">
          <CardTitle className="text-xl">Attendee Registration</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
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
            
            <div className="pt-4">
              <Button type="submit" className="w-full h-12 text-lg" isLoading={loading}>
                Complete Registration
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
