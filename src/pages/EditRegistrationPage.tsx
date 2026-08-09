import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Save, Download, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
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
  // Track whether this is a manual (anonymous) registration
  const [isManualRegistration, setIsManualRegistration] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token || !eventId) {
      setLoading(false);
      return;
    }

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
  }, [token, eventId]);

  // First, try to load the registration by token only to determine if it's manual or Google-based
  useEffect(() => {
    if (!token || !eventId || authLoading) return;

    setLoading(true);

    // Try loading by token only first (works for manual registrations with userId == null)
    const unsubscribe = subscribeToRegistrationByToken(eventId, token, (data) => {
      if (data) {
        if (data.userId === null || data.userId === undefined) {
          // This is a manual registration — no auth needed
          setIsManualRegistration(true);
          setRegistration(data);
          setResponses(data.responses);
          setLoading(false);
        } else {
          // This is a Google registration — need auth to verify ownership
          setIsManualRegistration(false);
          if (user) {
            if (user.uid === data.userId) {
              setRegistration(data);
              setResponses(data.responses);
            } else {
              setError('Registration not found or belongs to a different account.');
            }
          }
          // If not signed in, we'll show sign-in prompt (loading stays true until auth resolves)
          setLoading(false);
        }
      } else {
        setError('Registration not found.');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [token, eventId, user, authLoading]);

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
      const finalResponses = { ...responses };
      
      // Lock email fields
      if (isManualRegistration) {
        // For manual registrations, keep the original email from responses
        for (const field of eventData.formFields) {
          if (field.type === 'email') {
            finalResponses[field.id] = registration.responses[field.id] || responses[field.id];
          }
        }
      } else if (user) {
        for (const field of eventData.formFields) {
          if (field.type === 'email' && user.email) {
            finalResponses[field.id] = user.email;
          }
        }
      }

      for (const field of eventData.formFields) {
        if (field.required && !finalResponses[field.id]) {
          throw new Error(`${field.label} is required`);
        }
      }
      await updateRegistration(eventId, registration.id, finalResponses);
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
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin"></div>
          <p className="text-sm text-gray-500">Loading registration...</p>
        </div>
      </div>
    );
  }

  // Google registration but user not signed in — show sign-in prompt
  if (isManualRegistration === false && !user) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center animate-fade-in-up">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 sm:p-12">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-6">
              <AlertCircle className="w-7 h-7 text-brand-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Sign In Required</h2>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              You must be signed in to view or edit this ticket.
            </p>
            <button 
              onClick={signInWithGoogle}
              className="w-full inline-flex items-center justify-center gap-3 h-12 px-6 rounded-xl text-sm font-semibold bg-white text-gray-900 hover:bg-gray-100 transition-all active:scale-[0.98]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Google registration but wrong user
  if (isManualRegistration === false && user && registration && registration.userId && user.uid !== registration.userId) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center animate-fade-in-up">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-8 sm:p-12">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400 text-sm mb-8">
              You are signed in as <span className="text-white font-medium">{user.email}</span>, but this ticket belongs to a different account.
            </p>
            <Button onClick={() => navigate('/')} className="w-full h-11 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !registration) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center animate-fade-in-up">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <p className="text-red-400 text-sm mb-6">{error}</p>
            <Button onClick={() => navigate('/')} className="h-11 rounded-xl px-6">Return Home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!registration || !eventData) return null;

  // For the email display in locked fields
  const displayEmail = isManualRegistration 
    ? (registration.responses?.email || '') 
    : (user?.email || '');

  return (
    <div className="min-h-screen bg-[#030712] py-8 sm:py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Registration Details</h1>
          <p className="mt-2 text-sm text-gray-400">For {eventData.name}</p>
        </div>

        {/* Attendance confirmed banner */}
        {registration.present && (
          <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-4 flex flex-col sm:flex-row items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 shrink-0 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <h3 className="font-semibold text-emerald-300 text-sm">Attendance Confirmed</h3>
              <p className="text-emerald-400/70 text-xs mt-0.5">
                You have been marked present.{registration.checkedInAt ? ` Checked in at ${new Date(registration.checkedInAt).toLocaleString()}.` : ''} Editing is no longer permitted.
              </p>
            </div>
          </div>
        )}

        {/* Main content grid */}
        <div className="grid md:grid-cols-2 gap-6 animate-fade-in-up animate-delay-200">
          {/* QR Card */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 border-b border-white/[0.04]">
              <h3 className="text-sm font-semibold text-gray-300 text-center tracking-wide uppercase">Your Entry Pass</h3>
            </div>
            <div className="p-6 sm:p-8 flex flex-col items-center justify-center flex-1">
              <div className={`bg-white p-3 rounded-2xl shadow-2xl mb-6 ${registration.present ? 'shadow-emerald-500/10 ring-2 ring-emerald-500/20' : 'shadow-white/5'}`}>
                <QRCodeSVG
                  id="qr-code-svg"
                  value={window.location.href}
                  size={180}
                  level="H"
                  includeMargin={true}
                  className="rounded-xl"
                />
              </div>
              <p className="text-xs text-gray-500 mb-6 font-mono bg-white/[0.03] border border-white/[0.06] px-4 py-2 rounded-lg w-full text-center truncate">
                {token}
              </p>
              <Button onClick={downloadQR} variant="outline" className="w-full h-10 rounded-xl border-white/[0.08] text-gray-300 hover:bg-white/[0.04] hover:text-white">
                <Download className="w-4 h-4 mr-2" />
                Save QR Code
              </Button>
            </div>
          </div>

          {/* Details Form */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.04]">
              <h3 className="text-sm font-semibold text-gray-300 tracking-wide uppercase">Personal Details</h3>
            </div>
            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium">
                  {success}
                </div>
              )}
              <form onSubmit={handleSave} className="space-y-4">
                {eventData.formFields.map((field: FormField) => {
                  const isEmailField = field.type === 'email';
                  const isLocked = isEmailField;
                  const fieldValue = isLocked ? displayEmail : (responses[field.id] || '');
                  const isDisabled = registration.present || isLocked;
                  
                  return (
                  <div key={field.id} className="space-y-1.5">
                    <label htmlFor={field.id} className="block text-xs font-medium text-gray-400">
                      {field.label} {field.required && <span className="text-brand-400">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        id={field.id}
                        required={field.required}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        disabled={registration.present}
                        className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <option value="" disabled>Select an option</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        id={field.id}
                        required={field.required}
                        rows={3}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        disabled={registration.present}
                        className="w-full p-3 text-sm rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-40 resize-y placeholder:text-gray-600"
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    ) : (
                      <div className="relative">
                        <Input
                          id={field.id}
                          type={field.type}
                          required={field.required}
                          value={fieldValue}
                          onChange={(e) => handleChange(field.id, e.target.value)}
                          disabled={isDisabled}
                          className={`h-10 rounded-xl bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-600 ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                        />
                        {isLocked && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                            {isManualRegistration ? 'Locked' : 'From Google'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
                {!registration.present && (
                  <div className="pt-3 mt-3 border-t border-white/[0.04]">
                    <Button type="submit" className="w-full h-10 rounded-xl shadow-lg shadow-brand-500/20" isLoading={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
