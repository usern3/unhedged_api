import { vi } from 'vitest';

// Setup global test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

// Mock Prisma Client at module level
vi.mock('@prisma/client');
