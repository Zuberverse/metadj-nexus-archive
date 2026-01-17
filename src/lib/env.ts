/**
 * MetaDJ Nexus - Environment Variable Validation
 *
 * Validates environment variables on app startup using Zod schemas.
 * Provides clear error messages for missing or invalid configuration.
 *
 * This module validates both server-side and client-side (NEXT_PUBLIC_*) variables.
 */

import { z } from 'zod';

/**
 * Server-side environment variables schema
 * These are only accessible in server components and API routes
 */
const serverEnvSchema = z.object({
  // Core Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Server configuration
  PORT: z.string().regex(/^\d+$/).optional().default('8100'),

  // Database
  DATABASE_URL: z.string().url().optional(),

  // Authentication
  AUTH_SECRET: z.string().min(32, { message: 'AUTH_SECRET must be at least 32 characters' }),
  ADMIN_PASSWORD: z.string().min(8, { message: 'ADMIN_PASSWORD must be at least 8 characters' }).optional(),
  AUTH_SESSION_DURATION: z.string().regex(/^\d+$/).optional(),
  AUTH_REGISTRATION_ENABLED: z.enum(['true', 'false']).optional(),

  // Logging configuration (optional - webhook-based logging)
  LOGGING_WEBHOOK_URL: z.string().url().optional().refine((val) => {
    // If webhook URL is provided, ensure it's HTTPS in production
    if (val && process.env.NODE_ENV === 'production') {
      return val.startsWith('https://');
    }
    return true;
  }, {
    message: 'LOGGING_WEBHOOK_URL must use HTTPS in production',
  }),

  // Logging shared secret (required if webhook URL is set)
  LOGGING_SHARED_SECRET: z.string().min(32, {
    message: 'LOGGING_SHARED_SECRET must be at least 32 characters for security',
  }).optional(),

  // Client key required for /api/log authentication when enabled
  LOGGING_CLIENT_KEY: z.string().min(32, {
    message: 'LOGGING_CLIENT_KEY must be at least 32 characters for security',
  }).optional(),

  // Internal health endpoints auth
  INTERNAL_API_SECRET: z.string().min(32, {
    message: 'INTERNAL_API_SECRET must be at least 32 characters for security',
  }).optional(),

  // MetaDJai AI configuration
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_TRANSCRIBE_MODEL: z.string().min(1).optional(),
  GOOGLE_API_KEY: z.string().min(1).optional(),
  XAI_API_KEY: z.string().min(1).optional(),
  // Local-only AI tooling
  AI_MCP_ENABLED: z.enum(['true', 'false']).optional(),
  AI_MCP_SERVER_COMMAND: z.string().optional(),
  AI_MCP_SERVER_ARGS: z.string().optional(),
  AI_MCP_SERVER_CWD: z.string().optional(),
  AI_DEVTOOLS_ENABLED: z.enum(['true', 'false']).optional(),

  // Daydream StreamDiffusion
  DAYDREAM_API_KEY: z.string().min(1, { message: 'DAYDREAM_API_KEY is required for Dream' }).optional(),
  DAYDREAM_API_GATEWAY: z.string().url().optional(),
  DAYDREAM_WHIP_ALLOWED_HOSTS: z.string().optional(),
  DAYDREAM_WHIP_ALLOW_DEV: z.enum(['true', 'false']).optional(),

  // Optional: Scalable Rate Limiting via Upstash Redis
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  RATE_LIMIT_FAIL_CLOSED: z.enum(['true', 'false']).optional(),

  // Internal analytics event storage (optional)
  ANALYTICS_DB_ENABLED: z.enum(['true', 'false']).optional(),

  // Cloudflare R2 media storage
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).optional(),
});

/**
 * Client-side environment variables schema
 * These are accessible in both server and client code (prefixed with NEXT_PUBLIC_)
 */
const clientEnvSchema = z.object({
  // Application URL (required for metadata, OG tags, etc.)
  NEXT_PUBLIC_APP_URL: z.string().url().default('https://metadjnexus.ai'),

  // Analytics configuration (optional - Plausible Analytics)
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_PLAUSIBLE_API_HOST: z.string().url().optional(),
  NEXT_PUBLIC_ANALYTICS_DB_ENABLED: z.enum(['true', 'false']).optional(),

  // Application version (optional - defaults to package.json version)
  NEXT_PUBLIC_APP_VERSION: z.string().optional(),
  NEXT_PUBLIC_PREVIEW_URL: z.string().url().optional(),

  // Public client key used with /api/log
  NEXT_PUBLIC_LOGGING_CLIENT_KEY: z.string().min(32).optional(),
});

/**
 * Combined environment schema with cross-validation rules
 */
const envSchema = serverEnvSchema.merge(clientEnvSchema)
  .refine((data) => {
    // If LOGGING_WEBHOOK_URL is set, LOGGING_SHARED_SECRET must also be set
    if (data.LOGGING_WEBHOOK_URL && !data.LOGGING_SHARED_SECRET) {
      return false;
    }
    return true;
  }, {
    message: 'LOGGING_SHARED_SECRET is required when LOGGING_WEBHOOK_URL is configured',
    path: ['LOGGING_SHARED_SECRET'],
  })
  .refine((data) => {
    const serverKey = data.LOGGING_CLIENT_KEY;
    const clientKey = data.NEXT_PUBLIC_LOGGING_CLIENT_KEY;
    if ((serverKey && !clientKey) || (!serverKey && clientKey)) {
      return false;
    }
    if (serverKey && clientKey && serverKey !== clientKey) {
      return false;
    }
    return true;
  }, {
    message: 'LOGGING_CLIENT_KEY and NEXT_PUBLIC_LOGGING_CLIENT_KEY must both be set and match',
    path: ['LOGGING_CLIENT_KEY'],
  })
  .refine((data) => {
    if (data.NODE_ENV !== 'production') return true;
    return Boolean(data.DATABASE_URL);
  }, {
    message: 'DATABASE_URL is required in production',
    path: ['DATABASE_URL'],
  })
  .refine((data) => {
    const anyR2 =
      data.R2_ACCOUNT_ID ||
      data.R2_ACCESS_KEY_ID ||
      data.R2_SECRET_ACCESS_KEY;
    const allR2 =
      data.R2_ACCOUNT_ID &&
      data.R2_ACCESS_KEY_ID &&
      data.R2_SECRET_ACCESS_KEY;
    if (anyR2 && !allR2) {
      return false;
    }
    return true;
  }, {
    message: 'R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY must all be set together',
    path: ['R2_ACCOUNT_ID'],
  })
  .refine((data) => {
    if (data.NODE_ENV !== 'production') return true;
    return Boolean(data.R2_ACCOUNT_ID && data.R2_ACCESS_KEY_ID && data.R2_SECRET_ACCESS_KEY);
  }, {
    message: 'R2 credentials are required in production',
    path: ['R2_ACCOUNT_ID'],
  });

/**
 * Validated environment variables
 * TypeScript type inferred from Zod schema
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * Throws detailed error if validation fails
 */
function sanitizeEnvVariables(rawEnv: NodeJS.ProcessEnv) {
  return Object.fromEntries(
    Object.entries(rawEnv).map(([key, value]) => {
      if (typeof value !== 'string') {
        return [key, value];
      }
      const trimmed = value.trim();
      return [key, trimmed === '' ? undefined : trimmed];
    }),
  ) as NodeJS.ProcessEnv;
}

function validateEnv(): Env {
  const sanitizedEnv = sanitizeEnvVariables(process.env);
  const parsed = envSchema.safeParse(sanitizedEnv);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');

    // Format validation errors for clarity
    const formattedErrors = parsed.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return `  • ${path}: ${issue.message}`;
    });

    console.error(formattedErrors.join('\n'));
    console.error('\n📖 Environment variable documentation:');
    console.error('  See .env.example for required and optional variables');

    throw new Error('Environment validation failed. Check logs above for details.');
  }

  return parsed.data;
}

/**
 * Validated environment variables singleton
 * Validates on first access and caches result
 * Cache can be invalidated for hot-reload scenarios
 */
let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

/**
 * Clear cached env (useful if env vars change at runtime)
 */
export function clearEnvCache(): void {
  cachedEnv = null;
}

/**
 * Server-only environment variables
 * Use this in server components and API routes
 */
export function getServerEnv() {
  const env = getEnv();

  // Return only server-side variables
  return {
    NODE_ENV: env.NODE_ENV,
    PORT: env.PORT,
    DATABASE_URL: env.DATABASE_URL,
    AUTH_SECRET: env.AUTH_SECRET,
    ADMIN_PASSWORD: env.ADMIN_PASSWORD,
    AUTH_SESSION_DURATION: env.AUTH_SESSION_DURATION,
    AUTH_REGISTRATION_ENABLED: env.AUTH_REGISTRATION_ENABLED,
    LOGGING_WEBHOOK_URL: env.LOGGING_WEBHOOK_URL,
    LOGGING_SHARED_SECRET: env.LOGGING_SHARED_SECRET,
    LOGGING_CLIENT_KEY: env.LOGGING_CLIENT_KEY,
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    OPENAI_TRANSCRIBE_MODEL: env.OPENAI_TRANSCRIBE_MODEL,
    GOOGLE_API_KEY: env.GOOGLE_API_KEY,
    XAI_API_KEY: env.XAI_API_KEY,
    AI_MCP_ENABLED: env.AI_MCP_ENABLED,
    AI_MCP_SERVER_COMMAND: env.AI_MCP_SERVER_COMMAND,
    AI_MCP_SERVER_ARGS: env.AI_MCP_SERVER_ARGS,
    AI_MCP_SERVER_CWD: env.AI_MCP_SERVER_CWD,
    AI_DEVTOOLS_ENABLED: env.AI_DEVTOOLS_ENABLED,
    DAYDREAM_API_KEY: env.DAYDREAM_API_KEY,
    DAYDREAM_API_GATEWAY: env.DAYDREAM_API_GATEWAY,
    DAYDREAM_WHIP_ALLOWED_HOSTS: env.DAYDREAM_WHIP_ALLOWED_HOSTS,
    DAYDREAM_WHIP_ALLOW_DEV: env.DAYDREAM_WHIP_ALLOW_DEV,
    RATE_LIMIT_FAIL_CLOSED: env.RATE_LIMIT_FAIL_CLOSED,
    R2_ACCOUNT_ID: env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: env.R2_BUCKET,
  };
}

/**
 * Client-safe environment variables
 * Use this in client components (browser-safe only)
 */
export function getClientEnv() {
  const env = getEnv();

  // Return only NEXT_PUBLIC_ variables (safe for client)
  return {
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
    NEXT_PUBLIC_PLAUSIBLE_API_HOST: env.NEXT_PUBLIC_PLAUSIBLE_API_HOST,
    NEXT_PUBLIC_APP_VERSION: env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_PREVIEW_URL: env.NEXT_PUBLIC_PREVIEW_URL,
    NEXT_PUBLIC_LOGGING_CLIENT_KEY: env.NEXT_PUBLIC_LOGGING_CLIENT_KEY,
  };
}

// NOTE: Don't validate on module load - Next.js may not have loaded .env yet
// Validation happens lazily on first getEnv() call from API routes/server components
