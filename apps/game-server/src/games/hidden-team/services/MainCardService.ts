import { MainCard, MAIN_CARDS_DECK, HiddenTeamFaction } from '@gamehouse/shared';

export class MainCardService {
  private activeDeck: MainCard[] = [];
  private candidateCards: MainCard[] = [];
  private activeMainCard: MainCard | null = null;

  constructor() {
    this.resetDeck();
  }

  public resetDeck(): void {
    this.activeDeck = [...MAIN_CARDS_DECK].sort(() => Math.random() - 0.5);
    this.candidateCards = [];
    this.activeMainCard = null;
  }

  /**
   * Generates exactly 2 Main Cards for Role 5 to select from.
   */
  public generateRoundCandidates(): MainCard[] {
    if (this.activeDeck.length < 2) {
      this.resetDeck();
    }

    this.candidateCards = [this.activeDeck.pop()!, this.activeDeck.pop()!];
    this.activeMainCard = null;
    return [...this.candidateCards];
  }

  public getCandidateCards(): MainCard[] {
    return [...this.candidateCards];
  }

  public getActiveMainCard(): MainCard | null {
    return this.activeMainCard ? { ...this.activeMainCard } : null;
  }

  /**
   * Returns active main card with teamFlag hidden for public broadcast during active gameplay.
   */
  public getPublicActiveMainCard(): Omit<MainCard, 'teamFlag'> & { teamFlag?: HiddenTeamFaction } | null {
    if (!this.activeMainCard) return null;
    const { teamFlag, ...rest } = this.activeMainCard;
    return { ...rest };
  }

  /**
   * Role 5 executes selection.
   */
  public selectMainCard(
    selectedCardId: string
  ): { success: boolean; selectedCard?: MainCard; error?: string } {
    const chosen = this.candidateCards.find((c) => c.id === selectedCardId);
    if (!chosen) {
      return { success: false, error: 'Selected card is not among the generated candidates.' };
    }

    this.activeMainCard = chosen;
    this.candidateCards = []; // Discard the other candidate
    return { success: true, selectedCard: chosen };
  }

  /**
   * For automated bot or fallback timeout: auto-pick first candidate.
   */
  public autoSelectFirstCandidate(): MainCard {
    if (this.candidateCards.length === 0) {
      this.generateRoundCandidates();
    }
    const chosen = this.candidateCards[0];
    this.activeMainCard = chosen;
    this.candidateCards = [];
    return chosen;
  }

  /**
   * Test override
   */
  public setTestMainCard(card: MainCard): void {
    this.activeMainCard = { ...card };
    this.candidateCards = [];
  }
}
