/**
 * uno-realtime.ts
 * Replaces the Supabase Realtime channel with a lightweight HTTP long-poll
 * against the Next.js API (backed by MySQL). Clients poll /api/rooms/[code]
 * and a small broadcast bus notifies local tabs instantly for optimistic moves.
 */

export interface UnoSyncPayload {
  type: 'room' | 'state' | 'chat' | 'emote' | 'restart' | 'pg_change';
  room?: any;
  publicState?: any;
  results?: any;
  chatMessage?: any;
  emote?: any;
  stateVersion?: number;
  senderId?: string;
  ts: number;
}

type SyncHandler = (payload: UnoSyncPayload) => void;
type StatusHandler = (connected: boolean) => void;
type LatencyHandler = (ms: number) => void;

class UnoRealtimeManager {
  private activeRoomCode: string | null = null;
  private polling = false;
  private pollAbort: AbortController | null = null;
  private pollIntervalMs = 1000;

  private onSyncHandlers: Set<SyncHandler> = new Set();
  private onStatusHandlers: Set<StatusHandler> = new Set();
  private onLatencyHandlers: Set<LatencyHandler> = new Set();

  private lastStateVersion = 0;
  private lastUpdatedAt = 0;

  public get connected(): boolean {
    return this.polling;
  }

  public onSync(handler: SyncHandler): () => void {
    this.onSyncHandlers.add(handler);
    return () => this.onSyncHandlers.delete(handler);
  }

  public onStatus(handler: StatusHandler): () => void {
    this.onStatusHandlers.add(handler);
    return () => this.onStatusHandlers.delete(handler);
  }

  public onLatency(handler: LatencyHandler): () => void {
    this.onLatencyHandlers.add(handler);
    return () => this.onLatencyHandlers.delete(handler);
  }

  /**
   * Local optimistic broadcast — immediately notifies all local subscribers
   * (same tab / other components) that a move was made, before the server
   * round-trip completes.
   */
  public broadcast(payload: Omit<UnoSyncPayload, 'ts'>): void {
    const full: UnoSyncPayload = { ...payload, ts: Date.now() };
    this.onSyncHandlers.forEach((fn) => fn(full));
  }

  /**
   * Register the active room on the local optimistic bus.
   * Server state is polled adaptively by PollingSocket.pollOnce() to avoid duplicate MySQL/HTTP polling.
   */
  public async connect(roomCode: string, _playerId?: string): Promise<void> {
    const cleanCode = (roomCode || '').trim().toUpperCase().replace(/[^A-Za-z0-9]/g, '');
    if (!cleanCode) return;
    if (this.activeRoomCode === cleanCode) return;

    this.disconnect();
    this.activeRoomCode = cleanCode;
    this.polling = false;
  }

  public disconnect(): void {
    this.polling = false;
    this.pollAbort?.abort();
    this.pollAbort = null;
    this.activeRoomCode = null;
    this.lastStateVersion = 0;
    this.lastUpdatedAt = 0;
    this.onStatusHandlers.forEach((fn) => fn(false));
  }
}

export const unoRealtime = new UnoRealtimeManager();
