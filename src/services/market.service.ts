/**
 * MarketService - Business logic for prediction markets
 *
 * Handles:
 * - Fetching markets (all markets, by ID, by status)
 * - Database operations via Prisma
 * - Market filtering and queries
 */

import { PrismaClient } from '@prisma/client';

export interface MarketFilter {
  status?: string;
  category?: string;
  tokenStandard?: 'splice-cc' | 'cip-56';
}

export class MarketService {
  constructor(private prisma: PrismaClient, private logger?: any) {}

  /**
   * Get all markets with optional filters
   */
  async getMarkets(filter: MarketFilter = {}) {
    try {
      this.logger?.info('[MarketService] Fetching markets', { filter });

      const where: any = {};

      if (filter.status) {
        where.status = filter.status.toLowerCase();
      }

      if (filter.category) {
        where.category = filter.category;
      }

      if (filter.tokenStandard) {
        where.tokenStandard = filter.tokenStandard;
      }

      const markets = await this.prisma.market.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          _count: {
            select: {
              bets: true,
              claims: true
            }
          }
        }
      });

      this.logger?.info('[MarketService] Markets fetched', {
        totalCount: markets.length,
        filter
      });

      return markets;
    } catch (error) {
      this.logger?.error('[MarketService] Error fetching markets', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filter
      });
      throw new Error('Failed to fetch markets');
    }
  }

  /**
   * Get a single market by ID
   */
  async getMarketById(marketId: string) {
    try {
      this.logger?.info('[MarketService] Fetching market by ID', { marketId });

      const market = await this.prisma.market.findUnique({
        where: {
          marketId
        },
        include: {
          _count: {
            select: {
              bets: true,
              claims: true
            }
          },
          bets: {
            take: 10,
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      if (!market) {
        this.logger?.warn('[MarketService] Market not found', { marketId });
        return null;
      }

      return market;
    } catch (error) {
      this.logger?.error('[MarketService] Error fetching market', {
        marketId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to fetch market: ${marketId}`);
    }
  }

  /**
   * Get expired markets (markets past endTime but not yet resolved)
   */
  async getExpiredMarkets() {
    try {
      this.logger?.info('[MarketService] Fetching expired markets');

      const now = new Date();

      const expiredMarkets = await this.prisma.market.findMany({
        where: {
          endTime: {
            lt: now
          },
          status: 'active'
        },
        orderBy: {
          endTime: 'asc'
        }
      });

      this.logger?.info('[MarketService] Expired markets fetched', {
        count: expiredMarkets.length
      });

      return expiredMarkets;
    } catch (error) {
      this.logger?.error('[MarketService] Error fetching expired markets', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to fetch expired markets');
    }
  }

  /**
   * Get market monitoring data (for admin dashboard)
   */
  async getMarketMonitoring() {
    try {
      this.logger?.info('[MarketService] Fetching market monitoring data');

      const now = new Date();

      const [activeCount, resolvedCount, expiredCount, totalVolume] = await Promise.all([
        this.prisma.market.count({
          where: { status: 'active' }
        }),
        this.prisma.market.count({
          where: { status: 'resolved' }
        }),
        this.prisma.market.count({
          where: {
            endTime: { lt: now },
            status: 'active'
          }
        }),
        this.prisma.market.aggregate({
          _sum: {
            totalPool: true
          }
        })
      ]);

      const monitoring = {
        totalMarkets: activeCount + resolvedCount,
        activeMarkets: activeCount,
        resolvedMarkets: resolvedCount,
        expiredMarkets: expiredCount,
        totalVolume: totalVolume._sum.totalPool?.toFixed(2) || '0.00',
        lastUpdate: new Date().toISOString()
      };

      this.logger?.info('[MarketService] Monitoring data fetched', monitoring);

      return monitoring;
    } catch (error) {
      this.logger?.error('[MarketService] Error fetching monitoring data', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to fetch monitoring data');
    }
  }

  /**
   * Get market statistics
   */
  async getMarketStats(marketId: string) {
    try {
      const stats = await this.prisma.bet.groupBy({
        by: ['outcomeIndex'],
        where: {
          marketId
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      });

      return stats;
    } catch (error) {
      this.logger?.error('[MarketService] Error fetching market stats', {
        marketId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to fetch market stats');
    }
  }
}
