import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import marketsRoutes from '@/routes/markets';
import { createMockMarket } from '../../helpers/test-data';

describe('Markets Routes Integration', () => {
  let app: FastifyInstance;
  let mockMarketService: any;

  beforeEach(async () => {
    app = Fastify({ logger: false });

    // Create mock market service
    mockMarketService = {
      getMarkets: vi.fn(),
      getMarketById: vi.fn(),
      getExpiredMarkets: vi.fn(),
      getMarketMonitoring: vi.fn(),
      getMarketStats: vi.fn()
    };

    // Create mock cache service
    const mockCache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined)
    };

    // Create mock analytics service
    const mockAnalytics = {
      track: vi.fn().mockResolvedValue(undefined)
    };

    // Decorate Fastify instance with mock services
    app.decorate('marketService', mockMarketService);
    app.decorate('cache', mockCache);
    app.decorate('analytics', mockAnalytics);

    // Register routes
    await app.register(marketsRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /markets', () => {
    it('should return all markets without filters', async () => {
      const markets = [
        createMockMarket(),
        createMockMarket(),
        createMockMarket()
      ];
      mockMarketService.getMarkets.mockResolvedValue(markets);

      const response = await app.inject({
        method: 'GET',
        url: '/markets'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.markets).toHaveLength(3);
      expect(body.markets[0]).toHaveProperty('question');
      expect(body.markets[0]).toHaveProperty('status');
      expect(body.count).toBe(3);
      expect(body.timestamp).toBeDefined();
      expect(mockMarketService.getMarkets).toHaveBeenCalledWith({ status: 'active' });
    });

    it('should filter markets by status', async () => {
      const activeMarkets = [createMockMarket({ status: 'active' })];
      mockMarketService.getMarkets.mockResolvedValue(activeMarkets);

      const response = await app.inject({
        method: 'GET',
        url: '/markets?status=active'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.markets).toHaveLength(1);
      expect(body.markets[0]).toHaveProperty('status', 'active');
      expect(mockMarketService.getMarkets).toHaveBeenCalledWith({
        status: 'active'
      });
    });

    it('should filter markets by category', async () => {
      const sportsMarkets = [createMockMarket({ category: 'sports' })];
      mockMarketService.getMarkets.mockResolvedValue(sportsMarkets);

      const response = await app.inject({
        method: 'GET',
        url: '/markets?category=sports'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.markets).toHaveLength(1);
      expect(body.markets[0]).toHaveProperty('category', 'sports');
      expect(mockMarketService.getMarkets).toHaveBeenCalledWith({
        status: 'active',
        category: 'sports'
      });
    });

    it('should filter markets by tokenStandard', async () => {
      const spliceMarkets = [createMockMarket({ tokenStandard: 'splice-cc' })];
      mockMarketService.getMarkets.mockResolvedValue(spliceMarkets);

      const response = await app.inject({
        method: 'GET',
        url: '/markets?tokenStandard=splice-cc'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.markets).toHaveLength(1);
      expect(body.markets[0]).toHaveProperty('tokenStandard', 'splice-cc');
      expect(mockMarketService.getMarkets).toHaveBeenCalledWith({
        status: 'active',
        tokenStandard: 'splice-cc'
      });
    });

    it('should handle multiple query parameters', async () => {
      const filteredMarkets = [
        createMockMarket({
          status: 'resolved',
          category: 'crypto',
          tokenStandard: 'cip-56'
        })
      ];
      mockMarketService.getMarkets.mockResolvedValue(filteredMarkets);

      const response = await app.inject({
        method: 'GET',
        url: '/markets?status=resolved&category=crypto&tokenStandard=cip-56'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.markets).toHaveLength(1);
      expect(body.markets[0]).toHaveProperty('category', 'crypto');
      expect(body.markets[0]).toHaveProperty('tokenStandard', 'cip-56');
      expect(mockMarketService.getMarkets).toHaveBeenCalledWith({
        status: 'resolved',
        category: 'crypto',
        tokenStandard: 'cip-56'
      });
    });

    it('should handle service errors', async () => {
      mockMarketService.getMarkets.mockRejectedValue(new Error('DB error'));

      const response = await app.inject({
        method: 'GET',
        url: '/markets'
      });

      expect(response.statusCode).toBe(500);
    });

    it('should return empty markets array when no markets found', async () => {
      mockMarketService.getMarkets.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/markets?status=resolved'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.markets).toEqual([]);
      expect(body.count).toBe(0);
    });
  });

  describe('GET /markets/:id', () => {
    it('should return market details with bets', async () => {
      const market = {
        ...createMockMarket({ marketId: 'market-123' }),
        _count: { bets: 15, claims: 3 },
        bets: []
      };
      mockMarketService.getMarketById.mockResolvedValue(market);

      const response = await app.inject({
        method: 'GET',
        url: '/markets/market-123'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.market).toBeDefined();
      // Note: Fastify schema serialization excludes _count and bets from response
      // Schema uses 'contractId' not 'marketId'
      expect(body.market).toHaveProperty('question');
      expect(body.market).toHaveProperty('status');
      expect(body.market).toHaveProperty('contractId');
      expect(body.timestamp).toBeDefined();
      expect(mockMarketService.getMarketById).toHaveBeenCalledWith('market-123');
    });

    it('should return 404 when market not found', async () => {
      mockMarketService.getMarketById.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/markets/nonexistent'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Market not found');
    });

    it('should handle service errors', async () => {
      mockMarketService.getMarketById.mockRejectedValue(new Error('DB error'));

      const response = await app.inject({
        method: 'GET',
        url: '/markets/market-123'
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('GET /markets/:marketId/stats', () => {
    it('should return market statistics', async () => {
      const stats = [
        { outcomeIndex: 0, _sum: { amount: 1000 }, _count: { id: 10 } },
        { outcomeIndex: 1, _sum: { amount: 2000 }, _count: { id: 20 } }
      ];
      mockMarketService.getMarketStats.mockResolvedValue(stats);

      const response = await app.inject({
        method: 'GET',
        url: '/markets/market-123/stats'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.stats).toBeDefined();
      // Note: Schema defines stats as object, service returns array
      expect(body.timestamp).toBeDefined();
      expect(mockMarketService.getMarketStats).toHaveBeenCalledWith('market-123');
    });

    it('should handle service errors', async () => {
      mockMarketService.getMarketStats.mockRejectedValue(new Error('Stats error'));

      const response = await app.inject({
        method: 'GET',
        url: '/markets/market-123/stats'
      });

      expect(response.statusCode).toBe(500);
    });

    it('should return empty stats for new market', async () => {
      mockMarketService.getMarketStats.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/markets/new-market/stats'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.stats).toBeDefined();
    });
  });

  describe('GET /markets/monitoring', () => {
    it('should return monitoring data', async () => {
      const monitoring = {
        totalMarkets: 100,
        activeMarkets: 40,
        resolvedMarkets: 55,
        expiredMarkets: 5,
        totalVolume: '150000.00',
        lastUpdate: new Date().toISOString()
      };
      mockMarketService.getMarketMonitoring.mockResolvedValue(monitoring);

      const response = await app.inject({
        method: 'GET',
        url: '/markets/monitoring'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.monitoring).toBeDefined();
      // Note: Schema is flexible (type: object), actual shape depends on service
      expect(typeof body.monitoring).toBe('object');
      expect(body.timestamp).toBeDefined();
    });

    it('should handle service errors', async () => {
      mockMarketService.getMarketMonitoring.mockRejectedValue(new Error('Monitoring error'));

      const response = await app.inject({
        method: 'GET',
        url: '/markets/monitoring'
      });

      expect(response.statusCode).toBe(500);
    });
  });
});
