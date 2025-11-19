import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from '@/services/analytics.service';
import { prismaMock, createMockLogger } from '../../helpers/prisma-mock';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    analyticsService = new AnalyticsService(prismaMock as any, mockLogger);
  });

  describe('getPublicStats', () => {
    it('should return comprehensive platform analytics', async () => {
      // Mock all the parallel queries
      prismaMock.market.count.mockResolvedValueOnce(100); // total
      prismaMock.market.count.mockResolvedValueOnce(40); // active
      prismaMock.market.count.mockResolvedValueOnce(55); // resolved
      prismaMock.market.aggregate.mockResolvedValueOnce({ _sum: { totalPool: 150000.50 } } as any);
      prismaMock.bet.count.mockResolvedValueOnce(500);
      prismaMock.bet.aggregate.mockResolvedValueOnce({ _sum: { amount: 200000.75 } } as any);
      prismaMock.user.count.mockResolvedValueOnce(250);
      (prismaMock.bet.groupBy as any).mockResolvedValueOnce(Array(180).fill({ bettor: 'user' }));
      prismaMock.claim.count.mockResolvedValueOnce(120);
      prismaMock.claim.aggregate.mockResolvedValueOnce({ _sum: { amount: 95000.25 } } as any);

      const result = await analyticsService.getPublicStats();

      expect(result).toEqual({
        markets: {
          total: 100,
          active: 40,
          resolved: 55,
          totalVolume: 150000.50
        },
        bets: {
          total: 500,
          totalVolume: 200000.75
        },
        users: {
          totalUnique: 250,
          activeBettors: 180
        },
        claims: {
          total: 120,
          totalValue: 95000.25
        }
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        { service: 'AnalyticsService' },
        'Fetching public stats'
      );
    });

    it('should handle null aggregate values', async () => {
      prismaMock.market.count.mockResolvedValueOnce(0);
      prismaMock.market.count.mockResolvedValueOnce(0);
      prismaMock.market.count.mockResolvedValueOnce(0);
      prismaMock.market.aggregate.mockResolvedValueOnce({ _sum: { totalPool: null } } as any);
      prismaMock.bet.count.mockResolvedValueOnce(0);
      prismaMock.bet.aggregate.mockResolvedValueOnce({ _sum: { amount: null } } as any);
      prismaMock.user.count.mockResolvedValueOnce(0);
      (prismaMock.bet.groupBy as any).mockResolvedValueOnce([]);
      prismaMock.claim.count.mockResolvedValueOnce(0);
      prismaMock.claim.aggregate.mockResolvedValueOnce({ _sum: { amount: null } } as any);

      const result = await analyticsService.getPublicStats();

      expect(result.markets.totalVolume).toBe(0);
      expect(result.bets.totalVolume).toBe(0);
      expect(result.claims.totalValue).toBe(0);
    });
  });

  describe('getEnhancedPlatformStats', () => {
    it('should return detailed platform statistics for 30 days', async () => {
      // Mock all the queries
      prismaMock.user.count.mockResolvedValueOnce(1000); // total users
      prismaMock.user.count.mockResolvedValueOnce(600); // active users
      prismaMock.market.count.mockResolvedValueOnce(200); // total markets
      prismaMock.market.count.mockResolvedValueOnce(80); // active markets
      prismaMock.market.count.mockResolvedValueOnce(110); // resolved markets
      prismaMock.market.aggregate.mockResolvedValueOnce({ _sum: { totalPool: 500000 } } as any);
      prismaMock.bet.count.mockResolvedValueOnce(2500);
      prismaMock.bet.aggregate.mockResolvedValueOnce({ _sum: { amount: 750000 } } as any);
      prismaMock.user.count.mockResolvedValueOnce(350); // daily active
      prismaMock.user.count.mockResolvedValueOnce(700); // weekly active
      prismaMock.user.count.mockResolvedValueOnce(900); // monthly active
      prismaMock.market.aggregate.mockResolvedValueOnce({ _avg: { totalPool: 2500 } } as any);

      const result = await analyticsService.getEnhancedPlatformStats(30);

      expect(result).toMatchObject({
        totalUsers: 1000,
        activeUsers: 600,
        totalMarkets: 200,
        activeMarkets: 80,
        resolvedMarkets: 110,
        totalVolume: 500000,
        totalBets: 2500,
        dailyActiveUsers: 350,
        weeklyActiveUsers: 700,
        monthlyActiveUsers: 900
      });

      expect(result.averageBetSize).toBe(300); // 750000 / 2500
      expect(result.betsPerUser).toBe(2.5); // 2500 / 1000
      expect(result.marketsPerUser).toBe(0.2); // 200 / 1000
      expect(result.userRetentionRate).toBe(60); // (600 / 1000) * 100
      expect(result.marketCompletionRate).toBeCloseTo(55, 1); // (110 / 200) * 100
      expect(result.calculatedAt).toBeDefined();
      expect(result.periodStart).toBeDefined();
      expect(result.periodEnd).toBeDefined();
    });

    it('should handle custom time periods', async () => {
      prismaMock.user.count.mockResolvedValue(100);
      prismaMock.market.count.mockResolvedValue(10);
      prismaMock.market.aggregate.mockResolvedValue({ _sum: { totalPool: 10000 }, _avg: { totalPool: 1000 } } as any);
      prismaMock.bet.count.mockResolvedValue(50);
      prismaMock.bet.aggregate.mockResolvedValue({ _sum: { amount: 5000 } } as any);

      const result = await analyticsService.getEnhancedPlatformStats(7);

      expect(mockLogger.info).toHaveBeenCalledWith(
        { service: 'AnalyticsService', days: 7 },
        'Fetching enhanced stats'
      );
      expect(result).toBeDefined();
    });

    it('should handle division by zero gracefully', async () => {
      prismaMock.user.count.mockResolvedValue(0);
      prismaMock.market.count.mockResolvedValue(0);
      prismaMock.market.aggregate.mockResolvedValue({ _sum: { totalPool: 0 }, _avg: { totalPool: 0 } } as any);
      prismaMock.bet.count.mockResolvedValue(0);
      prismaMock.bet.aggregate.mockResolvedValue({ _sum: { amount: 0 } } as any);

      const result = await analyticsService.getEnhancedPlatformStats(30);

      expect(result.betsPerUser).toBe(0);
      expect(result.marketsPerUser).toBe(0);
      expect(result.userRetentionRate).toBe(0);
      expect(result.marketCompletionRate).toBe(0);
    });
  });

  describe('getUserEngagement', () => {
    it('should calculate user engagement metrics', async () => {
      const mockBets = [
        {
          bettor: 'user-123',
          amount: 100,
          marketId: 'market-1',
          outcomeIndex: 0,
          betTimestamp: new Date('2024-01-01'),
          market: { category: 'sports' }
        },
        {
          bettor: 'user-123',
          amount: 200,
          marketId: 'market-1',
          outcomeIndex: 1,
          betTimestamp: new Date('2024-01-15'),
          market: { category: 'sports' }
        },
        {
          bettor: 'user-123',
          amount: 150,
          marketId: 'market-2',
          outcomeIndex: 0,
          betTimestamp: new Date('2024-02-01'),
          market: { category: 'crypto' }
        }
      ];

      const mockUser = {
        partyId: 'user-123',
        winCount: 2,
        lossCount: 1,
        totalWinnings: 600,
        totalStaked: 450
      };

      prismaMock.bet.findMany.mockResolvedValueOnce(mockBets as any);
      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as any);

      const result = await analyticsService.getUserEngagement('user-123');

      expect(result).toMatchObject({
        userId: 'user-123',
        totalBets: 3,
        totalVolume: 450,
        marketsParticipated: 2,
        averageBetSize: 150
      });

      expect(result.winRate).toBeCloseTo(66.67, 1); // 2/3 * 100
      expect(result.profitLoss).toBe(150); // 600 - 450
      expect(result.roi).toBeCloseTo(33.33, 1); // (150 / 450) * 100
      expect(result.firstBetDate).toBe('2024-01-01T00:00:00.000Z');
      expect(result.riskTolerance).toBe('aggressive'); // avgBet 150 is in aggressive range
      expect(result.preferredMarketTypes).toContain('sports');
    });

    it('should throw error for user with no bets', async () => {
      prismaMock.bet.findMany.mockResolvedValueOnce([]);

      await expect(
        analyticsService.getUserEngagement('user-no-bets')
      ).rejects.toThrow('No betting activity found for user user-no-bets');
    });

    it('should classify risk tolerance correctly', async () => {
      const scenarios = [
        { avgBet: 5, expected: 'conservative' },
        { avgBet: 25, expected: 'moderate' },
        { avgBet: 100, expected: 'aggressive' },
        { avgBet: 500, expected: 'high-roller' }
      ];

      for (const scenario of scenarios) {
        const mockBets = [{
          bettor: 'user',
          amount: scenario.avgBet,
          marketId: 'market-1',
          outcomeIndex: 0,
          betTimestamp: new Date(),
          market: { category: 'sports' }
        }];

        prismaMock.bet.findMany.mockResolvedValueOnce(mockBets as any);
        prismaMock.user.findUnique.mockResolvedValueOnce({
          partyId: 'user',
          winCount: 1,
          lossCount: 0,
          totalWinnings: 100,
          totalStaked: 50
        } as any);

        const result = await analyticsService.getUserEngagement('user');
        expect(result.riskTolerance).toBe(scenario.expected);
      }
    });

    it('should classify engagement level correctly', async () => {
      const now = new Date();
      const scenarios = [
        { daysSince: 35, numBets: 1, daysSinceFirst: 100, expected: 'inactive' }, // inactive: >30 days
        { daysSince: 10, numBets: 2, daysSinceFirst: 30, expected: 'casual' },    // casual: freq < 0.1
        { daysSince: 5, numBets: 10, daysSinceFirst: 20, expected: 'regular' },   // regular: 0.1-1
        { daysSince: 2, numBets: 40, daysSinceFirst: 20, expected: 'power-user' },// power: 1-5
        { daysSince: 1, numBets: 100, daysSinceFirst: 10, expected: 'vip' }       // vip: >5
      ];

      for (const scenario of scenarios) {
        const lastBetDate = new Date(now.getTime() - scenario.daysSince * 24 * 60 * 60 * 1000);
        const firstBetDate = new Date(now.getTime() - scenario.daysSinceFirst * 24 * 60 * 60 * 1000);
        const mockBets = Array(scenario.numBets).fill(null).map((_, i) => ({
          bettor: 'user',
          amount: 100,
          marketId: `market-${i}`,
          outcomeIndex: 0,
          betTimestamp: i === 0 ? firstBetDate : (i === scenario.numBets - 1 ? lastBetDate : new Date()),
          market: { category: 'sports' }
        }));

        prismaMock.bet.findMany.mockResolvedValueOnce(mockBets as any);
        prismaMock.user.findUnique.mockResolvedValueOnce({
          partyId: 'user',
          winCount: 1,
          lossCount: 0,
          totalWinnings: 100,
          totalStaked: 50
        } as any);

        const result = await analyticsService.getUserEngagement('user');
        expect(result.engagementLevel).toBe(scenario.expected);
      }
    });
  });

  describe('getMarketAnalytics', () => {
    it('should calculate comprehensive market analytics', async () => {
      const mockMarket = {
        marketId: 'market-123',
        question: 'Will it rain tomorrow?',
        status: 'active',
        outcomes: ['Yes', 'No'],
        createdAt: new Date('2024-01-01'),
        resolutionTime: new Date('2024-02-01'),
        bets: [
          { bettor: 'user-1', amount: 100, outcomeIndex: 0, betTimestamp: new Date('2024-01-02') },
          { bettor: 'user-2', amount: 200, outcomeIndex: 1, betTimestamp: new Date('2024-01-03') },
          { bettor: 'user-3', amount: 150, outcomeIndex: 0, betTimestamp: new Date('2024-01-04') },
          { bettor: 'user-1', amount: 50, outcomeIndex: 1, betTimestamp: new Date('2024-01-05') }
        ],
        _count: { bets: 4 }
      };

      prismaMock.market.findUnique.mockResolvedValueOnce(mockMarket as any);

      const result = await analyticsService.getMarketAnalytics('market-123');

      expect(result).toMatchObject({
        marketId: 'market-123',
        marketTitle: 'Will it rain tomorrow?',
        totalParticipants: 3,
        totalBets: 4,
        totalVolume: 500,
        averageBetSize: 125
      });

      expect(result.outcomeDistribution).toHaveLength(2);
      expect(result.outcomeDistribution[0]).toMatchObject({
        outcomeIndex: 0,
        volume: 250,
        percentage: 50
      });
      expect(result.outcomeDistribution[1]).toMatchObject({
        outcomeIndex: 1,
        volume: 250,
        percentage: 50
      });

      expect(result.isHighActivity).toBe(false); // 4 bets < 50
      expect(result.isBalanced).toBe(true); // perfect 50/50 split
      expect(result.riskLevel).toBe('medium'); // 50% concentration = medium risk
    });

    it('should throw error for non-existent market', async () => {
      prismaMock.market.findUnique.mockResolvedValueOnce(null);

      await expect(
        analyticsService.getMarketAnalytics('nonexistent')
      ).rejects.toThrow('Market nonexistent not found');
    });

    it('should classify risk levels correctly', async () => {
      const scenarios = [
        { distribution: [85, 15], expected: 'critical' }, // 85% concentration > 0.8
        { distribution: [65, 35], expected: 'high' },     // 65% concentration > 0.6
        { distribution: [55, 45], expected: 'medium' },   // 55% max concentration > 0.4
        { distribution: [35, 65], expected: 'high' }      // 65% max concentration > 0.6
      ];

      for (const scenario of scenarios) {
        const mockMarket = {
          marketId: 'market',
          question: 'Test',
          status: 'active',
          outcomes: ['A', 'B'],
          createdAt: new Date(),
          resolutionTime: new Date(),
          bets: [
            { bettor: 'u1', amount: scenario.distribution[0], outcomeIndex: 0, betTimestamp: new Date() },
            { bettor: 'u2', amount: scenario.distribution[1], outcomeIndex: 1, betTimestamp: new Date() }
          ],
          _count: { bets: 2 }
        };

        prismaMock.market.findUnique.mockResolvedValueOnce(mockMarket as any);

        const result = await analyticsService.getMarketAnalytics('market');
        expect(result.riskLevel).toBe(scenario.expected);
      }
    });

    it('should handle markets with no bets', async () => {
      const mockMarket = {
        marketId: 'market-empty',
        question: 'Empty market',
        status: 'active',
        outcomes: ['Yes', 'No'],
        createdAt: new Date(),
        resolutionTime: new Date(),
        bets: [],
        _count: { bets: 0 }
      };

      prismaMock.market.findUnique.mockResolvedValueOnce(mockMarket as any);

      const result = await analyticsService.getMarketAnalytics('market-empty');

      expect(result.totalBets).toBe(0);
      expect(result.totalVolume).toBe(0);
      expect(result.averageBetSize).toBe(0);
      expect(result.firstBetAt).toBeNull();
      expect(result.lastBetAt).toBeNull();
    });
  });

  describe('Leaderboards', () => {
    const mockUsers = [
      { partyId: 'user-1', totalWinnings: 1000, totalStaked: 500, totalBets: 50, winCount: 30, lossCount: 20 },
      { partyId: 'user-2', totalWinnings: 800, totalStaked: 600, totalBets: 40, winCount: 25, lossCount: 15 },
      { partyId: 'user-3', totalWinnings: 600, totalStaked: 400, totalBets: 30, winCount: 20, lossCount: 10 }
    ];

    describe('getProfitLeaderboard', () => {
      it('should return users sorted by profit', async () => {
        prismaMock.user.findMany.mockResolvedValueOnce(mockUsers as any);

        const result = await analyticsService.getProfitLeaderboard(10);

        expect(result).toHaveLength(3);
        expect(result[0]).toMatchObject({
          userId: 'user-1',
          rank: 1,
          score: 500, // 1000 - 500
          totalWinnings: 1000,
          winRate: 60 // 30/50 * 100
        });
      });

      it('should respect limit parameter', async () => {
        prismaMock.user.findMany.mockResolvedValueOnce(mockUsers as any);

        const result = await analyticsService.getProfitLeaderboard(2);

        expect(prismaMock.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 2 })
        );
      });
    });

    describe('getWinRateLeaderboard', () => {
      it('should return users sorted by win rate', async () => {
        prismaMock.user.findMany.mockResolvedValueOnce(mockUsers as any);

        const result = await analyticsService.getWinRateLeaderboard(10);

        expect(result).toHaveLength(3);
        // user-3 has highest win rate: 20/30 = 66.67%
        expect(result[0].userId).toBe('user-3');
        expect(result[0].winRate).toBeCloseTo(66.67, 1);
      });

      it('should filter users with minimum 5 bets', async () => {
        prismaMock.user.findMany.mockResolvedValueOnce([]);

        await analyticsService.getWinRateLeaderboard(10);

        expect(prismaMock.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              totalBets: { gt: 5 }
            })
          })
        );
      });
    });

    describe('getVolumeLeaderboard', () => {
      it('should return users sorted by total staked', async () => {
        // Need to return users already sorted by totalStaked desc
        const sortedByVolume = [mockUsers[1], mockUsers[0], mockUsers[2]]; // 600, 500, 400
        prismaMock.user.findMany.mockResolvedValueOnce(sortedByVolume as any);

        const result = await analyticsService.getVolumeLeaderboard(10);

        expect(result).toHaveLength(3);
        // user-2 has highest volume: 600
        expect(result[0]).toMatchObject({
          userId: 'user-2',
          rank: 1,
          score: 600,
          totalVolume: 600
        });
      });
    });

    describe('getROILeaderboard', () => {
      it('should return users sorted by ROI', async () => {
        prismaMock.user.findMany.mockResolvedValueOnce(mockUsers as any);

        const result = await analyticsService.getROILeaderboard(10);

        expect(result).toHaveLength(3);
        // user-1 has highest ROI: (1000-500)/500 = 100%
        expect(result[0]).toMatchObject({
          userId: 'user-1',
          rank: 1,
          score: 100
        });
      });

      it('should filter users with minimum 5 bets and positive stake', async () => {
        prismaMock.user.findMany.mockResolvedValueOnce([]);

        await analyticsService.getROILeaderboard(10);

        expect(prismaMock.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              totalBets: { gt: 5 },
              totalStaked: { gt: 0 }
            })
          })
        );
      });
    });

    describe('getActivityLeaderboard', () => {
      it('should return users sorted by total bets', async () => {
        prismaMock.user.findMany.mockResolvedValueOnce(mockUsers as any);

        const result = await analyticsService.getActivityLeaderboard(10);

        expect(result).toHaveLength(3);
        // user-1 has most bets: 50
        expect(result[0]).toMatchObject({
          userId: 'user-1',
          rank: 1,
          score: 50,
          totalBets: 50
        });
      });
    });
  });

  describe('getDailyMetrics', () => {
    it('should return daily metrics for specified number of days', async () => {
      const result = await analyticsService.getDailyMetrics(7);

      expect(result).toHaveLength(7);
      expect(result[0]).toMatchObject({
        date: expect.any(String),
        bets: 0,
        volume: 0,
        newUsers: 0,
        activeUsers: 0,
        marketsCreated: 0,
        marketsResolved: 0
      });
    });

    it('should default to 30 days', async () => {
      const result = await analyticsService.getDailyMetrics();

      expect(result).toHaveLength(30);
    });
  });

  describe('assessPlatformHealth', () => {
    it('should calculate overall platform health score', async () => {
      // Mock getEnhancedPlatformStats dependencies
      prismaMock.user.count.mockResolvedValue(1000);
      prismaMock.market.count.mockResolvedValue(100);
      prismaMock.market.aggregate.mockResolvedValue({
        _sum: { totalPool: 100000 },
        _avg: { totalPool: 1000 }
      } as any);
      prismaMock.bet.count.mockResolvedValue(500);
      prismaMock.bet.aggregate.mockResolvedValue({ _sum: { amount: 50000 } } as any);

      const result = await analyticsService.assessPlatformHealth();

      expect(result).toMatchObject({
        overallHealthScore: expect.any(Number),
        userEngagementScore: expect.any(Number),
        marketQualityScore: expect.any(Number),
        financialHealthScore: expect.any(Number),
        technicalHealthScore: expect.any(Number),
        calculatedAt: expect.any(String)
      });

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.alerts).toBeInstanceOf(Array);
      expect(result.overallHealthScore).toBeGreaterThanOrEqual(0);
      expect(result.overallHealthScore).toBeLessThanOrEqual(100);
    });

    it('should generate alerts for low engagement', async () => {
      // Mock low engagement scenario
      prismaMock.user.count.mockResolvedValueOnce(1000); // total
      prismaMock.user.count.mockResolvedValueOnce(100); // active (10% - very low)
      prismaMock.market.count.mockResolvedValue(100);
      prismaMock.market.aggregate.mockResolvedValue({
        _sum: { totalPool: 10000 },
        _avg: { totalPool: 100 }
      } as any);
      prismaMock.bet.count.mockResolvedValue(50);
      prismaMock.bet.aggregate.mockResolvedValue({ _sum: { amount: 5000 } } as any);

      const result = await analyticsService.assessPlatformHealth();

      expect(result.alerts).toContain('Low user engagement - consider marketing campaigns');
      expect(result.recommendations).toContain('Increase user acquisition and retention efforts');
    });

    it('should generate alerts for low market completion', async () => {
      // Mock low completion scenario
      prismaMock.user.count.mockResolvedValue(1000);
      prismaMock.market.count.mockResolvedValueOnce(200); // total
      prismaMock.market.count.mockResolvedValueOnce(100); // active
      prismaMock.market.count.mockResolvedValueOnce(50); // resolved (25% - very low)
      prismaMock.market.aggregate.mockResolvedValue({
        _sum: { totalPool: 50000 },
        _avg: { totalPool: 250 }
      } as any);
      prismaMock.bet.count.mockResolvedValue(100);
      prismaMock.bet.aggregate.mockResolvedValue({ _sum: { amount: 10000 } } as any);

      const result = await analyticsService.assessPlatformHealth();

      expect(result.alerts).toContain('Low market completion rate - review market creation process');
      expect(result.recommendations).toContain('Improve market resolution workflow');
    });
  });
});
