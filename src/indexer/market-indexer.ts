/**
 * MarketIndexer - Canton Event Processor
 *
 * Handles:
 * - Streaming events from Canton ledger
 * - Processing create/archive/exercise events
 * - Writing to PostgreSQL via Prisma
 * - Checkpoint-based crash recovery
 * - User statistics updates
 */

import { DamlService, CantonUpdate, CantonEvent } from '../services/daml.service';
import { PrismaClient, Prisma } from '@prisma/client';

export class MarketIndexer {
  private damlService: DamlService;
  private prisma: PrismaClient;
  private isRunning: boolean = false;
  private lastOffset: string = '0';
  private packageId: string;
  private pollIntervalMs: number = 1000;
  private logger: any;

  constructor(damlService: DamlService, prisma: PrismaClient, packageId: string, logger?: any) {
    this.damlService = damlService;
    this.prisma = prisma;
    this.packageId = packageId;
    this.logger = logger;
  }

  async start(): Promise<void> {
    this.log('🚀 Starting market indexer...');
    await this.loadCheckpoint();
    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.processNextBatch();
        await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      } catch (error) {
        this.logError('❌ Indexer error:', error);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Retry after 5s
      }
    }
  }

  async stop(): Promise<void> {
    this.log('🛑 Stopping indexer...');
    this.isRunning = false;
  }

  private async loadCheckpoint(): Promise<void> {
    const checkpoint = await this.prisma.indexerCheckpoint.findUnique({
      where: { serviceName: 'market-indexer' },
    });

    if (checkpoint) {
      this.lastOffset = checkpoint.lastOffset;
      this.log(`📍 Resuming from offset: ${this.lastOffset}`);
    } else {
      this.log('🆕 Starting from beginning');
    }
  }

  private async saveCheckpoint(offset: string): Promise<void> {
    await this.prisma.indexerCheckpoint.upsert({
      where: { serviceName: 'market-indexer' },
      update: { lastOffset: offset, lastUpdated: new Date() },
      create: {
        serviceName: 'market-indexer',
        lastOffset: offset,
      },
    });
  }

  private async processNextBatch(): Promise<void> {
    const updates = await this.damlService.fetchUpdates(this.lastOffset, 100);

    if (updates.length === 0) {
      return; // No new updates
    }

    this.log(`📦 Processing ${updates.length} updates`);

    for (const update of updates) {
      try {
        await this.processUpdate(update);
        this.lastOffset = update.offset;
        await this.saveCheckpoint(update.offset);
      } catch (error) {
        this.logError(`Failed to process update at offset ${update.offset}:`, error);
        // Continue processing other updates
      }
    }
  }

  private async processUpdate(update: CantonUpdate): Promise<void> {
    for (const event of update.events) {
      if (event.created) {
        await this.handleCreated(event.created, update);
      } else if (event.exercised) {
        await this.handleExercised(event.exercised, update);
      } else if (event.archived) {
        await this.handleArchived(event.archived, update);
      }
    }
  }

  private async handleCreated(created: any, update: CantonUpdate): Promise<void> {
    const { templateId, contractId, payload } = created;

    if (this.isMarketTemplate(templateId)) {
      this.log(`✅ Indexing market creation: ${payload.marketId}`);

      await this.prisma.market.upsert({
        where: { marketId: payload.marketId },
        update: {
          contractId,
          totalPool: new Prisma.Decimal(payload.totalPool || 0),
          status: this.normalizeStatus(payload.marketStatus),
          updatedAt: new Date(),
        },
        create: {
          contractId,
          marketId: payload.marketId,
          question: payload.question,
          description: payload.description || null,
          category: payload.category,
          outcomes: payload.outcomes,
          totalPool: new Prisma.Decimal(payload.totalPool || 0),
          status: this.normalizeStatus(payload.marketStatus),
          endTime: new Date(payload.endTime),
          resolutionTime: new Date(payload.resolutionTime),
          createdAt: new Date(payload.createdAt || update.effectiveAt),
          tokenStandard: this.getTokenStandard(templateId),
          minimumBet: payload.minimumBet ? new Prisma.Decimal(payload.minimumBet) : null,
          maximumBet: payload.maximumBet ? new Prisma.Decimal(payload.maximumBet) : null,
          feeRate: payload.feeRate ? new Prisma.Decimal(payload.feeRate) : null,
          timeWeightingEnabled: payload.timeWeightingEnabled || false,
        },
      });
    }
  }

  private async handleExercised(exercised: any, update: CantonUpdate): Promise<void> {
    const { choice, choiceArgument, templateId } = exercised;

    if (choice === 'PlaceBet' || choice === 'PlaceBetWithSpliceToken') {
      await this.indexBetPlaced(choiceArgument, update);
    } else if (choice === 'ResolveMarket') {
      await this.indexMarketResolved(choiceArgument, update);
    } else if (choice === 'ExecuteTokenFirstClaim') {
      await this.indexClaimExecuted(choiceArgument, update);
    }
  }

  private async indexBetPlaced(args: any, update: CantonUpdate): Promise<void> {
    const { bettor, betAmount, outcomeIndex, marketId } = args;
    const amount = new Prisma.Decimal(betAmount);

    this.log(`💰 Indexing bet: ${betAmount} by ${bettor.substring(0, 20)}...`);

    // Insert bet record
    await this.prisma.bet.create({
      data: {
        marketId,
        bettor,
        amount,
        outcomeIndex,
        betTimestamp: new Date(update.effectiveAt),
        transactionId: update.updateId,
      },
    });

    // Update market pool
    await this.prisma.market.update({
      where: { marketId },
      data: {
        totalPool: { increment: amount },
        updatedAt: new Date(),
      },
    });

    // Update or create user record
    await this.prisma.user.upsert({
      where: { partyId: bettor },
      update: {
        totalBets: { increment: 1 },
        totalStaked: { increment: amount },
        lastSeen: new Date(),
      },
      create: {
        username: this.generateUsername(bettor),
        partyId: bettor,
        totalBets: 1,
        totalStaked: amount,
        lastSeen: new Date(),
      },
    });
  }

  private async indexMarketResolved(args: any, update: CantonUpdate): Promise<void> {
    const { winningOutcomeIndices, marketId } = args;

    this.log(`🏁 Indexing market resolution: ${marketId} → outcomes ${winningOutcomeIndices}`);

    // Update market status
    await this.prisma.market.update({
      where: { marketId },
      data: {
        status: 'resolved',
        winningOutcome: winningOutcomeIndices[0],
        updatedAt: new Date(),
      },
    });

    // Create claim records for winners
    const winners = await this.prisma.bet.findMany({
      where: {
        marketId,
        outcomeIndex: { in: winningOutcomeIndices },
      },
      distinct: ['bettor'],
    });

    for (const winner of winners) {
      const claimId = `claim-${marketId}-${winner.bettor}`;

      await this.prisma.claim.upsert({
        where: { claimId },
        update: {
          status: 'pending',
        },
        create: {
          claimId,
          marketId,
          claimer: winner.bettor,
          amount: new Prisma.Decimal(0), // Will be calculated by claims service
          status: 'pending',
          createdAt: new Date(),
        },
      });
    }
  }

  private async indexClaimExecuted(args: any, update: CantonUpdate): Promise<void> {
    const { claimId, claimer, amount } = args;

    this.log(`💸 Indexing claim execution: ${claimId}`);

    // Update claim status
    await this.prisma.claim.update({
      where: { claimId },
      data: {
        status: 'completed',
        amount: new Prisma.Decimal(amount),
        claimedAt: new Date(),
      },
    });

    // Update user statistics
    await this.prisma.user.update({
      where: { partyId: claimer },
      data: {
        totalWinnings: { increment: new Prisma.Decimal(amount) },
        winCount: { increment: 1 },
      },
    });
  }

  private async handleArchived(archived: any, update: CantonUpdate): Promise<void> {
    // Handle contract archival if needed
    // Most market contracts don't get archived, but we can log it
    this.log(`🗑️  Contract archived: ${archived.contractId}`);
  }

  private isMarketTemplate(templateId: string): boolean {
    return (
      templateId.includes('SpliceTokenMarketEscrow') || templateId.includes('CIP56TokenMarketEscrow')
    );
  }

  private getTokenStandard(templateId: string): string {
    return templateId.includes('Splice') ? 'splice-cc' : 'cip-56';
  }

  private normalizeStatus(status: string): string {
    const normalized = status?.toLowerCase();
    if (['active', 'resolved', 'cancelled'].includes(normalized)) {
      return normalized;
    }
    return 'active'; // Default to active
  }

  private generateUsername(partyId: string): string {
    // Generate a username from party ID (use first 20 chars or extract meaningful part)
    const cleanId = partyId.replace(/::/g, '-').substring(0, 20);
    return `user-${cleanId}`;
  }

  private log(message: string, ...args: any[]): void {
    if (this.logger) {
      this.logger.info(message, ...args);
    } else {
      console.log(message, ...args);
    }
  }

  private logError(message: string, error: any): void {
    if (this.logger) {
      this.logger.error(message, error);
    } else {
      console.error(message, error);
    }
  }
}
