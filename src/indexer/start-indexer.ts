/**
 * Canton Market Event Indexer - Entry Point
 *
 * Separate process that indexes Canton ledger events into PostgreSQL
 * for fast read queries while maintaining Canton as source of truth.
 *
 * Usage:
 *   Development: npm run dev:indexer
 *   Production: npm run start:indexer
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DamlService } from '../services/daml.service';
import { MarketIndexer } from './market-indexer';

// Validate required environment variables
const requiredEnvVars = [
  'CANTON_JSON_API_URL',
  'ADMIN_M2M_TOKEN',
  'PLATFORM_ADMIN_PARTY',
  'PACKAGE_ID',
  'DATABASE_URL',
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your .env file');
  process.exit(1);
}

// Initialize Prisma
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Initialize Canton service
const damlService = new DamlService({
  httpJsonApiUrl: process.env.CANTON_JSON_API_URL!,
  ledgerId: process.env.CANTON_LEDGER_ID || 'canton-network',
  applicationId: process.env.CANTON_APPLICATION_ID || 'unhedged-indexer',
  adminToken: process.env.ADMIN_M2M_TOKEN!,
  platformAdminParty: process.env.PLATFORM_ADMIN_PARTY!,
  packageId: process.env.PACKAGE_ID!,
});

// Initialize indexer
const indexer = new MarketIndexer(damlService, prisma, process.env.PACKAGE_ID!);

// Graceful shutdown handler
async function shutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

  try {
    await indexer.stop();
    console.log('✅ Indexer stopped');

    await prisma.$disconnect();
    console.log('✅ Database connection closed');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

// Start indexer
async function main() {
  console.log('========================================');
  console.log('   Canton Markets Event Indexer');
  console.log('========================================');
  console.log(`Canton API: ${process.env.CANTON_JSON_API_URL}`);
  console.log(`Ledger ID: ${process.env.CANTON_LEDGER_ID || 'canton-network'}`);
  console.log(`Application: ${process.env.CANTON_APPLICATION_ID || 'unhedged-indexer'}`);
  console.log(`Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'configured'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================\n');

  // Test database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }

  // Test Canton connection (optional - indexer will retry on failures)
  try {
    console.log('🔍 Testing Canton API connection...');
    await damlService.fetchUpdates('0', 1);
    console.log('✅ Canton API connection successful\n');
  } catch (error) {
    console.warn('⚠️  Canton API connection failed (will retry during indexing):', error);
  }

  // Start indexing
  try {
    await indexer.start();
  } catch (error) {
    console.error('❌ Indexer failed to start:', error);
    process.exit(1);
  }
}

// Run
main();
