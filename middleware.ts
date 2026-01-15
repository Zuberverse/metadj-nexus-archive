// Next.js middleware entrypoint
// Default export (middleware function) is re-exported from src/proxy.ts
// Config must be defined here directly for Next.js static analysis
export { default } from './src/proxy';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
