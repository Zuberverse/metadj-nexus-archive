/**
 * MetaDJai Error Mapping Utility
 *
 * Maps technical error messages to user-friendly copy while preserving
 * technical details in logs for debugging.
 */

import { logger } from "@/lib/logger"

export interface ErrorMapping {
  pattern: RegExp | string;
  userMessage: string;
  preserveOriginal?: boolean;
}

const ERROR_MAPPINGS: ErrorMapping[] = [
  // Network errors
  {
    pattern: /failed to fetch|network error|fetch failed/i,
    userMessage: "Can't reach MetaDJai right now. Check your connection and try again—your message is still here.",
  },
  {
    pattern: /timeout|timed out/i,
    userMessage: "Request took too long. Hit send again to retry—your message wasn't lost.",
  },

  // Rate limiting
  {
    pattern: /rate limit|too many requests|429/i,
    userMessage: "Taking a quick break. Wait a moment, then try again.",
  },

  // Provider errors
  {
    pattern: /openai|gpt|api error/i,
    userMessage: "MetaDJai hit a provider issue. Try again in a few seconds—usually resolves quickly.",
  },
  {
    pattern: /anthropic|claude/i,
    userMessage: "MetaDJai hit a provider issue. Try again in a few seconds—usually resolves quickly.",
  },
  {
    pattern: /google|gemini/i,
    userMessage: "MetaDJai hit a provider issue. Try again in a few seconds—usually resolves quickly.",
  },
  {
    pattern: /grok|xai/i,
    userMessage: "MetaDJai hit a provider issue. Try again in a few seconds—usually resolves quickly.",
  },

  // Streaming errors
  {
    pattern: /stream|interrupted|connection/i,
    userMessage: "Connection interrupted. Your message wasn't lost—just hit send again to retry.",
  },

  // Session expiration (our own auth endpoints)
  // Matches explicit session expiry messages from our backend
  {
    pattern: /session\s*(has\s*)?expired|auth\s*token\s*(is\s*)?(invalid|expired)|not\s*authenticated/i,
    userMessage: "Session expired. Refresh the page to continue chatting.",
  },
  
  // Provider authentication errors (API key issues from AI providers)
  // These contain explicit provider references to avoid catching our own auth errors
  {
    pattern: /invalid\s*api\s*key|api\s*key\s*(is\s*)?(invalid|expired|missing)/i,
    userMessage: "MetaDJai hit a provider authentication issue. Please try again later.",
  },

  // HTTP status codes in provider errors (401/403 with "status" prefix)
  // These appear in errors like "status 401" or "status: 403" from AI providers
  // The "status" prefix distinguishes these from our simple "Unauthorized" responses
  {
    pattern: /status\s*[:=]?\s*(401|403)/i,
    userMessage: "MetaDJai hit a provider authentication issue. Please try again later.",
  },
  
  // Generic unauthorized/forbidden (our own auth responses)
  // These are simple responses from our auth endpoints, not provider errors
  // Matches "Unauthorized", "401 Unauthorized", "403 Forbidden" formats
  {
    pattern: /^(401\s+)?unauthorized$|^(403\s+)?forbidden$/i,
    userMessage: "Session expired. Refresh the page to continue chatting.",
  },

  // Server errors
  {
    pattern: /500|502|503|504|server error|internal error/i,
    userMessage: "Server hiccup. Give it another try—these usually clear up quickly.",
  },

  // Validation errors
  {
    pattern: /invalid|validation|bad request|400/i,
    userMessage: "That didn't quite work. Try rephrasing or shortening your message.",
  },

  // Generic fallback (must be last)
  {
    pattern: /.*/,
    userMessage: "Something unexpected happened. Try again—if it persists, refresh the page.",
  },
];

/**
 * Maps a technical error to a user-friendly message
 *
 * @param error - The original error (string, Error object, or unknown)
 * @returns User-friendly error message
 */
export function mapErrorToUserMessage(error: unknown): string {
  let errorMessage = '';

  // Extract error message from various error types
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = String((error as { message: unknown }).message);
  } else {
    errorMessage = String(error);
  }

  // Log technical error for debugging
  logger.error('[MetaDJai Error]', { error: String(error) });

  // Find matching error mapping
  for (const mapping of ERROR_MAPPINGS) {
    if (typeof mapping.pattern === 'string') {
      if (errorMessage.toLowerCase().includes(mapping.pattern.toLowerCase())) {
        return mapping.userMessage;
      }
    } else if (mapping.pattern.test(errorMessage)) {
      return mapping.userMessage;
    }
  }

  // Should never reach here due to catch-all pattern, but just in case
  return "Something unexpected happened. Mind trying that again?";
}

/**
 * Wraps an async function with error mapping
 *
 * @param fn - Async function to wrap
 * @returns Wrapped function that maps errors to user messages
 */
export function withErrorMapping<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw new Error(mapErrorToUserMessage(error));
    }
  };
}
