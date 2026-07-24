import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CalendarDays, Ticket, LogIn } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { registerAttendee, getRegistrationByUid } from '../firebase/db';
import { subscribeToActiveEvent } from '../firebase/events';
import { useAuth } from '../hooks/useAuth';
import { signInWithGoogle } from '../firebase/auth';
import type { Event, FormField, Registration } from '../types';

export const RegisterPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  
  const [existingRegistration, setExistingRegistration] = useState<Registration | null>(null);
  const [checkingRegistration, setCheckingRegistration] = useState(false);

  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  // Load the active event
  useEffect(() => {
    const unsubscribe = subscribeToActiveEvent((data) => {
      setActiveEvent(data);
      setLoadingEvent(false);
    });
    return () => unsubscribe();
  }, []);

  // Pre-fill email if user is logged in
  useEffect(() => {
    if (user?.email && !responses['email']) {
      setResponses(prev => ({ ...prev, email: user.email! }));
    }
  }, [user]);

  // Check if user already registered for this event
  useEffect(() => {
    const checkRegistration = async () => {
      if (user && activeEvent) {
        setCheckingRegistration(true);
        try {
          const reg = await getRegistrationByUid(activeEvent.id, user.uid);
          setExistingRegistration(reg);
        } catch (err) {
          console.error("Failed to check existing registration", err);
        } finally {
          setCheckingRegistration(false);
        }
      } else {
        setExistingRegistration(null);
      }
    };
    
    checkRegistration();
  }, [user, activeEvent]);

  const handleChange = (id: string, value: string) => {
    setResponses(prev => ({ ...prev, [id]: value }));
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Sign in failed", err);
      setError("Failed to sign in. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent) return;
    if (!user) {
      setError("You must be signed in to register.");
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    try {
      // Check domain restriction if set
      if (activeEvent.allowedEmailDomain && activeEvent.allowedEmailDomain !== 'all') {
        const requiredDomain = activeEvent.allowedEmailDomain.toLowerCase().trim();
        const userEmail = (user.email || '').toLowerCase().trim();
        
        // Find email in form responses or fallback to signed-in user email
        const emailResponseField = activeEvent.formFields.find(f => f.type === 'email' || f.label.toLowerCase().includes('email'));
        const formEmail = emailResponseField ? responses[emailResponseField.id] : undefined;
        const emailToCheck = (formEmail || userEmail).toLowerCase().trim();

        if (!emailToCheck.endsWith(`@${requiredDomain}`)) {
          throw new Error(`Registration for "${activeEvent.name}" is restricted to college students (@${requiredDomain}). Please use your college email address.`);
        }
      }

      for (const field of activeEvent.formFields) {
        if (field.required && !responses[field.id]) {
          throw new Error(`${field.label} is required`);
        }
      }
      
      const { token } = await registerAttendee(activeEvent.id, responses, user.uid);
      navigate('/success', { state: { token, eventId: activeEvent.id, email: responses['email'] || user.email } });
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingEvent || authLoading || checkingRegistration) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#020817] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!activeEvent) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#020817] flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center py-12 border border-gray-200 dark:border-gray-800 shadow-sm">
          <CalendarDays className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">No Active Event</h2>
          <p className="text-gray-500 dark:text-gray-400">There are currently no events open for registration.</p>
        </Card>
      </div>
    );
  }

  if (!activeEvent.isRegistrationOpen) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#020817] flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center py-12 border border-gray-200 dark:border-gray-800 shadow-sm">
          <CalendarDays className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">Registration Closed</h2>
          <p className="text-gray-500 dark:text-gray-400">Registration for {activeEvent.name} is currently closed.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#020817] py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            {activeEvent.name}
          </h1>
          {activeEvent.allowedEmailDomain && activeEvent.allowedEmailDomain !== 'all' ? (
            <div className="pt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                🎓 College Students Only (@{activeEvent.allowedEmailDomain})
              </span>
            </div>
          ) : (
            <div className="pt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                🌐 Open to All Participants
              </span>
            </div>
          )}
          {activeEvent.description && (
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300 max-w-2xl mx-auto mt-4 mb-6 whitespace-pre-wrap">
              {activeEvent.description}
            </p>
          )}
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            {existingRegistration 
              ? "You're already on the list! See you there."
              : !user 
                ? "Sign in to secure your spot for this incredible experience."
                : "Complete the form below to secure your spot."
            }
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium text-center">
            {error}
          </div>
        )}

        {!user ? (
          <Card className="border border-gray-200 dark:border-gray-800 shadow-xl shadow-brand-500/5 dark:shadow-brand-900/10 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl">
            <CardContent className="p-8 sm:p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mb-6 text-brand-600 dark:text-brand-400">
                <LogIn className="w-8 h-8 ml-1" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-2">Sign In to Register</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
                We require attendees to sign in with Google to prevent spam and allow you to easily access your ticket later.
              </p>
              <Button 
                onClick={handleSignIn}
                size="lg"
                className="w-full sm:w-auto h-14 px-8 text-base font-semibold shadow-lg shadow-brand-500/25 flex items-center justify-center gap-3 bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>
            </CardContent>
          </Card>
        ) : existingRegistration ? (
          <Card className="border border-brand-200 dark:border-brand-900/50 shadow-xl shadow-brand-500/10 bg-brand-50/50 dark:bg-brand-950/20 backdrop-blur-xl">
            <CardContent className="p-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center mb-6 text-brand-600 dark:text-brand-400">
                <Ticket className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">You're Registered!</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
                You have already registered for {activeEvent.name}. You can view your ticket and QR code anytime.
              </p>
              <Link to="/success" state={{ token: existingRegistration.token, eventId: activeEvent.id, email: user.email }}>
                <Button size="lg" className="px-8 h-12 shadow-md hover:shadow-lg transition-all">
                  View My Ticket
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-gray-200 dark:border-gray-800 shadow-2xl shadow-brand-500/10 dark:shadow-brand-900/10 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl">
            <CardContent className="p-6 sm:p-10">


              <form onSubmit={handleSubmit} className="space-y-6">
                {activeEvent.formFields.map((field: FormField) => (
                  <div key={field.id} className="space-y-2">
                    <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {field.label} {field.required && <span className="text-brand-500">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        id={field.id}
                        required={field.required}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        className="flex h-12 w-full rounded-xl border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-gray-700 dark:text-gray-50"
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
                        rows={4}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        className="w-full p-3 text-base rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-gray-50 resize-y"
                        placeholder={`Enter ${field.label.toLowerCase()} (e.g. 1 per line, up to 40 names)`}
                      />
                    ) : (
                      <Input
                        id={field.id}
                        type={field.type}
                        required={field.required}
                        value={responses[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        className="h-12 text-base rounded-xl bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                        placeholder={`Enter your ${field.label.toLowerCase()}`}
                      />
                    )}
                  </div>
                ))}
                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full h-14 text-lg font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02]"
                    isLoading={isSubmitting}
                  >
                    Complete Registration
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
        <p className="text-center text-sm text-gray-400">
          By registering, you agree to our community guidelines.
        </p>
      </div>
    </div>
  );
};
