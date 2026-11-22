import { VoteCard } from '@gamehouse/shared';
import { VotingService, PlayerSubmission } from './VotingService';

export interface InspectedCardRecord {
  card: VoteCard;
  originalPlayerId: string; // server-side only, never sent to client!
  decision: 'KEEP' | 'DISCARD' | 'PENDING';
}

export class VoteManipulationService {
  private inspectedRecord: InspectedCardRecord | null = null;

  public resetRound(): void {
    this.inspectedRecord = null;
  }

  /**
   * Randomly selects exactly 1 submitted Vote Card from all eligible submissions.
   * Server-authoritative randomization.
   */
  public prepareRandomInspection(votingService: VotingService): VoteCard | null {
    const submissions = votingService.getAllSubmissions();
    const candidateList: Array<{ card: VoteCard; playerId: string }> = [];

    submissions.forEach((sub, playerId) => {
      sub.cards.forEach((card) => {
        candidateList.push({ card, playerId });
      });
    });

    if (candidateList.length === 0) {
      this.inspectedRecord = null;
      return null;
    }

    const randomIndex = Math.floor(Math.random() * candidateList.length);
    const chosen = candidateList[randomIndex];

    this.inspectedRecord = {
      card: chosen.card,
      originalPlayerId: chosen.playerId,
      decision: 'PENDING',
    };

    return chosen.card;
  }

  public getInspectedCard(): VoteCard | null {
    return this.inspectedRecord ? { ...this.inspectedRecord.card } : null;
  }

  public getInspectionDecision(): 'KEEP' | 'DISCARD' | 'PENDING' {
    return this.inspectedRecord ? this.inspectedRecord.decision : 'PENDING';
  }

  /**
   * Role 4 records decision (KEEP or DISCARD).
   */
  public submitDecision(
    decision: 'KEEP' | 'DISCARD'
  ): { success: boolean; decision: 'KEEP' | 'DISCARD'; error?: string } {
    if (!this.inspectedRecord) {
      return { success: false, decision: 'KEEP', error: 'No card currently under inspection.' };
    }

    this.inspectedRecord.decision = decision;
    return { success: true, decision };
  }

  /**
   * In case of timeout or bot, default decision is KEEP.
   */
  public autoResolveDecision(): 'KEEP' | 'DISCARD' {
    if (!this.inspectedRecord) return 'KEEP';
    if (this.inspectedRecord.decision === 'PENDING') {
      this.inspectedRecord.decision = 'KEEP';
    }
    return this.inspectedRecord.decision;
  }

  /**
   * Returns discarded card if decision was DISCARD, or null.
   */
  public getDiscardedCard(): VoteCard | null {
    if (this.inspectedRecord && this.inspectedRecord.decision === 'DISCARD') {
      return { ...this.inspectedRecord.card };
    }
    return null;
  }

  /**
   * For testing: set inspection directly
   */
  public setTestInspection(card: VoteCard, playerId: string, decision: 'KEEP' | 'DISCARD'): void {
    this.inspectedRecord = {
      card,
      originalPlayerId: playerId,
      decision,
    };
  }
}
