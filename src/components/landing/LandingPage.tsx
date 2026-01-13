'use client';

/**
 * Landing Page Component
 *
 * Public homepage with login/signup and platform overview.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Music, Film, BookOpen, Bot, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type AuthMode = 'login' | 'signup';

export function LandingPage() {
  const router = useRouter();
  const { login, register, isLoading: authLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      description: 'Original electronic music collections crafted for the digital age',
    },
    {
      icon: Film,
      title: 'Cinema',
      description: 'Immersive visual experiences with AI-driven visualizers',
    },
    {
      icon: BookOpen,
      title: 'Wisdom',
      description: 'Guides, reflections, and insights on AI-human collaboration',
    },
    {
      icon: Bot,
      title: 'MetaDJai',
      description: 'Your AI companion for exploring the MetaDJ universe',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a0a2e] to-[#0a0a0a] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 container mx-auto px-6 py-12">
          {/* Header */}
          <header className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="font-cinzel text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                MetaDJ Nexus
              </span>
            </div>
          </header>

          {/* Main Content */}
          <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[70vh]">
            {/* Left: Hero Text */}
            <div className="space-y-8">
              <h1 className="font-cinzel text-5xl lg:text-6xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  The Creative Hub
                </span>
                <br />
                <span className="text-white/90">for MetaDJ</span>
              </h1>
              <p className="text-xl text-white/70 max-w-lg">
                Experience original electronic music, immersive visuals, and AI-powered discovery.
                A living showcase of AI-human creative collaboration.
              </p>

              {/* Feature Grid */}
              <div className="grid grid-cols-2 gap-4 pt-8">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all duration-300"
                  >
                    <feature.icon className="w-8 h-8 text-purple-400 mb-3 group-hover:text-cyan-400 transition-colors" />
                    <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-white/60">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Auth Form */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                  <div className="flex gap-4 mb-8">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                        mode === 'login'
                          ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                          : 'bg-white/5 text-white/60 hover:text-white'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                        mode === 'signup'
                          ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
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

                    {error && (
                      <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || authLoading}
                      className="w-full py-4 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

                  <p className="mt-6 text-center text-sm text-white/50">
                    {mode === 'login' ? (
                      <>
                        New to MetaDJ Nexus?{' '}
                        <button
                          type="button"
                          onClick={() => setMode('signup')}
                          className="text-purple-400 hover:text-purple-300"
                        >
                          Create an account
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => setMode('login')}
                          className="text-purple-400 hover:text-purple-300"
                        >
                          Sign in
                        </button>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-auto">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/50 text-sm">
              A Zuberant Production
            </p>
            <div className="flex gap-6 text-sm text-white/50">
              <a href="/terms" className="hover:text-white transition-colors">Terms</a>
              <a href="/guide" className="hover:text-white transition-colors">Guide</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
