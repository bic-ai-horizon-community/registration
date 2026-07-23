import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Save, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { subscribeToRegistrationByToken, updateRegistration } from '../firebase/db';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import { signInWithGoogle } from '../firebase/auth';
import type { Registration, Event, FormField } from '../types';

export const EditRegistrationPage: React.FC = () => {
  const { eventId, token } = useParams<{ eventId: string; token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [eventData, setEventData] = useState<Event | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token || !eventId) {
      setLoading(false);
      return;
    }

    // Fetch event to get form fields
    const fetchEvent = async () => {
      try {
        const eventDoc = await getDoc(doc(db, "events", eventId));
        if (eventDoc.exists()) {
          setEventData({ id: eventDoc.id, ...eventDoc.data() } as Event);
        }
      } catch (err) {
        console.error("Error fetching event:", err);
      }
    };
    fetchEvent();

    const unsubscribe = subscribeToRegistrationByToken(eventId, token, (data) => {
      if (data) {
        setRegistration(data);
        setResponses(data.responses);
      } else {
        setError('Registration not found.');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [token, eventId]);

  const handleChange = (id: string, value: string) => {
    setResponses(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration || !eventId || !eventData) return;

    if (registration.present) {
      setError('Cannot edit registration after attendance is confirmed.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      for (const field of eventData.formFields) {
        if (field.required && !responses[field.id]) {
          throw new Error(`${field.label} is required`);
        }
      }
      await updateRegistration(eventId, registration.id, responses);
      setSuccess('Details updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `registration-${token}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020817] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!user && registration) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020817] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="w-12 h-12 text-brand-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You must be signed in to view or edit this ticket.
          </p>
          <Button onClick={signInWithGoogle} className="w-full">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </Button>
        </Card>
      </div>
    );
  }

  if (registration && user && registration.userId && user.uid !== registration.userId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020817] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You are signed in as {user.email}, but this ticket belongs to someone else.
          </p>
          <Button onClick={() => navigate('/')} className="w-full">Return Home</Button>
        </Card>
      </div>
    );
  }

  if (error && !registration) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020817] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => navigate('/')}>Return Home</Button>
        </Card>
      </div>
    );
  }

  if (!registration || !eventData) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020817] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Registration Details</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">For {eventData.name}</p>
        </div>

        {registration.present && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4 shadow-sm">
            <div className="bg-green-100 dark:bg-green-800 p-2 rounded-full shrink-0">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <h3 className="font-bold text-green-800 dark:text-green-300 text-lg">Attendance Confirmed</h3>
              <p className="text-green-600 dark:text-green-400 text-sm">
                You have been marked present.{registration.checkedInAt ? ` Checked in at ${new Date(registration.checkedInAt).toLocaleString()}.` : ''} Editing is no longer permitted.
              </p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="flex flex-col h-full border-brand-100 dark:border-gray-800 shadow-lg">
            <div className="bg-brand-50 dark:bg-gray-800/50 px-6 py-4 border-b border-brand-100 dark:border-gray-800">
              <h3 className="text-lg font-medium text-brand-900 dark:text-gray-200 text-center">Your Entry Pass</h3>
            </div>
            <CardContent className="p-8 flex flex-col items-center justify-center flex-1">
              <div className={`bg-white p-4 rounded-xl shadow-inner border mb-6 inline-block ${registration.present ? 'border-green-300 shadow-green-100' : 'border-gray-100'}`}>
                <QRCodeSVG
                  id="qr-code-svg"
                  value={window.location.href}
                  size={200}
                  level="H"
                  includeMargin={true}
                  className="rounded-lg"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-md">
                ID: {token}
              </p>
              <Button onClick={downloadQR} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Save QR Code
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg dark:border-gray-800">
            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">Personal Details</h3>
            </div>
            <CardContent className="p-6">
              {error && (
                <div className="mb-6 p-3 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              {success && (
                <div className="mb-6 p-3 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm font-medium">
                  {success}
                </div>
              )}
              <form onSubmit={handleSave} className="space-y-4">
                {eventData.formFields.map((field: FormField) => (
                  <div key={field.id} className="space-y-1.5">
                    <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {field.label} {field.required && <span className="text-brand-500">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        id={field.id}
                        required={field.required}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        disabled={registration.present}
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-50"
                      >
                        <option value="" disabled>Select an option</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={field.id}
                        type={field.type}
                        required={field.required}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        disabled={registration.present}
                        className="disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-800"
                      />
                    )}
                  </div>
                ))}
                {!registration.present && (
                  <div className="pt-4 mt-6 border-t border-gray-100 dark:border-gray-800">
                    <Button type="submit" className="w-full" isLoading={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
