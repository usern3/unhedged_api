import { faker } from '@faker-js/faker';

export const createMockUser = (overrides: any = {}) => {
  const now = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    username: faker.internet.username(),
    walletAddress: faker.finance.ethereumAddress(),
    avatar: faker.image.avatar(),
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
};

export const createMockMarket = (overrides: any = {}) => {
  const now = new Date().toISOString();
  const futureDate = faker.date.future().toISOString();
  const contractId = faker.string.alphanumeric(10);
  return {
    id: faker.string.uuid(),
    marketId: contractId,  // Database field
    contractId: contractId,  // API response field (schema)
    question: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    category: faker.helpers.arrayElement(['sports', 'politics', 'crypto', 'entertainment']),
    status: 'active',
    tokenStandard: faker.helpers.arrayElement(['splice-cc', 'cip-56']),
    totalPool: faker.number.float({ min: 100, max: 10000, fractionDigits: 2 }),
    createdAt: now,
    updatedAt: now,
    endTime: futureDate,
    resolvedAt: null,
    winningOutcome: null,
    ...overrides
  };
};

export const createMockMessage = (overrides: any = {}) => {
  const now = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    content: faker.lorem.sentence(),
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
};

export const createMockReaction = (overrides: any = {}) => {
  const now = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    messageId: faker.string.uuid(),
    emoji: faker.helpers.arrayElement(['👍', '❤️', '😂', '🔥', '👎']),
    createdAt: now,
    ...overrides
  };
};

export const createMockBet = (overrides: any = {}) => {
  const now = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    marketId: faker.string.uuid(),
    userId: faker.string.uuid(),
    outcomeIndex: faker.number.int({ min: 0, max: 1 }),
    amount: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
    shares: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
    createdAt: now,
    ...overrides
  };
};
