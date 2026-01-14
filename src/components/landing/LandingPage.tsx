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
import { Music, Film, BookOpen, Bot, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type AuthMode = 'login' | 'signup';

export function LandingPage() {
  const router = useRouter();
  const { login, register, isLoading: authLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate terms agreement for signup
    if (mode === 'signup' && !agreedToTerms) {
      setError('Please agree to the Terms & Conditions');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = mode === 'login'
        ? await login(email, password)
        : await register(email, password);

      if (result.success) {
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
      icon: Bot,
      title: 'MetaDJai',
      description: 'Your AI companion for exploring MetaDJ Nexus',
    },
  ];

  return (
    <div className="min-h-[100dvh] h-[100dvh] flex flex-col text-white overflow-hidden">
      {/* Hero Section */}
      <div className="relative overflow-hidden flex-1 min-h-0">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 container mx-auto px-6 py-4 lg:py-6 h-full flex flex-col">
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
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-center flex-1 min-h-0">
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
              <div className="grid grid-cols-2 gap-3 pt-3">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="group rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all duration-300 p-3 lg:p-4"
                  >
                    <feature.icon className="w-8 h-8 text-purple-400 mb-3 group-hover:text-cyan-400 transition-colors" />
                    <h3 className="font-heading font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-white/60">{feature.description}</p>
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
                        placeholder={mode === 'login' ? 'you@example.com or admin' : 'you@example.com'}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        required
                        disabled={isSubmitting || authLoading}
                      />
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-2">
                        Password
                      </label>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                      className="w-full py-3 brand-gradient text-white font-heading font-semibold rounded-xl transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          {mode === 'login' ? 'Enter Nexus' : 'Create Account'}
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - matching app footer */}
      <footer className="relative mt-auto w-full shrink-0 backdrop-blur-3xl border-t border-white/5">
        <div className="absolute inset-0 bg-(--bg-surface-base)/90 pointer-events-none" />
        <div className="relative z-10 container mx-auto px-6 py-3">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <p className="hidden md:block text-[11px] text-muted-accessible">
              MetaDJ Nexus. Original works & AI-driven content.
            </p>
            <div className="flex items-center gap-x-1 text-[11px] font-bold text-muted-accessible">
              <Link
                href="/terms"
                className="min-h-[44px] min-w-[44px] px-3 inline-flex items-center justify-center hover:text-white transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/guide"
                className="min-h-[44px] min-w-[44px] px-3 inline-flex items-center justify-center hover:text-white transition-colors"
              >
                Guide
              </Link>
              <div className="flex items-center gap-2 border-l border-white/10 pl-4 ml-1">
                <span className="text-white/70 font-black">MetaDJ</span>
                <span className="text-white/70 font-black">Zuberant</span>
              </div>
            </div>
            <p className="md:hidden text-[10px] uppercase tracking-widest text-muted-accessible text-center">
              Original works & AI-driven content • Zuberant
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
