import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CalendarDays, Ticket, AlertTriangle, LogOut, ArrowRight, Shield } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CustomSelect } from '../components/ui/CustomSelect';
import { SponsorBar } from '../components/ui/SponsorBar';
import { registerAttendee, getRegistrationByUid } from '../firebase/db';
import { subscribeToActiveEvent } from '../firebase/events';
import { useAuth } from '../hooks/useAuth';
import { signInWithGoogle, logoutUser } from '../firebase/auth';
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

  useEffect(() => {
    const unsubscribe = subscribeToActiveEvent((data) => {
      setActiveEvent(data);
      setLoadingEvent(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user?.email && !responses['email']) {
      setResponses(prev => ({ ...prev, email: user.email! }));
    }
  }, [user]);

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

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setResponses({});
    } catch (err) {
      console.error("Sign out failed", err);
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
      // Inject Google email into any email-type fields (since they're locked/disabled)
      const finalResponses = { ...responses };
      for (const field of activeEvent.formFields) {
        if (field.type === 'email' && user.email) {
          finalResponses[field.id] = user.email;
        }
      }

      if (activeEvent.allowedEmailDomain && activeEvent.allowedEmailDomain !== 'all') {
        const requiredDomain = activeEvent.allowedEmailDomain.toLowerCase().trim();
        if (!user.email?.toLowerCase().trim().endsWith(`@${requiredDomain}`)) {
          throw new Error(`This event requires a @${requiredDomain} account.`);
        }
      }

      for (const field of activeEvent.formFields) {
        if (field.required && !finalResponses[field.id]) {
          throw new Error(`${field.label} is required`);
        }
      }
      
      const { token } = await registerAttendee(activeEvent.id, finalResponses, user.uid);
      navigate('/success', { state: { token, eventId: activeEvent.id, email: user.email } });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loadingEvent || authLoading || checkingRegistration) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-10 w-10 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin"></div>
          </div>
          <p className="text-sm text-gray-500 animate-fade-in">Loading event...</p>
        </div>
      </div>
    );
  }

  // No active event
  if (!activeEvent) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
        <div className="text-center max-w-md animate-fade-in-up">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
            <CalendarDays className="w-8 h-8 text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">No Active Event</h2>
          <p className="text-gray-400 text-base leading-relaxed">
            Check back soon for upcoming events.
          </p>
        </div>
      </div>
    );
  }

  // Registration closed
  if (!activeEvent.isRegistrationOpen) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
        <div className="text-center max-w-md animate-fade-in-up">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
            <CalendarDays className="w-8 h-8 text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Registration Closed</h2>
          <p className="text-gray-400 text-base leading-relaxed">
            Registration for <span className="text-white font-medium">{activeEvent.name}</span> has closed.
          </p>
        </div>
      </div>
    );
  }

  // Determine if event is college-only
  const isCollegeOnly = activeEvent.allowedEmailDomain && activeEvent.allowedEmailDomain !== 'all';
  const isBlockedUser = isCollegeOnly && user && !user.email?.toLowerCase().trim().endsWith(`@${activeEvent.allowedEmailDomain!.toLowerCase().trim()}`);

  return (
    <div className="min-h-screen bg-[#030712]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-brand-600/[0.04] blur-[120px]"></div>
          <div className="absolute -top-[30%] -right-[15%] w-[50%] h-[50%] rounded-full bg-indigo-500/[0.03] blur-[100px]"></div>
        </div>

        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-8 sm:pb-12">
          {/* Event Header */}
          <div className="text-center mb-8 sm:mb-12 animate-fade-in-up">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
              {activeEvent.name}
            </h1>
            
            {/* Tags row - only show for college-restricted events */}
            {isCollegeOnly && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4 sm:mt-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-300 border border-brand-500/20">
                  <Shield className="w-3 h-3" />
                  College Students Only (@{activeEvent.allowedEmailDomain})
                </span>
              </div>
            )}
            
            {activeEvent.description && (
              <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto mt-5 leading-relaxed whitespace-pre-wrap animate-fade-in animate-delay-100">
                {activeEvent.description}
              </p>
            )}

            {/* Sponsor logos */}
            <SponsorBar eventName={activeEvent.name} />

            {!user && (
              <p className="text-base text-gray-500 max-w-md mx-auto mt-4 animate-fade-in animate-delay-200">
                Sign in to register.
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center animate-fade-in">
              {error}
            </div>
          )}

          {/* ============================================ */}
          {/* STATE: Not signed in                         */}
          {/* ============================================ */}
          {!user ? (
            <div className="animate-fade-in-up animate-delay-200">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                <div className="p-8 sm:p-12 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-6">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Sign in to continue</h3>
                  <p className="text-gray-400 mb-8 max-w-sm text-sm leading-relaxed">
                    Sign in with Google to verify your identity.
                  </p>
                  <button 
                    onClick={handleSignIn}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 h-12 px-8 rounded-xl text-sm font-semibold bg-white text-gray-900 hover:bg-gray-100 transition-all active:scale-[0.98] shadow-lg shadow-white/10"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </div>
              </div>
            </div>

          /* ============================================ */
          /* STATE: Already registered                    */
          /* ============================================ */
          ) : existingRegistration ? (
            <div className="animate-fade-in-up animate-delay-200">
              <div className="rounded-2xl border border-brand-500/20 bg-brand-500/[0.04] backdrop-blur-xl overflow-hidden">
                <div className="p-8 sm:p-12 text-center flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-6">
                    <Ticket className="w-7 h-7 text-brand-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">You're Registered</h3>
                  <p className="text-gray-400 mb-8 max-w-sm text-sm leading-relaxed">
                    Your ticket for {activeEvent.name} is ready.
                  </p>
                  <Link to="/success" state={{ token: existingRegistration.token, eventId: activeEvent.id, email: user.email }}>
                    <Button size="lg" className="px-8 h-12 rounded-xl shadow-lg shadow-brand-500/20 transition-all hover:shadow-brand-500/30 active:scale-[0.98]">
                      View My Ticket
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

          /* ============================================ */
          /* STATE: Blocked (non-college user)            */
          /* ============================================ */
          ) : isBlockedUser ? (
            <div className="animate-fade-in-up animate-delay-200">
              <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] backdrop-blur-xl overflow-hidden">
                <div className="p-8 sm:p-12 text-center flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                    <AlertTriangle className="w-7 h-7 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">College Account Required</h3>
                  <p className="text-gray-400 mb-6 max-w-sm text-sm leading-relaxed">
                    You're signed in as <span className="text-white font-medium">{user.email}</span>. This event requires a <span className="text-white font-medium">@{activeEvent.allowedEmailDomain}</span> account.
                  </p>
                  <Button 
                    onClick={handleSignOut}
                    size="lg" 
                    variant="danger"
                    className="px-8 h-12 rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-[0.98]"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>

          /* ============================================ */
          /* STATE: Registration form                     */
          /* ============================================ */
          ) : (
            <div className="animate-fade-in-up animate-delay-200">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                {/* Form header */}
                <div className="px-6 sm:px-10 pt-8 sm:pt-10 pb-0">
                  <h3 className="text-lg font-bold text-white mb-1">Registration Form</h3>
                  <p className="text-sm text-gray-500">Fill in your details below.</p>
                </div>

                {/* Form body */}
                <div className="p-6 sm:p-10 pt-6">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {activeEvent.formFields.map((field: FormField, index: number) => {
                      const isEmailField = field.type === 'email';
                      const isLocked = isEmailField && !!user;
                      const fieldValue = isLocked ? (user.email || '') : (responses[field.id] || '');
                      
                      return (
                      <div key={field.id} className={`space-y-2 animate-fade-in`} style={{ animationDelay: `${index * 60}ms` }}>
                        <label htmlFor={field.id} className="block text-sm font-medium text-gray-300">
                          {field.label}
                          {field.required && <span className="text-brand-400 ml-1">*</span>}
                        </label>
                        {field.type === 'select' ? (
                          <CustomSelect
                            id={field.id}
                            value={responses[field.id] || ''}
                            onChange={(val) => handleChange(field.id, val)}
                            options={field.options || []}
                            placeholder="Select an option"
                            required={field.required}
                          />
                        ) : field.type === 'textarea' ? (
                          <textarea
                            id={field.id}
                            required={field.required}
                            rows={4}
                            value={responses[field.id] || ''}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            className="w-full p-3 text-sm rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 placeholder:text-gray-600 resize-y"
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
                              disabled={isLocked}
                              className={`h-11 text-sm rounded-xl bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-600 focus:ring-brand-500/50 focus:border-brand-500/50 ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                              placeholder={`Enter your ${field.label.toLowerCase()}`}
                            />
                            {isLocked && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">From Google</span>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}
                    
                    <div className="pt-4">
                      <Button
                        type="submit"
                        className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg shadow-brand-500/20 transition-all hover:shadow-brand-500/30 active:scale-[0.98]"
                        isLoading={isSubmitting}
                      >
                        Complete Registration
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              <p className="text-center text-xs text-gray-600 mt-6">
                By registering, you agree to our community guidelines.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
