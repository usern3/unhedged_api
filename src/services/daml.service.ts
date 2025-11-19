/**
 * DamlService - Canton Ledger API Client
 *
 * Handles:
 * - Reading events from Canton via HTTP JSON API
 * - Offset-based pagination for event streaming
 * - Write operations (create market, resolve market)
 * - Event parsing and normalization
 */

import axios, { AxiosInstance } from 'axios';

export interface CantonConfig {
  httpJsonApiUrl: string;
  ledgerId: string;
  applicationId: string;
  adminToken: string;
  platformAdminParty: string;
  packageId: string;
}

export interface CantonUpdate {
  offset: string;
  updateId: string;
  effectiveAt: string;
  commandId?: string;
  workflowId?: string;
  events: CantonEvent[];
}

export interface CantonEvent {
  created?: {
    contractId: string;
    templateId: string;
    payload: any;
    createdEventBlob?: string;
  };
  archived?: {
    contractId: string;
    templateId: string;
  };
  exercised?: {
    contractId: string;
    templateId: string;
    choice: string;
    choiceArgument: any;
    exerciseResult?: any;
  };
}

export class DamlService {
  private client: AxiosInstance;
  private config: CantonConfig;

  constructor(config: CantonConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.httpJsonApiUrl,
      headers: {
        Authorization: `Bearer ${config.adminToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });
  }

  /**
   * Fetch updates from Canton using offset-based pagination
   * Uses Canton's v2 Update Service
   */
  async fetchUpdates(fromOffset: string, pageSize: number = 100): Promise<CantonUpdate[]> {
    try {
      const response = await this.client.post('/v2/updates', {
        beginOffset: fromOffset,
        endOffset: null, // No end = stream forward
        filter: {
          filtersByParty: {
            [this.config.platformAdminParty]: {
              cumulative: [
                {
                  templateFilters: [{ includeCreatedEventBlob: true }],
                },
              ],
            },
          },
        },
        verbose: true,
      });

      return this.parseUpdates(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Canton API Error:', {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });
      } else {
        console.error('Error fetching Canton updates:', error);
      }
      return [];
    }
  }

  /**
   * Parse Canton API response into standardized update format
   */
  private parseUpdates(data: any): CantonUpdate[] {
    if (!data || !data.updates) {
      return [];
    }

    return data.updates.map((update: any) => ({
      offset: update.offset || update.update_id,
      updateId: update.update_id || update.updateId,
      effectiveAt: update.effective_at || update.effectiveAt || new Date().toISOString(),
      commandId: update.command_id || update.commandId,
      workflowId: update.workflow_id || update.workflowId,
      events: this.parseEvents(update),
    }));
  }

  /**
   * Parse events from Canton update
   */
  private parseEvents(update: any): CantonEvent[] {
    const events: CantonEvent[] = [];

    // Handle transaction updates
    if (update.transaction) {
      const tx = update.transaction;

      // Parse created events
      if (tx.events) {
        for (const event of tx.events) {
          if (event.created) {
            events.push({
              created: {
                contractId: event.created.contract_id || event.created.contractId,
                templateId: event.created.template_id || event.created.templateId,
                payload: event.created.create_arguments || event.created.createArguments || {},
                createdEventBlob: event.created.created_event_blob || event.created.createdEventBlob,
              },
            });
          }

          if (event.archived) {
            events.push({
              archived: {
                contractId: event.archived.contract_id || event.archived.contractId,
                templateId: event.archived.template_id || event.archived.templateId,
              },
            });
          }

          if (event.exercised) {
            events.push({
              exercised: {
                contractId: event.exercised.contract_id || event.exercised.contractId,
                templateId: event.exercised.template_id || event.exercised.templateId,
                choice: event.exercised.choice,
                choiceArgument: event.exercised.choice_argument || event.exercised.choiceArgument || {},
                exerciseResult: event.exercised.exercise_result || event.exercised.exerciseResult,
              },
            });
          }
        }
      }
    }

    return events;
  }

  /**
   * Create market contract (write operation)
   */
  async createMarket(adminParty: string, marketData: any): Promise<any> {
    try {
      const response = await this.client.post('/v2/commands/submit-and-wait', {
        actAs: [adminParty],
        userId: this.config.applicationId,
        commandId: `create-market-${Date.now()}`,
        commands: [
          {
            CreateCommand: {
              templateId: `${this.config.packageId}:MarketEscrow:SpliceTokenMarketEscrow`,
              createArguments: marketData,
            },
          },
        ],
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Failed to create market:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  }

  /**
   * Resolve market (write operation)
   */
  async resolveMarket(
    marketId: string,
    winningOutcomes: number[],
    resolutionReason: string,
    adminParty: string
  ): Promise<any> {
    try {
      const response = await this.client.post('/v2/commands/submit-and-wait', {
        actAs: [adminParty],
        userId: this.config.applicationId,
        commandId: `resolve-market-${marketId}-${Date.now()}`,
        commands: [
          {
            ExerciseCommand: {
              templateId: `${this.config.packageId}:MarketEscrow:SpliceTokenMarketEscrow`,
              contractId: marketId,
              choice: 'ResolveMarket',
              choiceArgument: {
                winningOutcomeIndices: winningOutcomes,
                resolutionReason,
              },
            },
          },
        ],
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Failed to resolve market:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  }

  /**
   * Get active contracts (for initial sync)
   */
  async getActiveContracts(offset: string = '0'): Promise<CantonUpdate[]> {
    try {
      const response = await this.client.post('/v2/state/active-contracts', {
        eventFormat: {
          filtersByParty: {
            [this.config.platformAdminParty]: {
              cumulative: [
                {
                  templateFilters: [{ includeCreatedEventBlob: true }],
                },
              ],
            },
          },
        },
        activeAtOffset: offset,
        verbose: true,
      });

      return this.parseUpdates(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Failed to get active contracts:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      return [];
    }
  }
}
