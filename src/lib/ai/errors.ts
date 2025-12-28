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
    userMessage: "Can't reach MetaDJai right now. Check your connection and try again.",
  },
  {
    pattern: /timeout|timed out/i,
    userMessage: "Request took too long. Let's try that again.",
  },

  // Rate limiting
  {
    pattern: /rate limit|too many requests|429/i,
    userMessage: "Taking a quick break. Try again in a moment.",
  },

  // Provider errors
  {
    pattern: /openai|gpt|api error/i,
    userMessage: "MetaDJai hit a provider issue. Try again in a moment.",
  },
  {
    pattern: /anthropic|claude/i,
    userMessage: "MetaDJai hit a provider issue. Try again in a moment.",
  },
  {
    pattern: /google|gemini/i,
    userMessage: "MetaDJai hit a provider issue. Try again in a moment.",
  },
  {
    pattern: /grok|xai/i,
    userMessage: "MetaDJai hit a provider issue. Try again in a moment.",
  },

  // Streaming errors
  {
    pattern: /stream|interrupted|connection/i,
    userMessage: "Connection interrupted. Your message wasn't lost—just hit send again.",
  },

  // Authentication/Authorization
  {
    pattern: /unauthorized|forbidden|401|403/i,
    userMessage: "Session expired. Refresh the page to continue.",
  },

  // Server errors
  {
    pattern: /500|502|503|504|server error|internal error/i,
    userMessage: "Server issue. Give it another try in a moment.",
  },

  // Validation errors
  {
    pattern: /invalid|validation|bad request|400/i,
    userMessage: "That didn't quite work. Mind trying again?",
  },

  // Generic fallback (must be last)
  {
    pattern: /.*/,
    userMessage: "Something unexpected happened. Mind trying that again?",
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
