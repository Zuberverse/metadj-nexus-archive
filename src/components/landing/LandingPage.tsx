'use client';

/**
 * Landing Page Component
 *
 * Public homepage with login/signup and platform overview.
 */

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Music, Film, BookOpen, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';

/**
 * ARCHIVED ICON NOTE:
 * Previously used lucide-react Bot icon for MetaDJai feature card.
 * Consider for future use: import { Bot } from 'lucide-react'
 * Now using custom MetaDJai pfp image for brand consistency.
 */

type AuthMode = 'login' | 'signup';

export function LandingPage() {
  const router = useRouter();
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

    // Validate terms agreement for signup
    if (mode === 'signup' && !agreedToTerms) {
      setError('Please agree to the Terms & Conditions');
      return;
    }

    // Validate username for signup
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
    <div className="min-h-[100dvh] flex flex-col text-white overflow-y-auto lg:overflow-hidden lg:h-[100dvh]">
      {/* Hero Section */}
      <div className="relative lg:overflow-hidden flex-1 lg:min-h-0">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 container mx-auto px-6 py-4 lg:py-6 lg:h-full flex flex-col">
          {/* Header */}
          <header className="flex items-center justify-between mb-4 lg:mb-6">
            <h1 className="flex items-center gap-2 sm:gap-3 text-pop">
              <span className="sr-only">MetaDJ</span>
              <span
                aria-hidden="true"
                className="relative flex items-center h-10 sm:h-12 md:h-14 lg:h-16 w-[100px] sm:w-[120px] md:w-[140px] lg:w-[160px]"
              >
                <Image
                  src="/images/metadj-logo-wordmark.png"
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100px, (max-width: 768px) 120px, (max-width: 1024px) 140px, 160px"
                  priority
                  className="object-contain object-left drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                />
              </span>
              <span className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gradient-primary">
                Nexus
              </span>
            </h1>
          </header>

          {/* Main Content */}
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-center lg:flex-1 lg:min-h-0">
            {/* Left: Hero Text */}
            <div className="space-y-4 text-center lg:text-left">
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

            {/* Right: Auth Form */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 lg:p-8 shadow-2xl">
                  <div className="flex gap-4 mb-6">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className={`flex-1 py-3 rounded-xl font-heading font-semibold transition-all ${
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
                      className={`flex-1 py-3 rounded-xl font-heading font-semibold transition-all ${
                        mode === 'signup'
                          ? 'brand-gradient text-white'
                          : 'bg-white/5 text-white/60 hover:text-white'
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-2">
                        {mode === 'login' ? 'Email or Username' : 'Email'}
                      </label>
                      <input
                        id="email"
                        type={mode === 'login' ? 'text' : 'email'}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={(e) => {
                          const len = e.target.value.length;
                          e.target.setSelectionRange(len, len);
                        }}
                        placeholder={mode === 'login' ? 'you@example.com or admin' : 'you@example.com'}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        required
                        disabled={isSubmitting || authLoading}
                      />
                    </div>

                    {mode === 'signup' && (
                      <div>
                        <label htmlFor="username" className="block text-sm font-medium text-white/70 mb-2">
                          Username
                        </label>
                        <div className="relative">
                          <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => handleUsernameChange(e.target.value)}
                            onFocus={(e) => {
                              const len = e.target.value.length;
                              e.target.setSelectionRange(len, len);
                            }}
                            placeholder="your_unique_name"
                            className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-1 transition-all ${
                              usernameError 
                                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' 
                                : username.length >= 3 && !usernameChecking
                                  ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500'
                                  : 'border-white/10 focus:border-purple-500 focus:ring-purple-500'
                            }`}
                            required
                            minLength={3}
                            maxLength={20}
                            disabled={isSubmitting || authLoading}
                          />
                          {usernameChecking && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                        {usernameError ? (
                          <p className="mt-2 text-xs text-red-400">{usernameError}</p>
                        ) : (
                          <p className="mt-2 text-xs text-white/50">3-20 characters, letters, numbers, underscores</p>
                        )}
                      </div>
                    )}

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-2">
                        Password
                      </label>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={(e) => {
                          const len = e.target.value.length;
                          e.target.setSelectionRange(len, len);
                        }}
                        placeholder="Enter your password"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        required
                        minLength={mode === 'signup' ? 8 : undefined}
                        disabled={isSubmitting || authLoading}
                      />
                      {mode === 'signup' && (
                        <p className="mt-2 text-xs text-white/50">Minimum 8 characters</p>
                      )}
                    </div>

                    {/* Terms Agreement - Signup only */}
                    {mode === 'signup' && (
                      <div className="flex items-start gap-3">
                        <input
                          id="terms"
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border border-white/30 bg-transparent text-purple-500 accent-purple-500 focus:ring-purple-500 focus:ring-offset-0"
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
                    )}

                    {error && (
                      <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || authLoading || (mode === 'signup' && !agreedToTerms)}
                      className="w-full h-12 py-3 brand-gradient text-white font-heading font-semibold rounded-xl transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {/* Footer - matching app footer */}
      <footer className="relative mt-auto w-full backdrop-blur-3xl">
        <div className="absolute inset-0 bg-(--bg-surface-base)/90 pointer-events-none" />
        
        {/* Gradient blobs matching Header */}
        <div className="absolute -bottom-[20%] -left-[20%] w-[80%] h-[60%] bg-purple-600/5 blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-[20%] -right-[20%] w-[80%] h-[60%] bg-blue-600/5 blur-[80px] pointer-events-none" />
        
        {/* Top gradient line matching Header's bottom line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="relative z-10 container mx-auto px-4 py-1.5 sm:px-6">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between sm:gap-4">
            <p className="hidden md:block text-[10px] lg:text-[11px] font-heading font-bold text-muted-accessible leading-relaxed hover:text-white/80 transition-colors duration-300 text-left flex-1 truncate">
              MetaDJ Nexus. Original works & AI-driven content. Reproduction prohibited.
            </p>
            <div className="flex items-center justify-center gap-x-1 gap-y-2 text-[10px] lg:text-[11px] font-heading font-bold text-muted-accessible sm:justify-end shrink-0">
              <Link
                href="/terms"
                className="min-h-[44px] min-w-[44px] px-3 inline-flex items-center justify-center text-muted-accessible hover:text-white transition-colors cursor-pointer touch-manipulation"
              >
                Terms
              </Link>
              <Link
                href="/guide"
                className="min-h-[44px] min-w-[44px] px-3 inline-flex items-center justify-center text-muted-accessible hover:text-white transition-colors cursor-pointer touch-manipulation"
              >
                Guide
              </Link>
              <div className="flex items-center gap-2 border-l border-white/10 pl-4 ml-1">
                <span className="text-white/70 font-black">MetaDJ</span>
                <span className="text-white/30 text-[8px]" aria-hidden="true">•</span>
                <span className="text-white/70 font-black">Zuberant</span>
              </div>
            </div>
            <p className="md:hidden mt-2 text-[10px] font-heading font-medium uppercase tracking-widest text-muted-accessible text-center">
              Original works & AI-driven content &bull; Zuberant
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
