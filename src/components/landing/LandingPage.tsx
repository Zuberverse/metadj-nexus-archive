'use client';

/**
 * Landing Page Component
 *
 * Public homepage with login/signup and platform overview.
 * Mobile-first design with proper touch scrolling.
 */

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Music, Film, BookOpen, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';

type AuthMode = 'login' | 'signup';

export function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, checkAvailability, isLoading: authLoading } = useAuth();
  const { resetModals } = useModal();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const verifyStatus = searchParams.get('verify');
  const verifyMessage =
    verifyStatus === 'success'
      ? 'Email verified. You can sign in now.'
      : verifyStatus === 'invalid'
        ? 'Verification link is invalid or expired.'
        : verifyStatus === 'missing'
          ? 'Verification link is missing.'
          : verifyStatus === 'error'
            ? 'Verification failed. Please try again.'
            : null;
  const verifyVariant =
    verifyStatus === 'success'
      ? 'success'
      : verifyStatus === 'missing'
        ? 'warning'
        : verifyStatus
          ? 'error'
          : null;

  const validateUsername = async (value: string) => {
    if (value.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(value.toLowerCase())) {
      setUsernameError('Only lowercase letters, numbers, and underscores');
      return;
    }
    if (/^[0-9]/.test(value)) {
      setUsernameError('Cannot start with a number');
      return;
    }
    
    setUsernameChecking(true);
    setUsernameError('');
    
    const result = await checkAvailability('username', value);
    setUsernameChecking(false);
    
    if (!result.available) {
      setUsernameError(result.error || 'Username is taken');
    }
  };

  const handleUsernameChange = (value: string): void => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(normalized);
    setUsernameError('');
    
    if (normalized.length >= 3) {
      setTimeout(() => validateUsername(normalized), 500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && !agreedToTerms) {
      setError('Please agree to the Terms & Conditions');
      return;
    }

    if (mode === 'signup' && usernameError) {
      setError('Please fix the username error');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = mode === 'login'
        ? await login(email, password)
        : await register(email, username, password, agreedToTerms);

      if (result.success) {
        resetModals();
        router.push('/app');
      } else {
        setError(result.message || 'An error occurred');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: Music,
      title: 'Music',
      description: 'Original music collections built as living releases',
    },
    {
      icon: Film,
      title: 'Cinema',
      description: 'Immersive visualizers and video scenes synced to the music',
    },
    {
      icon: BookOpen,
      title: 'Wisdom',
      description: 'Guides, reflections, and frameworks on AI-human collaboration',
    },
    {
      icon: null,
      customIcon: '/images/avatars/metadj-pfp.png',
      title: 'MetaDJai',
      description: 'Your AI companion for exploring MetaDJ Nexus',
    },
  ];

  return (
    <div className="min-h-screen w-full text-white bg-[var(--bg-surface-base)] overflow-x-hidden flex flex-col">
      {/* Full-page background effects - consistent with Hub/Wisdom/Journal */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 gradient-1" />
        {/* Central aurora for vibrancy */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[200%] h-[150%] brand-gradient opacity-30 blur-[120px] mix-blend-screen" />
        {/* Distributed color blooms - richer saturation */}
        <div className="absolute top-[5%] left-[8%] w-[600px] h-[600px] bg-purple-500/22 rounded-full blur-[100px]" />
        <div className="absolute top-[6%] right-[6%] w-[550px] h-[550px] bg-blue-500/20 rounded-full blur-[90px]" />
        <div className="absolute top-[28%] left-[22%] w-[500px] h-[500px] bg-cyan-500/16 rounded-full blur-[100px]" />
        <div className="absolute top-[32%] right-[12%] w-[450px] h-[450px] bg-violet-500/18 rounded-full blur-[110px]" />
        <div className="absolute top-[52%] left-[12%] w-[400px] h-[400px] bg-indigo-500/14 rounded-full blur-[90px]" />
        <div className="absolute top-[60%] right-[20%] w-[350px] h-[350px] bg-purple-600/12 rounded-full blur-[100px]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1">
        <div className="container mx-auto px-4 sm:px-6 py-4 lg:py-6">
          {/* Header */}
          <header className="flex items-center justify-center lg:justify-between mb-6 lg:mb-8">
            <h1 className="flex items-center gap-2 sm:gap-3 text-pop">
              <span className="sr-only">MetaDJ</span>
              <span
                aria-hidden="true"
                className="relative flex items-center h-10 min-h-[40px] sm:h-14 md:h-16 lg:h-20 w-[100px] min-w-[100px] sm:w-[140px] md:w-[160px] lg:w-[200px]"
              >
                <Image
                  src="/images/metadj-logo-wordmark.png"
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100px, (max-width: 768px) 140px, (max-width: 1024px) 160px, 200px"
                  priority
                  className="object-contain object-left drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                />
              </span>
              <span className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gradient-primary">
                Nexus
              </span>
            </h1>
          </header>

          {/* Main Content - Stack on mobile, side-by-side on desktop */}
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-10 lg:items-center lg:min-h-[calc(100dvh-180px)]">
            {/* Left: Hero Text - Hidden on small mobile to prioritize form */}
            <div className="hidden sm:block space-y-4 text-center lg:text-left order-2 lg:order-1">
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-pop">
                <span className="text-gradient-hero">
                  The Creative Hub
                </span>
                <br />
                <span className="text-white/90">for MetaDJ</span>
              </h2>
              <p className="text-lg lg:text-xl text-white/70 max-w-lg mx-auto lg:mx-0">
                Experience original electronic music, immersive visuals, and AI-driven exploration.
                A living showcase of human vision amplified by AI.
              </p>

              {/* Feature Grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-3">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="group rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all duration-300 p-2.5 sm:p-3 lg:p-4"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {feature.icon ? (
                        <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                      ) : feature.customIcon ? (
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden border border-purple-400/50 group-hover:border-cyan-400/50 transition-colors shadow-[0_0_10px_rgba(168,85,247,0.3)] group-hover:shadow-[0_0_10px_rgba(34,211,238,0.3)] flex-shrink-0">
                          <Image
                            src={feature.customIcon}
                            alt={feature.title}
                            width={24}
                            height={24}
                            className="object-cover"
                          />
                        </div>
                      ) : null}
                      <h3 className="font-heading font-semibold text-white text-sm sm:text-base whitespace-nowrap">{feature.title}</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-white/60 leading-snug">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile-only compact header */}
            <div className="sm:hidden text-center mb-2 order-1">
              <h2 className="font-heading text-2xl font-bold leading-tight text-pop mb-2">
                <span className="text-gradient-hero">The Creative Hub</span>
                {' '}
                <span className="text-white/90">for MetaDJ</span>
              </h2>
              <p className="text-sm text-white/60">
                Original music, immersive visuals & AI exploration
              </p>
            </div>

            {/* Right: Auth Form */}
            <div className="flex justify-center lg:justify-end order-1 lg:order-2">
              <div className="w-full max-w-md">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-6 lg:p-8 shadow-2xl">
                  <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-7">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className={`flex-1 py-2.5 sm:py-3 rounded-xl font-heading font-semibold transition-all text-sm sm:text-base ${
                        mode === 'login'
                          ? 'brand-gradient text-white'
                          : 'bg-white/5 text-white/60 hover:text-white'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className={`flex-1 py-2.5 sm:py-3 rounded-xl font-heading font-semibold transition-all text-sm sm:text-base ${
                        mode === 'signup'
                          ? 'brand-gradient text-white'
                          : 'bg-white/5 text-white/60 hover:text-white'
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>

                  {verifyMessage && (
                    <div
                      className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
                        verifyVariant === 'success'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                          : verifyVariant === 'warning'
                            ? 'border-amber-400/40 bg-amber-500/10 text-amber-100'
                            : 'border-red-500/40 bg-red-500/10 text-red-300'
                      }`}
                    >
                      {verifyMessage}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
                        {mode === 'login' ? 'Email or Username' : 'Email'}
                      </label>
                      <input
                        id="email"
                        type={mode === 'login' ? 'text' : 'email'}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-base placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        required
                        autoComplete={mode === 'login' ? 'username' : 'email'}
                        disabled={isSubmitting || authLoading}
                      />
                    </div>

                    {mode === 'signup' && (
                      <div>
                        <label htmlFor="username" className="block text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
                          Username
                        </label>
                        <div className="relative">
                          <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => handleUsernameChange(e.target.value)}
                            placeholder="your_unique_name"
                            className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white text-base placeholder-white/30 focus:outline-none focus:ring-1 transition-all ${
                              usernameError 
                                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' 
                                : username.length >= 3 && !usernameChecking
                                  ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500'
                                  : 'border-white/10 focus:border-purple-500 focus:ring-purple-500'
                            }`}
                            required
                            minLength={3}
                            maxLength={20}
                            autoComplete="username"
                            disabled={isSubmitting || authLoading}
                          />
                          {usernameChecking && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                        {usernameError ? (
                          <p className="mt-1.5 text-xs text-red-400">{usernameError}</p>
                        ) : (
                          <p className="mt-1.5 text-xs text-white/50">3-20 characters, letters, numbers, underscores</p>
                        )}
                      </div>
                    )}

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
                        Password
                      </label>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-base placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        required
                        minLength={mode === 'signup' ? 8 : undefined}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        disabled={isSubmitting || authLoading}
                      />
                      {mode === 'signup' && (
                        <p className="mt-1.5 text-xs text-white/50">Minimum 8 characters</p>
                      )}
                      {mode === 'login' && (
                        <div className="mt-2 text-right">
                          <Link
                            href="/forgot-password"
                            className="text-xs text-purple-300 hover:text-purple-200 underline underline-offset-2"
                          >
                            Forgot password?
                          </Link>
                        </div>
                      )}
                    </div>

                    {mode === 'signup' && (
                      <>
                        <div className="flex items-start gap-3">
                          <input
                            id="terms"
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="mt-1 h-5 w-5 rounded border border-white/30 bg-transparent text-purple-500 accent-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                            required
                            disabled={isSubmitting || authLoading}
                          />
                          <label htmlFor="terms" className="text-sm text-white/70 leading-relaxed">
                            I agree to the{' '}
                            <Link
                              href="/terms"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:text-purple-300 underline underline-offset-2"
                            >
                              Terms & Conditions
                            </Link>
                          </label>
                        </div>
                        <p className="text-xs text-white/50 text-center">
                          No email verification required for now. Coming soon.
                        </p>
                      </>
                    )}

                    {error && (
                      <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={
                        isSubmitting || 
                        authLoading || 
                        !email.trim() || 
                        !password.trim() ||
                        (mode === 'signup' && (!username.trim() || !agreedToTerms || !!usernameError))
                      }
                      className="w-full min-h-[48px] py-3 brand-gradient text-white font-heading font-semibold rounded-xl transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span className="inline-flex items-center justify-center gap-2 min-w-[140px]">
                        {isSubmitting || authLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                            <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                          </>
                        ) : (
                          <>
                            {mode === 'login' ? 'Enter Nexus' : 'Create Account'}
                            <ArrowRight className="w-5 h-5 shrink-0" />
                          </>
                        )}
                      </span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer - stays at bottom */}
      <footer className="relative z-20 backdrop-blur-3xl shrink-0">
        <div className="absolute inset-0 bg-[var(--bg-surface-base)]/90 pointer-events-none" />
        
        <div className="absolute -bottom-[20%] -left-[20%] w-[80%] h-[60%] bg-purple-600/5 blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-[20%] -right-[20%] w-[80%] h-[60%] bg-blue-600/5 blur-[80px] pointer-events-none" />
        
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="relative z-10 container mx-auto px-4 py-2 sm:px-6">
          <div className="flex items-center justify-center gap-x-1 font-heading font-bold">
            <Link
              href="/terms"
              className="min-h-[44px] min-w-[44px] px-3 inline-flex items-center justify-center text-sm lg:text-base text-white/90 hover:text-white transition-colors cursor-pointer touch-manipulation"
            >
              Terms
            </Link>
            <div className="flex items-center gap-2 border-l border-white/10 pl-3 ml-1 text-[10px] lg:text-[11px]">
              <span className="text-white/50 font-black">MetaDJ</span>
              <span className="text-white/30 text-[8px]" aria-hidden="true">·</span>
              <span className="text-white/50 font-black">Zuberant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
