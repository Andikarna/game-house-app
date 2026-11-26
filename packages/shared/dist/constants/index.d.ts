import { SkillDefinition, SkillType, AvatarId, GameId, SnakeLink, LadderLink, EmoteDefinition, EmoteCategory, ImpostorCategory, HiddenTeamRole, MainCard } from '../types';
export type GameAvailabilityStatus = 'playable' | 'maintenance' | 'coming-soon';
export declare const GAME_AVAILABILITY: Record<GameId, {
    status: GameAvailabilityStatus;
    label: string;
    reason?: string;
}>;
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
export declare const HIDDEN_TEAM_CONFIG: {
    playerCount: number;
    minPlayers: number;
    maxPlayers: number;
    defaultRounds: number;
    allowedRounds: number[];
    defaultRole2VoteProbability: number;
    defaultRole3BonusWeight: number;
    voteCardsPerRound: number;
    defaultTeamDistribution: {
        RED: number;
        BLUE: number;
        NEUTRAL: number;
    };
};
export interface RoleInfo {
    id: HiddenTeamRole;
    number: number;
    name: string;
    tagline: string;
    description: string;
    badge: string;
    icon: string;
    color: string;
}
export declare const HIDDEN_TEAM_ROLES_INFO: Record<HiddenTeamRole, RoleInfo>;
export declare const HIDDEN_TEAM_PHASE_TIMERS: {
    mainCardSelection: number;
    actionPhaseSlot: number;
    votingSubmission: number;
    voteManipulation: number;
    roundResolution: number;
    matchFinished: number;
};
export declare const MAIN_CARDS_DECK: MainCard[];
export declare const SNAKE_LADDER_LADDERS: LadderLink[];
export declare const SNAKE_LADDER_SNAKES: SnakeLink[];
