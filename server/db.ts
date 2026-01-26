/**
 * Database Connection
 *
 * PostgreSQL connection using Drizzle ORM with Neon serverless driver.
 * Supports both connection pooling and direct connections.
 */

import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const TLS_REQUIRED_SSLMODES = new Set(['require', 'verify-full', 'verify-ca']);

function isDatabaseTlsEnabled(url: string): boolean {
  try {
    const parsed = new URL(url);
    const sslmode = parsed.searchParams.get('sslmode')?.toLowerCase();
    const ssl = parsed.searchParams.get('ssl')?.toLowerCase();
    if (sslmode && TLS_REQUIRED_SSLMODES.has(sslmode)) return true;
    if (ssl && (ssl === 'true' || ssl === '1')) return true;
  } catch {
    return false;
  }
  return false;
}

if (process.env.NODE_ENV === 'production' && !isDatabaseTlsEnabled(connectionString)) {
  throw new Error('DATABASE_URL must enforce TLS in production (sslmode=require or ssl=true)');
}

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });

export const sql = neon(connectionString);

export type Database = typeof db;
