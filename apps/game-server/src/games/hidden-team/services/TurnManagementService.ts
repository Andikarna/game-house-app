export class TurnManagementService {
  private currentSlotIndex: number = 0; // 0 to 5, corresponding to slot 1 to 6
  private actedSlots: Set<number> = new Set();
  private turnSlots: string[] = []; // player IDs in slot 1..6

  public initialize(turnSlots: string[]): void {
    this.turnSlots = [...turnSlots];
    this.currentSlotIndex = 0;
    this.actedSlots.clear();
  }

  public resetRound(): void {
    this.currentSlotIndex = 0;
    this.actedSlots.clear();
  }

  public getCurrentSlotNumber(): number {
    return this.currentSlotIndex + 1; // 1 to 6
  }

  public getCurrentPlayerId(): string {
    return this.turnSlots[this.currentSlotIndex] || '';
  }

  public hasCurrentSlotActed(): boolean {
    return this.actedSlots.has(this.currentSlotIndex);
  }

  public markCurrentSlotActed(): void {
    this.actedSlots.add(this.currentSlotIndex);
  }

  public advanceSlot(): { isPhaseComplete: boolean; nextSlotNumber: number; nextPlayerId: string } {
    this.actedSlots.add(this.currentSlotIndex);
    this.currentSlotIndex++;

    if (this.currentSlotIndex >= 6) {
      return {
        isPhaseComplete: true,
        nextSlotNumber: 6,
        nextPlayerId: '',
      };
    }

    return {
      isPhaseComplete: false,
      nextSlotNumber: this.currentSlotIndex + 1,
      nextPlayerId: this.turnSlots[this.currentSlotIndex],
    };
  }

  public isSlotSequenceComplete(): boolean {
    return this.currentSlotIndex >= 6;
  }
}
