import { SkillDefinition, SkillType, AvatarId, EmoteDefinition, EmoteCategory, ImpostorCategory } from '../types';
export declare const SERVER_TICK_RATE = 20;
export declare const CLIENT_INPUT_RATE = 20;
export declare const DEFAULT_GAME_DURATION: Record<string, number>;
export interface AvatarOption {
    id: AvatarId;
    name: string;
    subtitle: string;
    color: string;
    badge: string;
    tagline: string;
    spriteBase: string;
}
export declare const PRIMARY_AVATARS: AvatarId[];
export declare function normalizeAvatarId(avatar?: string | null): AvatarId;
export declare const AVATAR_OPTIONS: AvatarOption[];
export declare const SKILL_DEFINITIONS: Record<SkillType, SkillDefinition>;
export declare const PHYSICS_CONFIG: {
    baseClimbSpeed: number;
    baseDescendSpeed: number;
    staminaDepletionClimb: number;
    staminaRegenIdle: number;
    balanceDriftBase: number;
    balanceRecoverySpeed: number;
    slipThreshold: number;
    slipDropDistance: number;
    stunDuration: number;
    energyGainRate: number;
};
export declare const EMOTE_CATEGORIES: {
    id: EmoteCategory;
    label: string;
    badge: string;
}[];
export declare const EMOTE_LIST: EmoteDefinition[];
export interface ImpostorCategoryConfig {
    id: ImpostorCategory;
    name: string;
    icon: string;
    badge: string;
    description: string;
    words: string[];
}
export declare const IMPOSTOR_CATEGORIES: Record<ImpostorCategory, ImpostorCategoryConfig>;
export declare const IMPOSTOR_CAMOUFLAGE_THEMES: Record<ImpostorCategory, string[]>;
export declare const IMPOSTOR_PHASE_TIMERS: {
    roleReveal: number;
    clueTurn: number;
    discussion: number;
    voting: number;
    revote: number;
    impostorGuess: number;
    result: number;
};
export declare const IMPOSTOR_PLAYER_LIMITS: {
    minPlayers: number;
    maxPlayers: number;
};
