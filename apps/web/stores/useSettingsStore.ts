import { create } from 'zustand';
import { AvatarId } from '@gamehouse/shared';
import { soundManager } from '../components/audio/SoundManager';

interface SettingsState {
  nickname: string;
  avatar: AvatarId;
  isMuted: boolean;
  volume: number;
  setNickname: (name: string) => void;
  setAvatar: (avatar: AvatarId) => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
}

const getRandomNickname = () => {
  const adjectives = ['Swift', 'Brave', 'Ninja', 'Turbo', 'Hyper', 'Mighty', 'Lucky', 'Jago'];
  const nouns = ['Climber', 'Panjat', 'Garuda', 'Hero', 'Juara', 'Falcon', 'Striker', 'Star'];
  const randomNum = Math.floor(10 + Math.random() * 90);
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${randomNum}`;
};

export const useSettingsStore = create<SettingsState>((set, get) => {
  // Safe initial defaults
  const initialNickname = typeof window !== 'undefined' 
    ? localStorage.getItem('gh_nickname') || getRandomNickname()
    : 'Climber77';
    
  const initialAvatar = (typeof window !== 'undefined'
    ? (localStorage.getItem('gh_avatar') as AvatarId) || 'climber-red'
    : 'climber-red') as AvatarId;

  return {
    nickname: initialNickname,
    avatar: initialAvatar,
    isMuted: false,
    volume: 0.7,
    setNickname: (nickname: string) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('gh_nickname', nickname);
      }
      set({ nickname });
    },
    setAvatar: (avatar: AvatarId) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('gh_avatar', avatar);
      }
      set({ avatar });
    },
    toggleMute: () => {
      const nextMuted = !get().isMuted;
      soundManager.setMuted(nextMuted);
      if (!nextMuted) {
        soundManager.startBGM();
      }
      set({ isMuted: nextMuted });
    },
    setVolume: (volume: number) => {
      soundManager.setVolume(volume);
      set({ volume });
    },
  };
});
