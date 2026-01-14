/**
 * Database Connection
 *
 * PostgreSQL connection using Drizzle ORM with Neon serverless driver.
 * Supports both connection pooling and direct connections.
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

neonConfig.fetchConnectionCache = true;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });

export const sql = neon(connectionString);

export type Database = typeof db;
