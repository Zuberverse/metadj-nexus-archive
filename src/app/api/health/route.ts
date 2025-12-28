/**
 * MetaDJ Nexus - Health Check Endpoint
 *
 * Provides system health status for monitoring and deployment validation.
 * Returns 200 if healthy, 503 if critical issues detected.
 *
 * Checks:
 * - Application is running and responding
 * - Environment variables are valid
 * - Storage bucket connectivity (basic check)
 * - Timestamp and version information
 */

import { NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import packageJson from '../../../../package.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Always execute, never cache

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    environment: CheckResult;
    storage: CheckResult;
    ai: CheckResult;
  };
}

interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  message?: string;
}

/**
 * Validate environment configuration
 */
function checkEnvironment(): CheckResult {
  try {
    const env = getEnv();

    // Check if required public variables are set
    if (!env.NEXT_PUBLIC_APP_URL) {
      return {
        status: 'warn',
        message: 'NEXT_PUBLIC_APP_URL not configured, using default',
      };
    }

    return { status: 'pass' };
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Environment validation failed',
    };
  }
}

/**
 * Check storage bucket connectivity
 * Tests actual connectivity to Replit App Storage buckets
 */
async function checkStorage(): Promise<CheckResult> {
  try {
    const {
      getAudioBucket,
      getVisualsBucket,
      storageDiagnostics,
    } = await import('@/lib/replit-storage');

    const configuredMusic = storageDiagnostics.music.configured;
    const configuredVisuals = storageDiagnostics.visuals.configured;

    if (!configuredMusic && !configuredVisuals) {
      return {
        status: 'warn',
        message: 'Storage buckets not configured (set MUSIC_BUCKET_ID and VISUALS_BUCKET_ID)',
      };
    }

    const [audioBucket, visualsBucket] = await Promise.all([
      configuredMusic ? getAudioBucket() : Promise.resolve(null),
      configuredVisuals ? getVisualsBucket() : Promise.resolve(null),
    ]);

    const musicUnavailable = configuredMusic && !audioBucket;
    const visualsUnavailable = configuredVisuals && !visualsBucket;

    if (musicUnavailable && visualsUnavailable) {
      return {
        status: 'fail',
        message: 'Configured storage buckets are unreachable',
      };
    }

    if (musicUnavailable) {
      return {
        status: 'warn',
        message: 'Music bucket unreachable (check MUSIC_BUCKET_ID/AUDIO_BUCKET_ID)',
      };
    }

    if (visualsUnavailable) {
      return {
        status: 'warn',
        message: 'Visuals bucket unreachable (check VISUALS_BUCKET_ID)',
      };
    }

    return {
      status: 'pass',
      message: configuredMusic && configuredVisuals
        ? 'Storage buckets reachable'
        : 'Partial storage configured (one bucket active)',
    };
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Storage connectivity check failed',
    };
  }
}

/**
 * Check AI provider configuration
 * Validates that at least one AI provider is configured
 */
function checkAIProviders(): CheckResult {
  try {
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasGoogle = !!process.env.GOOGLE_API_KEY;
    const hasXai = !!process.env.XAI_API_KEY;
    const configuredProviders = [
      hasOpenAI ? 'OpenAI' : null,
      hasAnthropic ? 'Anthropic' : null,
      hasGoogle ? 'Google' : null,
      hasXai ? 'xAI' : null,
    ].filter(Boolean) as string[];

    if (configuredProviders.length === 0) {
      return {
        status: 'fail',
        message: 'No AI providers configured (MetaDJai unavailable)',
      };
    }

    if (configuredProviders.length > 1) {
      return {
        status: 'pass',
        message: `AI providers configured: ${configuredProviders.join(', ')}`,
      };
    }

    return {
      status: 'warn',
      message: `Only ${configuredProviders[0]} configured (no secondary provider)`,
    };
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'AI provider check failed',
    };
  }
}

/**
 * Minimal public health response for external monitoring
 * Only exposes status and timestamp - no internal details
 */
interface PublicHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
}

/**
 * Returns system health status for monitoring and deployment validation.
 *
 * Security: Returns minimal information publicly (status + timestamp only).
 * Detailed diagnostics are logged server-side for debugging but not exposed to clients.
 *
 * @route GET /api/health
 * @returns JSON response with health status and timestamp only
 *
 * @example
 * // Response body (public)
 * {
 *   status: 'healthy' | 'degraded' | 'unhealthy',
 *   timestamp: '2024-01-15T10:30:00.000Z'
 * }
 *
 * @throws {503} Returns unhealthy status when critical checks fail (environment, storage, or AI)
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const version = process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version;

  // Run health checks
  const environmentCheck = checkEnvironment();
  const storageCheck = await checkStorage();
  const aiCheck = checkAIProviders();

  // Determine overall health status
  const hasCriticalFailure =
    environmentCheck.status === 'fail' ||
    storageCheck.status === 'fail' ||
    aiCheck.status === 'fail';

  const hasWarning =
    environmentCheck.status === 'warn' ||
    storageCheck.status === 'warn' ||
    aiCheck.status === 'warn';

  const overallStatus: HealthStatus['status'] =
    hasCriticalFailure ? 'unhealthy' :
    hasWarning ? 'degraded' :
    'healthy';

  // Log detailed diagnostics server-side only (not exposed to client)
  // This information is valuable for debugging but should not be public
  if (overallStatus !== 'healthy') {
    logger.warn('Health check diagnostics', {
      timestamp,
      version,
      status: overallStatus,
      checks: {
        environment: environmentCheck,
        storage: storageCheck,
        ai: aiCheck,
      },
    });
  }

  // Public response: minimal information disclosure
  const publicResponse: PublicHealthResponse = {
    status: overallStatus,
    timestamp,
  };

  // Return appropriate HTTP status code
  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(publicResponse, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}
