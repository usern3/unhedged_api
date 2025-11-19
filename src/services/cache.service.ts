/**
 * CacheService - Redis caching layer
 *
 * Provides:
 * - Get/Set operations with TTL
 * - JSON serialization/deserialization
 * - Optional Redis (graceful degradation)
 * - Cache invalidation
 * - Connection management
 */

import Redis from 'ioredis';

export interface CacheConfig {
  host?: string;
  port?: number;
  password?: string;
  enabled?: boolean;
}

export class CacheService {
  private client: Redis | null = null;
  private enabled: boolean;
  private logger: any;

  constructor(config?: CacheConfig, logger?: any) {
    this.enabled = config?.enabled !== false;
    this.logger = logger;

    if (!this.enabled) {
      this.logger?.info('[CacheService] Cache disabled (will use direct queries)');
      return;
    }

    if (!config?.host) {
      this.logger?.warn('[CacheService] No Redis host provided, caching disabled');
      this.enabled = false;
      return;
    }

    try {
      const redisConfig: any = {
        host: config.host,
        port: config.port || 6379,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3
      };

      if (config.password) {
        redisConfig.password = config.password;
      }

      this.client = new Redis(redisConfig);

      this.client.on('connect', () => {
        this.logger?.info('[CacheService] Connected to Redis', {
          host: config.host,
          port: config.port || 6379
        });
      });

      this.client.on('error', (error) => {
        this.logger?.error('[CacheService] Redis error', {
          error: error.message
        });
      });

      this.client.on('close', () => {
        this.logger?.warn('[CacheService] Redis connection closed');
      });

    } catch (error) {
      this.logger?.error('[CacheService] Failed to initialize Redis', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      this.enabled = false;
      this.client = null;
    }
  }

  /**
   * Get value from cache
   * @param key Cache key
   * @returns Parsed value or null
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);

      if (!value) {
        this.logger?.debug('[CacheService] Cache MISS', { key });
        return null;
      }

      this.logger?.debug('[CacheService] Cache HIT', { key });
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger?.error('[CacheService] Get error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds Time to live in seconds
   */
  async set(key: string, value: any, ttlSeconds: number = 30): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttlSeconds, serialized);

      this.logger?.debug('[CacheService] Cache SET', {
        key,
        ttlSeconds
      });
    } catch (error) {
      this.logger?.error('[CacheService] Set error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete key from cache
   * @param key Cache key
   */
  async del(key: string): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      await this.client.del(key);
      this.logger?.debug('[CacheService] Cache DELETE', { key });
    } catch (error) {
      this.logger?.error('[CacheService] Delete error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete all keys matching a pattern
   * @param pattern Key pattern (e.g., "markets:*")
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        await this.client.del(...keys);
        this.logger?.debug('[CacheService] Cache DELETE pattern', {
          pattern,
          deletedCount: keys.length
        });
      }
    } catch (error) {
      this.logger?.error('[CacheService] Delete pattern error', {
        pattern,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Flush all cache
   */
  async flush(): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      await this.client.flushdb();
      this.logger?.info('[CacheService] Cache flushed');
    } catch (error) {
      this.logger?.error('[CacheService] Flush error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check if cache is enabled and connected
   */
  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger?.info('[CacheService] Connection closed');
    }
  }
}
