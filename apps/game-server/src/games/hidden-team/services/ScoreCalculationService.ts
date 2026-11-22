import {
  HiddenTeamFaction,
  MainCard,
  HiddenTeamRoundResult,
  HiddenTeamMatchResult,
  HiddenTeamPlayerIdentityReveal,
} from '@gamehouse/shared';
import { VotingService } from './VotingService';
import { RoleAbilityService } from './RoleAbilityService';
import { VoteManipulationService } from './VoteManipulationService';
import { RoleAssignmentService } from './RoleAssignmentService';

export class ScoreCalculationService {
  private roundWins: Record<HiddenTeamFaction, number> = {
    RED: 0,
    BLUE: 0,
    NEUTRAL: 0,
  };
  private roundHistory: HiddenTeamRoundResult[] = [];

  public resetMatch(): void {
    this.roundWins = { RED: 0, BLUE: 0, NEUTRAL: 0 };
    this.roundHistory = [];
  }

  public getRoundWins(): Record<HiddenTeamFaction, number> {
    return { ...this.roundWins };
  }

  public getRoundHistory(): HiddenTeamRoundResult[] {
    return [...this.roundHistory];
  }

  /**
   * Authoritative round vote calculation and winner resolution.
   */
  public resolveRound(
    roundNumber: number,
    activeMainCard: MainCard,
    votingService: VotingService,
    roleAbilityService: RoleAbilityService,
    voteManipulationService: VoteManipulationService
  ): HiddenTeamRoundResult {
    const submissions = votingService.getAllSubmissions();
    const role3Bonus = roleAbilityService.getRole3Bonus();
    const discardedCard = voteManipulationService.getDiscardedCard();

    const originalVotes: Record<HiddenTeamFaction, number> = { RED: 0, BLUE: 0, NEUTRAL: 0 };
    const bonusVotes: Record<HiddenTeamFaction, number> = { RED: 0, BLUE: 0, NEUTRAL: 0 };
    const discardedVotes: Record<HiddenTeamFaction, number> = { RED: 0, BLUE: 0, NEUTRAL: 0 };

    // 1. Calculate original counts and Role 3 bonuses per submitted card
    submissions.forEach((sub, playerId) => {
      const isTargetOfBonus = Boolean(role3Bonus && role3Bonus.targetPlayerId === playerId);
      const bonusWeight = isTargetOfBonus ? role3Bonus!.bonusWeightPerCard : 0;

      sub.cards.forEach((card) => {
        originalVotes[card.faction]++;
        if (bonusWeight > 0) {
          bonusVotes[card.faction] += bonusWeight;
        }
      });
    });

    // 2. Subtract discarded card if Role 4 chose DISCARD
    if (discardedCard) {
      discardedVotes[discardedCard.faction]++;
    }

    // 3. Calculate final valid vote counts
    const finalVotes: Record<HiddenTeamFaction, number> = {
      RED: Math.max(0, originalVotes.RED + bonusVotes.RED - discardedVotes.RED),
      BLUE: Math.max(0, originalVotes.BLUE + bonusVotes.BLUE - discardedVotes.BLUE),
      NEUTRAL: Math.max(0, originalVotes.NEUTRAL + bonusVotes.NEUTRAL - discardedVotes.NEUTRAL),
    };

    // 4. Determine round winner based on Main Card Flag and strictly highest vote rule
    const matchingFlag = activeMainCard.teamFlag;
    let winningTeam: HiddenTeamFaction | null = null;
    let isTieOrNoWin = true;
    let reason = '';

    const matchingVotes = finalVotes[matchingFlag];
    const otherFactions = (['RED', 'BLUE', 'NEUTRAL'] as HiddenTeamFaction[]).filter(
      (f) => f !== matchingFlag
    );
    const highestOtherVotes = Math.max(finalVotes[otherFactions[0]], finalVotes[otherFactions[1]]);

    if (matchingVotes > highestOtherVotes) {
      // Strictly higher than the other two teams
      winningTeam = matchingFlag;
      isTieOrNoWin = false;
      this.roundWins[matchingFlag]++;
      reason = `Faksi ${matchingFlag} menang! Suara (${matchingVotes}) melebihi tim lawan dan selaras dengan panji ${matchingFlag}.`;
    } else if (matchingVotes === highestOtherVotes) {
      isTieOrNoWin = true;
      winningTeam = null;
      reason = `Ronde seri atau seimbang. Suara panji ${matchingFlag} (${matchingVotes}) tidak melampaui suara tertinggi lawan (${highestOtherVotes}). Tidak ada poin ronde.`;
    } else {
      isTieOrNoWin = true;
      winningTeam = null;
      reason = `Suara faksi ${matchingFlag} (${matchingVotes}) kalah dari suara tertinggi lawan (${highestOtherVotes}). Tidak ada poin ronde.`;
    }

    const roundResult: HiddenTeamRoundResult = {
      roundNumber,
      activeMainCard: { ...activeMainCard }, // Team flag is now public at round resolution
      originalVotes,
      bonusVotes,
      discardedVotes,
      finalVotes,
      winningTeam,
      isTieOrNoWin,
      reason,
      roundWinsSoFar: { ...this.roundWins },
    };

    this.roundHistory.push(roundResult);
    return roundResult;
  }

  /**
   * Final Match Resolution after total rounds completed.
   */
  public resolveMatch(
    totalRounds: number,
    roleAssignmentService: RoleAssignmentService
  ): HiddenTeamMatchResult {
    const scores = this.roundWins;
    const factions: HiddenTeamFaction[] = ['RED', 'BLUE', 'NEUTRAL'];

    let maxWins = -1;
    let topFactions: HiddenTeamFaction[] = [];

    factions.forEach((f) => {
      const wins = scores[f];
      if (wins > maxWins) {
        maxWins = wins;
        topFactions = [f];
      } else if (wins === maxWins && wins > 0) {
        topFactions.push(f);
      }
    });

    let winner: HiddenTeamFaction | 'DRAW' = 'DRAW';
    // If topFactions has exactly 1 winner and maxWins > 0, they win
    if (topFactions.length === 1 && maxWins > 0) {
      winner = topFactions[0];
    } else {
      winner = 'DRAW';
    }

    // Build reveal identities
    const playerIdentities: HiddenTeamPlayerIdentityReveal[] = roleAssignmentService
      .getAllPlayerData()
      .map((p) => ({
        playerId: p.playerId,
        nickname: p.playerId, // will be mapped with nickname in game engine
        avatar: 'budi',
        slotNumber: p.slotNumber,
        team: p.team,
        originalRole: p.originalRole,
        finalRole: p.currentRole,
      }));

    return {
      winner,
      finalRoundWins: { ...this.roundWins },
      totalRounds,
      playerIdentities,
      roundHistory: [...this.roundHistory],
    };
  }

  /**
   * Test override
   */
  public overrideRoundWins(wins: Record<HiddenTeamFaction, number>): void {
    this.roundWins = { ...wins };
  }
}
