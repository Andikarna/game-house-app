import { create } from 'zustand';
import { ActiveEmoteEvent, EmoteId } from '@gamehouse/shared';
import { soundManager } from '../components/audio/SoundManager';

interface EmoteStoreState {
  activeEmotes: ActiveEmoteEvent[];
  isPickerOpen: boolean;
  cooldownUntil: number;
  triggerEmote: (emote: ActiveEmoteEvent) => void;
  removeEmote: (id: string) => void;
  clearEmotes: () => void;
  setPickerOpen: (open: boolean) => void;
  startCooldown: (durationMs?: number) => void;
}

export const useEmoteStore = create<EmoteStoreState>((set, get) => ({
  activeEmotes: [],
  isPickerOpen: false,
  cooldownUntil: 0,

  triggerEmote: (emote) => {
    soundManager.playEmote?.(emote.emoteId);
    set((state) => {
      // Keep at most 6 recent floating emotes to prevent visual clutter
      const filtered = state.activeEmotes.filter(e => e.id !== emote.id);
      return {
        activeEmotes: [...filtered.slice(-5), emote],
      };
    });

    // Auto dismiss after 3.2 seconds
    setTimeout(() => {
      get().removeEmote(emote.id);
    }, 3200);
  },

  removeEmote: (id) => {
    set((state) => ({
      activeEmotes: state.activeEmotes.filter((e) => e.id !== id),
    }));
  },

  clearEmotes: () => {
    set({ activeEmotes: [] });
  },

  setPickerOpen: (isPickerOpen) => {
    set({ isPickerOpen });
  },

  startCooldown: (durationMs = 1200) => {
    set({ cooldownUntil: Date.now() + durationMs });
  },
}));
