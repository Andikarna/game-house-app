export interface GameLogEntry {
  id: string;
  timestamp: number;
  roundNumber: number;
  phase: string;
  category: 'SETUP' | 'ROLE_ACTION' | 'VOTE' | 'MANIPULATION' | 'RESOLUTION';
  message: string;
  isPrivate: boolean;
  metadata?: any;
}

export class GameEventService {
  private events: GameLogEntry[] = [];
  private publicAnnouncements: string[] = [];

  public logPrivate(
    roundNumber: number,
    phase: string,
    category: GameLogEntry['category'],
    message: string,
    metadata?: any
  ): void {
    const entry: GameLogEntry = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      roundNumber,
      phase,
      category,
      message,
      isPrivate: true,
      metadata,
    };
    this.events.push(entry);
  }

  public logPublic(
    roundNumber: number,
    phase: string,
    category: GameLogEntry['category'],
    message: string,
    metadata?: any
  ): void {
    const entry: GameLogEntry = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      roundNumber,
      phase,
      category,
      message,
      isPrivate: false,
      metadata,
    };
    this.events.push(entry);
    this.publicAnnouncements.push(message);
    if (this.publicAnnouncements.length > 20) {
      this.publicAnnouncements.shift();
    }
  }

  public getRecentPublicLogs(): string[] {
    return [...this.publicAnnouncements];
  }

  public getFullEventLog(): GameLogEntry[] {
    return [...this.events];
  }

  public clear(): void {
    this.events = [];
    this.publicAnnouncements = [];
  }
}
