import { describe, it, expect, beforeEach } from 'vitest';
import { MarketService } from '@/services/market.service';
import { prismaMock, createMockLogger } from '../../helpers/prisma-mock';
import { createMockMarket, createMockBet } from '../../helpers/test-data';

describe('MarketService', () => {
  let marketService: MarketService;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    marketService = new MarketService(prismaMock as any, mockLogger);
  });

  describe('getMarkets', () => {
    it('should return all markets without filters', async () => {
      const mockMarkets = [
        createMockMarket(),
        createMockMarket(),
        createMockMarket()
      ];

      prismaMock.market.findMany.mockResolvedValue(mockMarkets as any);

      const result = await marketService.getMarkets();

      expect(result).toEqual(mockMarkets);
      expect(prismaMock.market.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { bets: true, claims: true }
          }
        }
      });
    });

    it('should filter markets by status', async () => {
      const activeMarkets = [createMockMarket({ status: 'active' })];

      prismaMock.market.findMany.mockResolvedValue(activeMarkets as any);

      const result = await marketService.getMarkets({ status: 'active' });

      expect(result).toEqual(activeMarkets);
      expect(prismaMock.market.findMany).toHaveBeenCalledWith({
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { bets: true, claims: true }
          }
        }
      });
    });

    it('should filter markets by category', async () => {
      const sportsMarkets = [createMockMarket({ category: 'sports' })];

      prismaMock.market.findMany.mockResolvedValue(sportsMarkets as any);

      const result = await marketService.getMarkets({ category: 'sports' });

      expect(result).toEqual(sportsMarkets);
      expect(prismaMock.market.findMany).toHaveBeenCalledWith({
        where: { category: 'sports' },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { bets: true, claims: true }
          }
        }
      });
    });

    it('should filter markets by token standard', async () => {
      const spliceMarkets = [createMockMarket({ tokenStandard: 'splice-cc' })];

      prismaMock.market.findMany.mockResolvedValue(spliceMarkets as any);

      const result = await marketService.getMarkets({ tokenStandard: 'splice-cc' });

      expect(result).toEqual(spliceMarkets);
      expect(prismaMock.market.findMany).toHaveBeenCalledWith({
        where: { tokenStandard: 'splice-cc' },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { bets: true, claims: true }
          }
        }
      });
    });

    it('should handle multiple filters', async () => {
      const filteredMarkets = [
        createMockMarket({
          status: 'active',
          category: 'crypto',
          tokenStandard: 'cip-56'
        })
      ];

      prismaMock.market.findMany.mockResolvedValue(filteredMarkets as any);

      const result = await marketService.getMarkets({
        status: 'active',
        category: 'crypto',
        tokenStandard: 'cip-56'
      });

      expect(result).toEqual(filteredMarkets);
      expect(prismaMock.market.findMany).toHaveBeenCalledWith({
        where: {
          status: 'active',
          category: 'crypto',
          tokenStandard: 'cip-56'
        },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { bets: true, claims: true }
          }
        }
      });
    });

    it('should handle errors gracefully', async () => {
      prismaMock.market.findMany.mockRejectedValue(new Error('Database error'));

      await expect(marketService.getMarkets()).rejects.toThrow('Failed to fetch markets');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[MarketService] Error fetching markets',
        expect.objectContaining({
          error: 'Database error'
        })
      );
    });
  });

  describe('getMarketById', () => {
    it('should return market with bets when found', async () => {
      const market = createMockMarket({ marketId: 'market-123' });
      const marketWithBets = {
        ...market,
        _count: { bets: 15, claims: 3 },
        bets: [createMockBet(), createMockBet()]
      };

      prismaMock.market.findUnique.mockResolvedValue(marketWithBets as any);

      const result = await marketService.getMarketById('market-123');

      expect(result).toEqual(marketWithBets);
      expect(prismaMock.market.findUnique).toHaveBeenCalledWith({
        where: { marketId: 'market-123' },
        include: {
          _count: {
            select: { bets: true, claims: true }
          },
          bets: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    });

    it('should return null when market not found', async () => {
      prismaMock.market.findUnique.mockResolvedValue(null);

      const result = await marketService.getMarketById('nonexistent');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[MarketService] Market not found',
        { marketId: 'nonexistent' }
      );
    });

    it('should handle database errors', async () => {
      prismaMock.market.findUnique.mockRejectedValue(new Error('Connection lost'));

      await expect(
        marketService.getMarketById('market-123')
      ).rejects.toThrow('Failed to fetch market: market-123');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getExpiredMarkets', () => {
    it('should return active markets past endTime', async () => {
      const pastDate = new Date(Date.now() - 86400000); // 1 day ago
      const expiredMarkets = [
        createMockMarket({ status: 'active', endTime: pastDate }),
        createMockMarket({ status: 'active', endTime: pastDate })
      ];

      prismaMock.market.findMany.mockResolvedValue(expiredMarkets as any);

      const result = await marketService.getExpiredMarkets();

      expect(result).toEqual(expiredMarkets);
      expect(prismaMock.market.findMany).toHaveBeenCalledWith({
        where: {
          endTime: { lt: expect.any(Date) },
          status: 'active'
        },
        orderBy: { endTime: 'asc' }
      });
    });

    it('should return empty array when no expired markets', async () => {
      prismaMock.market.findMany.mockResolvedValue([]);

      const result = await marketService.getExpiredMarkets();

      expect(result).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[MarketService] Expired markets fetched',
        { count: 0 }
      );
    });

    it('should handle errors', async () => {
      prismaMock.market.findMany.mockRejectedValue(new Error('Query failed'));

      await expect(marketService.getExpiredMarkets()).rejects.toThrow(
        'Failed to fetch expired markets'
      );
    });
  });

  describe('getMarketMonitoring', () => {
    it('should return monitoring statistics', async () => {
      prismaMock.market.count.mockResolvedValueOnce(10); // active
      prismaMock.market.count.mockResolvedValueOnce(25); // resolved
      prismaMock.market.count.mockResolvedValueOnce(3); // expired
      prismaMock.market.aggregate.mockResolvedValue({
        _sum: { totalPool: 50000.50 }
      } as any);

      const result = await marketService.getMarketMonitoring();

      expect(result).toEqual({
        totalMarkets: 35,
        activeMarkets: 10,
        resolvedMarkets: 25,
        expiredMarkets: 3,
        totalVolume: '50000.50',
        lastUpdate: expect.any(String)
      });
    });

    it('should handle null totalPool sum', async () => {
      prismaMock.market.count.mockResolvedValueOnce(5);
      prismaMock.market.count.mockResolvedValueOnce(10);
      prismaMock.market.count.mockResolvedValueOnce(1);
      prismaMock.market.aggregate.mockResolvedValue({
        _sum: { totalPool: null }
      } as any);

      const result = await marketService.getMarketMonitoring();

      expect(result.totalVolume).toBe('0.00');
    });

    it('should handle errors', async () => {
      prismaMock.market.count.mockRejectedValue(new Error('DB error'));

      await expect(marketService.getMarketMonitoring()).rejects.toThrow(
        'Failed to fetch monitoring data'
      );
    });
  });

  describe('getMarketStats', () => {
    it('should return bet statistics grouped by outcome', async () => {
      const stats = [
        { outcomeIndex: 0, _sum: { amount: 1000 }, _count: { id: 15 } },
        { outcomeIndex: 1, _sum: { amount: 2500 }, _count: { id: 30 } }
      ];

      (prismaMock.bet.groupBy as any).mockResolvedValue(stats as any);

      const result = await marketService.getMarketStats('market-123');

      expect(result).toEqual(stats);
      expect(prismaMock.bet.groupBy).toHaveBeenCalledWith({
        by: ['outcomeIndex'],
        where: { marketId: 'market-123' },
        _sum: { amount: true },
        _count: { id: true }
      });
    });

    it('should handle errors', async () => {
      (prismaMock.bet.groupBy as any).mockRejectedValue(new Error('Aggregation failed'));

      await expect(
        marketService.getMarketStats('market-123')
      ).rejects.toThrow('Failed to fetch market stats');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
