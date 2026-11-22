import { VoteCard } from '@gamehouse/shared';
import { CardDistributionService } from './CardDistributionService';
import { RoleAbilityService } from './RoleAbilityService';

export interface PlayerSubmission {
  playerId: string;
  cards: VoteCard[];
  submittedAt: number;
}

export class VotingService {
  private submissions: Map<string, PlayerSubmission> = new Map();

  constructor(
    private cardDistributionService: CardDistributionService,
    private roleAbilityService: RoleAbilityService
  ) {}

  public resetRound(): void {
    this.submissions.clear();
  }

  /**
   * Submit voting cards for an eligible player.
   * If cardIds is omitted or invalid, submits all 3 cards currently owned by the player.
   */
  public submitVotes(
    playerId: string,
    cardIds?: string[]
  ): { success: boolean; submittedCards?: VoteCard[]; error?: string } {
    if (!this.roleAbilityService.isPlayerEligibleToVote(playerId)) {
      return { success: false, error: 'Player is not eligible to vote in this round.' };
    }

    if (this.submissions.has(playerId)) {
      return { success: false, error: 'Player has already submitted votes this round.' };
    }

    const availableCards = this.cardDistributionService.getPlayerCards(playerId);
    if (!availableCards || availableCards.length === 0) {
      return { success: false, error: 'Player possesses no vote cards to submit.' };
    }

    let cardsToSubmit: VoteCard[] = [];
    if (cardIds && cardIds.length > 0) {
      // Find matching available cards
      cardsToSubmit = availableCards.filter((c) => cardIds.includes(c.id));
      if (cardsToSubmit.length === 0) {
        cardsToSubmit = [...availableCards];
      }
    } else {
      // Default: submit all 3 cards
      cardsToSubmit = [...availableCards];
    }

    const submission: PlayerSubmission = {
      playerId,
      cards: cardsToSubmit,
      submittedAt: Date.now(),
    };

    this.submissions.set(playerId, submission);
    return { success: true, submittedCards: cardsToSubmit };
  }

  public hasPlayerSubmitted(playerId: string): boolean {
    return this.submissions.has(playerId);
  }

  public getPlayerSubmission(playerId: string): PlayerSubmission | undefined {
    return this.submissions.get(playerId);
  }

  public getAllSubmissions(): Map<string, PlayerSubmission> {
    return new Map(this.submissions);
  }

  /**
   * Checks if all eligible players have submitted.
   */
  public haveAllEligibleSubmitted(playerIds: string[]): boolean {
    for (const playerId of playerIds) {
      const eligible = this.roleAbilityService.isPlayerEligibleToVote(playerId);
      if (eligible && !this.submissions.has(playerId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Auto-submits cards for any eligible player who hasn't submitted yet (timeout or bot).
   */
  public autoSubmitPending(playerIds: string[]): void {
    for (const playerId of playerIds) {
      const eligible = this.roleAbilityService.isPlayerEligibleToVote(playerId);
      if (eligible && !this.submissions.has(playerId)) {
        const cards = this.cardDistributionService.getPlayerCards(playerId);
        this.submissions.set(playerId, {
          playerId,
          cards: [...cards],
          submittedAt: Date.now(),
        });
      }
    }
  }

  /**
   * For testing: set submission directly
   */
  public setTestSubmission(playerId: string, cards: VoteCard[]): void {
    this.submissions.set(playerId, {
      playerId,
      cards: [...cards],
      submittedAt: Date.now(),
    });
  }
}
