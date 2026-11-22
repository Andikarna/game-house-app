import { VoteCard, HiddenTeamFaction } from '@gamehouse/shared';

export class CardDistributionService {
  private playerCards: Map<string, VoteCard[]> = new Map();

  /**
   * Generates and distributes 3 random Vote Cards to each player for the new round.
   * Completely resets any previous round cards.
   */
  public distributeRoundCards(playerIds: string[]): Map<string, VoteCard[]> {
    this.playerCards.clear();
    const factions: HiddenTeamFaction[] = ['RED', 'BLUE', 'NEUTRAL'];

    for (const playerId of playerIds) {
      const cards: VoteCard[] = [];
      for (let i = 0; i < 3; i++) {
        const faction = factions[Math.floor(Math.random() * factions.length)];
        cards.push(this.createVoteCard(faction));
      }
      this.playerCards.set(playerId, cards);
    }

    return new Map(this.playerCards);
  }

  /**
   * For testing or controlled scenarios: manually set cards for a player.
   */
  public setPlayerCards(playerId: string, cards: VoteCard[]): void {
    this.playerCards.set(playerId, [...cards]);
  }

  public getPlayerCards(playerId: string): VoteCard[] {
    return this.playerCards.get(playerId) || [];
  }

  public getAllCards(): Map<string, VoteCard[]> {
    return new Map(this.playerCards);
  }

  /**
   * ROLE 6 — FULL VOTE CARD SWAPPER
   * Atomically exchanges the entire 3-card collection between two distinct players.
   */
  public swapAllVoteCards(
    playerAId: string,
    playerBId: string
  ): { success: boolean; error?: string } {
    if (playerAId === playerBId) {
      return { success: false, error: 'Cannot swap vote cards with the same player.' };
    }

    const cardsA = this.playerCards.get(playerAId);
    const cardsB = this.playerCards.get(playerBId);

    if (!cardsA || !cardsB) {
      return { success: false, error: 'One or both players have no cards to swap.' };
    }

    if (cardsA.length !== 3 || cardsB.length !== 3) {
      return { success: false, error: 'Both players must possess exactly 3 cards to perform a full swap.' };
    }

    // Atomic exchange
    const tempA = [...cardsA];
    this.playerCards.set(playerAId, [...cardsB]);
    this.playerCards.set(playerBId, tempA);

    return { success: true };
  }

  public resetRound(): void {
    this.playerCards.clear();
  }

  private createVoteCard(faction: HiddenTeamFaction): VoteCard {
    const cardId = `vc_${faction.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const titles: Record<HiddenTeamFaction, string> = {
      RED: 'Kartu Mandat Merah',
      BLUE: 'Kartu Mandat Biru',
      NEUTRAL: 'Kartu Mandat Netral',
    };
    const descriptions: Record<HiddenTeamFaction, string> = {
      RED: 'Memberikan +1 suara untuk kemenangan faksi RED pada ronde ini.',
      BLUE: 'Memberikan +1 suara untuk kemenangan faksi BLUE pada ronde ini.',
      NEUTRAL: 'Memberikan +1 suara untuk kemenangan faksi NEUTRAL pada ronde ini.',
    };

    return {
      id: cardId,
      faction,
      title: titles[faction],
      description: descriptions[faction],
    };
  }
}
