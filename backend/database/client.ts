import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { neon } from '@neondatabase/serverless';
import postgres from 'postgres';
import * as schema from './schema.js';

/**
 * Create a Drizzle database instance
 * Auto-detects connection type (Neon serverless vs local PostgreSQL)
 * @param databaseUrl - PostgreSQL connection string
 * @returns Drizzle database instance
 */
export function getDb(databaseUrl: string) {
  // Check if using Neon database (remote serverless)
  if (databaseUrl.includes('neon.tech') || databaseUrl.includes('neon.')) {
    const sql = neon(databaseUrl);
    return drizzle(sql, { schema });
  }
  
  // Use local PostgreSQL connection
  const connection = postgres(databaseUrl);
  return drizzlePostgres(connection, { schema });
}

export type Database = ReturnType<typeof getDb>;
