import {
  HiddenTeamRole,
  HiddenTeamActionPayload,
} from '@gamehouse/shared';
import { RoleAssignmentService } from './RoleAssignmentService';
import { CardDistributionService } from './CardDistributionService';

export interface Role2Eligibility {
  playerId: string;
  canVote: boolean;
  rolledAt: number;
}

export interface Role3Bonus {
  targetPlayerId: string;
  sourcePlayerId: string;
  bonusWeightPerCard: number;
}

export class RoleAbilityService {
  private role2Eligibility: Map<string, Role2Eligibility> = new Map();
  private role3Bonus: Role3Bonus | null = null;
  private role2WinProbability: number = 0.5;
  private role3DefaultBonus: number = 1;

  constructor(
    private roleAssignmentService: RoleAssignmentService,
    private cardDistributionService: CardDistributionService
  ) {}

  public setRole2Probability(probability: number): void {
    this.role2WinProbability = Math.max(0, Math.min(1, probability));
  }

  public setRole3DefaultBonus(bonus: number): void {
    this.role3DefaultBonus = Math.max(1, bonus);
  }

  public resetRound(): void {
    this.role2Eligibility.clear();
    this.role3Bonus = null;
  }

  /**
   * ROLE 2 — Automatic or manual roll for current owner.
   * If not rolled manually, rolls automatically so eligibility is always known.
   */
  public rollRole2Eligibility(playerId: string): Role2Eligibility {
    // If already rolled for this player in current round, return existing
    const existing = this.role2Eligibility.get(playerId);
    if (existing) return existing;

    const canVote = Math.random() < this.role2WinProbability;
    const result: Role2Eligibility = {
      playerId,
      canVote,
      rolledAt: Date.now(),
    };
    this.role2Eligibility.set(playerId, result);
    return result;
  }

  public getRole2Eligibility(playerId: string): Role2Eligibility | undefined {
    return this.role2Eligibility.get(playerId);
  }

  public isPlayerEligibleToVote(playerId: string): boolean {
    const role = this.roleAssignmentService.getCurrentRole(playerId);
    // If the player currently holds Role 2, check eligibility roll
    if (role === 'ROLE_2_ROLLER') {
      let roll = this.role2Eligibility.get(playerId);
      if (!roll) {
        roll = this.rollRole2Eligibility(playerId);
      }
      return roll.canVote;
    }
    // All other roles can vote by default
    return true;
  }

  /**
   * Execute ability action during ACTION_PHASE.
   */
  public executeAction(
    requesterPlayerId: string,
    action: HiddenTeamActionPayload
  ): { success: boolean; message?: string; error?: string } {
    if (action.action === 'pass') {
      return { success: true, message: 'Player passed their action turn.' };
    }

    const currentRole = this.roleAssignmentService.getCurrentRole(requesterPlayerId);
    if (!currentRole) {
      return { success: false, error: 'Player role not found.' };
    }

    switch (action.action) {
      case 'role_1_swap': {
        if (currentRole !== 'ROLE_1_SWAPPER') {
          return { success: false, error: 'Only the owner of Role 1 can swap roles.' };
        }
        if (!action.targetPlayerIdA || !action.targetPlayerIdB) {
          return { success: false, error: 'Two target players must be specified for Role 1 swap.' };
        }
        if (action.targetPlayerIdA === action.targetPlayerIdB) {
          return { success: false, error: 'Target players must be distinct.' };
        }

        const swapResult = this.roleAssignmentService.swapRoles(
          action.targetPlayerIdA,
          action.targetPlayerIdB
        );
        if (!swapResult.success) {
          return { success: false, error: swapResult.error || 'Failed to swap roles.' };
        }

        return {
          success: true,
          message: 'Role ability swap completed atomically and secretly.',
        };
      }

      case 'role_2_roll': {
        if (currentRole !== 'ROLE_2_ROLLER') {
          return { success: false, error: 'Only the owner of Role 2 can roll voting eligibility.' };
        }
        const roll = this.rollRole2Eligibility(requesterPlayerId);
        return {
          success: true,
          message: `Eligibility rolled: ${roll.canVote ? 'CAN VOTE' : 'CANNOT VOTE'}.`,
        };
      }

      case 'role_3_multiply': {
        if (currentRole !== 'ROLE_3_MULTIPLIER') {
          return { success: false, error: 'Only the owner of Role 3 can apply vote bonus.' };
        }
        if (!action.targetPlayerId) {
          return { success: false, error: 'Target player required for Role 3.' };
        }

        this.role3Bonus = {
          targetPlayerId: action.targetPlayerId,
          sourcePlayerId: requesterPlayerId,
          bonusWeightPerCard: this.role3DefaultBonus,
        };

        return {
          success: true,
          message: 'Vote bonus applied secretly to target player.',
        };
      }

      case 'role_6_swap_cards': {
        if (currentRole !== 'ROLE_6_CARD_SWAPPER') {
          return { success: false, error: 'Only the owner of Role 6 can swap vote card collections.' };
        }
        if (!action.targetPlayerIdA || !action.targetPlayerIdB) {
          return { success: false, error: 'Two target players must be specified for Role 6 swap.' };
        }
        if (action.targetPlayerIdA === action.targetPlayerIdB) {
          return { success: false, error: 'Target players must be distinct.' };
        }

        const swapResult = this.cardDistributionService.swapAllVoteCards(
          action.targetPlayerIdA,
          action.targetPlayerIdB
        );
        if (!swapResult.success) {
          return { success: false, error: swapResult.error || 'Failed to swap vote cards.' };
        }

        return {
          success: true,
          message: 'All 3 vote cards swapped atomically and secretly between players.',
        };
      }

      default:
        return { success: false, error: `Invalid action for role ${currentRole}.` };
    }
  }

  public getRole3Bonus(): Role3Bonus | null {
    return this.role3Bonus;
  }

  /**
   * For testing: force set Role 2 eligibility
   */
  public overrideRole2Eligibility(playerId: string, canVote: boolean): void {
    this.role2Eligibility.set(playerId, {
      playerId,
      canVote,
      rolledAt: Date.now(),
    });
  }

  /**
   * For testing: force set Role 3 bonus
   */
  public overrideRole3Bonus(targetPlayerId: string, bonusWeight: number = 1): void {
    this.role3Bonus = {
      targetPlayerId,
      sourcePlayerId: 'test_source',
      bonusWeightPerCard: bonusWeight,
    };
  }
}
