import Link from 'next/link';
import { SearchX, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 text-white">
      <div className="max-w-md w-full text-center border border-(--border-subtle) rounded-3xl bg-card/40 backdrop-blur-xl px-8 py-10 shadow-[0_25px_60px_rgba(41,12,90,0.55)]">
        <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl gradient-2-tint border border-(--border-subtle) shadow-lg shadow-purple-900/20">
          <SearchX className="h-10 w-10 text-white" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-3xl font-heading font-bold text-gradient-hero mb-3 uppercase tracking-wider">
          Track Not Found
        </h1>
        
        <p className="text-white/80 font-sans mb-8 leading-relaxed">
          The signal you&apos;re looking for isn&apos;t in my catalog. Head back to the Hub to explore the frequency.
        </p>

        <Link
          href="/"
          className="w-full px-6 py-4 rounded-xl gradient-4 text-white font-heading font-bold tracking-wide hover:scale-[1.02] hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          <Home className="w-4 h-4" />
          Return to Hub
        </Link>
      </div>
    </div>
  );
}
