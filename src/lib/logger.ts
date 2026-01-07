/**
 * MetaDJ Nexus - Structured Logger
 *
 * Provides consistent logging across the application with environment-aware behavior.
 * In production, console logs are suppressed unless critical errors occur.
 */

type LogContext = Record<string, unknown>;
type LogLevel = 'info' | 'warn' | 'error';
interface LogEntry {
  level: LogLevel;
  message: string;
  context: LogContext;
  timestamp: string;
}

/**
 * Critical info messages that should be logged even in production.
 * Used for important operational events that need visibility.
 */
const PRODUCTION_INFO_PREFIXES = [
  '[Rate Limiting]',
  '[Circuit Breaker]',
  '[AI Spending]',
  '[Startup]',
  '[Health]',
];

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isTest = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true');
  private logEndpoint = '/api/log';

  /**
   * Debug-level logging (verbose)
   * Only shown in development mode
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return;

    if (context) {
      console.debug(`[DEBUG] ${message}`, context);
    } else {
      console.debug(`[DEBUG] ${message}`);
    }
  }

  /**
   * Info-level logging (general information)
   * In development: all info messages shown
   * In production: only critical operational messages (matching PRODUCTION_INFO_PREFIXES) are logged
   */
  info(message: string, context?: LogContext): void {
    // Check if this is a critical operational message that should be logged in production
    const isCriticalInfo = PRODUCTION_INFO_PREFIXES.some(prefix => message.startsWith(prefix));

    if (!this.isDevelopment && !isCriticalInfo) return;

    if (context) {
      console.info(`[INFO] ${message}`, context);
    } else {
      console.info(`[INFO] ${message}`);
    }

    // Report critical info messages in production for observability
    if (isCriticalInfo && !this.isDevelopment && !this.isTest) {
      this.report('info', message, context);
    }
  }

  /**
   * Warning-level logging (potential issues)
   * Shown in all environments
   */
  warn(message: string, context?: LogContext): void {
    if (context) {
      console.warn(`[WARN] ${message}`, context);
    } else {
      console.warn(`[WARN] ${message}`);
    }

    this.report('warn', message, context);
  }

  /**
   * Error-level logging (critical issues)
   * Shown in all environments
   * In production, could send to error tracking service (e.g., Sentry)
   */
  error(message: string, context?: LogContext): void {
    if (context) {
      console.error(`[ERROR] ${message}`, context);
    } else {
      console.error(`[ERROR] ${message}`);
    }

    this.report('error', message, context);
  }

  /**
   * Audio-specific error logging
   * Specialized for audio playback issues
   */
  audioError(message: string, audioContext: {
    code?: number;
    message?: string;
    url?: string;
    networkState?: number;
    readyState?: number;
    trackId?: string;
    trackTitle?: string;
  }): void {
    this.error(`Audio Error: ${message}`, audioContext as LogContext);
  }

  /**
   * Dispatch structured log events and optionally forward to a webhook in production.
   * Keeps a rolling buffer available on window for quick inspection.
   * Authentication handled server-side in /api/log endpoint.
   */
  private report(level: LogLevel, message: string, context: LogContext = {}): void {
    if (typeof window === 'undefined') {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
    };

    try {
      const globalWindow = window as typeof window & {
        __metadjLogBuffer__?: LogEntry[];
      };

      const buffer = globalWindow.__metadjLogBuffer__ ?? [];
      buffer.push(entry);
      while (buffer.length > 20) {
        buffer.shift();
      }
      globalWindow.__metadjLogBuffer__ = buffer;

      window.dispatchEvent(new CustomEvent('metadj:log', { detail: entry }));
    } catch {
      // Ignore buffer/dispatch failures; console logging already handled above.
    }

    if (this.isDevelopment || this.isTest) {
      return;
    }

    // Skip server-side logging if not in browser context
    if (typeof window === 'undefined') {
      return;
    }

    const clientKey = process.env.NEXT_PUBLIC_LOGGING_CLIENT_KEY;
    if (!clientKey) {
      return;
    }

    const safePayload = (() => {
      try {
        return JSON.stringify(entry);
      } catch {
        return null;
      }
    })();

    if (!safePayload) {
      return;
    }

    // Send to server-side logging endpoint
    // Authentication is handled server-side with LOGGING_SHARED_SECRET
    try {
      void fetch(this.logEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Logging-Client-Key': clientKey,
        },
        body: safePayload,
        keepalive: true,
      });
    } catch {
      // Ignore network errors to avoid cascading failures.
    }
  }
}

// Export singleton instance
export const logger = new Logger();
