import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

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

class UnoRealtimeManager {
  private channel: RealtimeChannel | null = null;
  private activeRoomCode: string | null = null;
  private isSubscribed: boolean = false;
  private onSyncHandlers: Set<(payload: UnoSyncPayload) => void> = new Set();
  private onLatencyHandlers: Set<(ms: number) => void> = new Set();

  public get connected(): boolean {
    return this.isSubscribed && Boolean(this.channel);
  }

  public onSync(handler: (payload: UnoSyncPayload) => void): () => void {
    this.onSyncHandlers.add(handler);
    return () => {
      this.onSyncHandlers.delete(handler);
    };
  }

  public onLatency(handler: (ms: number) => void): () => void {
    this.onLatencyHandlers.add(handler);
    return () => {
      this.onLatencyHandlers.delete(handler);
    };
  }

  public connect(roomCode: string): void {
    const cleanCode = (roomCode || '').trim().toUpperCase().replace(/[^A-Za-z0-9]/g, '');
    if (!cleanCode) return;
    if (this.activeRoomCode === cleanCode && this.channel) return;

    this.disconnect();
    this.activeRoomCode = cleanCode;

    try {
      const sb = getSupabaseClient();
      const ch = sb.channel(`uno_room:${cleanCode}`, {
        config: {
          broadcast: { self: false, ack: false },
        },
      });

      ch.on('broadcast', { event: 'uno:sync' }, ({ payload }) => {
        if (!payload) return;
        const sync = payload as UnoSyncPayload;
        if (sync.ts) {
          const estimatedOneWay = Math.max(8, Math.min(250, Date.now() - sync.ts));
          this.onLatencyHandlers.forEach((fn) => fn(estimatedOneWay));
        }
        this.onSyncHandlers.forEach((fn) => fn(sync));
      });

      ch.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'uno_rooms',
          filter: `code=eq.${cleanCode}`,
        },
        (payload) => {
          const nextRow = payload.new as any;
          this.onSyncHandlers.forEach((fn) =>
            fn({
              type: 'pg_change',
              stateVersion: Number(nextRow?.state_version || 0),
              ts: Number(nextRow?.updated_at || Date.now()),
            })
          );
        }
      );

      ch.subscribe((status) => {
        this.isSubscribed = status === 'SUBSCRIBED';
      });

      this.channel = ch;
    } catch (err) {
      console.warn('[UnoRealtime] Failed to connect channel:', err);
    }
  }

  public broadcast(payload: Omit<UnoSyncPayload, 'ts'>): void {
    if (!this.channel || !this.isSubscribed) return;
    try {
      this.channel.send({
        type: 'broadcast',
        event: 'uno:sync',
        payload: {
          ...payload,
          ts: Date.now(),
        },
      });
    } catch {}
  }

  public disconnect(): void {
    if (this.channel) {
      try {
        const sb = getSupabaseClient();
        sb.removeChannel(this.channel);
      } catch {}
      this.channel = null;
    }
    this.isSubscribed = false;
    this.activeRoomCode = null;
  }
}

export const unoRealtime = new UnoRealtimeManager();
