"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMOTE_LIST = exports.EMOTE_CATEGORIES = exports.PHYSICS_CONFIG = exports.SKILL_DEFINITIONS = exports.AVATAR_OPTIONS = exports.PRIMARY_AVATARS = exports.DEFAULT_GAME_DURATION = exports.CLIENT_INPUT_RATE = exports.SERVER_TICK_RATE = void 0;
exports.normalizeAvatarId = normalizeAvatarId;
exports.SERVER_TICK_RATE = 20; // 20 ticks per second (50ms interval)
exports.CLIENT_INPUT_RATE = 20; // client sends input every 50ms
exports.DEFAULT_GAME_DURATION = {
    'classic-race': 180, // 3 minutes
    'survival-climb': 120, // 2 minutes
    'skill-battle': 150, // 2.5 minutes
    'classic': 600, // 10 minutes
    'quick': 300, // 5 minutes
};
exports.PRIMARY_AVATARS = [
    'budi',
    'ujang',
    'rara',
    'koko',
    'jaya',
    'bayu',
    'siti',
    'jago',
];
function normalizeAvatarId(avatar) {
    if (!avatar)
        return 'budi';
    if (avatar === 'climber-red')
        return 'budi';
    if (avatar === 'climber-blue')
        return 'rara';
    if (avatar === 'climber-green')
        return 'koko';
    if (avatar === 'climber-yellow')
        return 'ujang';
    if (avatar === 'climber-purple')
        return 'siti';
    if (avatar === 'climber-orange')
        return 'jaya';
    return avatar;
}
exports.AVATAR_OPTIONS = [
    {
        id: 'budi',
        name: 'Budi',
        subtitle: 'Semangat Merah Putih',
        color: '#EF4444',
        badge: '🇮🇩',
        tagline: 'Kaos putih & ikat kepala merah putih legendaris',
        spriteBase: '/assets/characters/budi',
    },
    {
        id: 'ujang',
        name: 'Ujang',
        subtitle: 'Jawara Madura',
        color: '#DC2626',
        badge: '🥊',
        tagline: 'Kaos loreng merah-putih & sarung tangan cengkeram',
        spriteBase: '/assets/characters/ujang',
    },
    {
        id: 'rara',
        name: 'Rara',
        subtitle: 'Gadis Visor Sporty',
        color: '#06B6D4',
        badge: '⚡',
        tagline: 'Kuncir kuda dinamis & visor sporty cyan',
        spriteBase: '/assets/characters/rara',
    },
    {
        id: 'koko',
        name: 'Koko',
        subtitle: 'Si Ceria Baju Hijau',
        color: '#10B981',
        badge: '🌿',
        tagline: 'Baju motif hijau tropis & topi visor oranye',
        spriteBase: '/assets/characters/koko',
    },
    {
        id: 'jaya',
        name: 'Jaya',
        subtitle: 'Rompi Oranye Energik',
        color: '#F97316',
        badge: '🔥',
        tagline: 'Rambut spike & rompi oranye penuh tenaga',
        spriteBase: '/assets/characters/jaya',
    },
    {
        id: 'bayu',
        name: 'Bayu',
        subtitle: 'Atlet Kilat Lincah',
        color: '#EA580C',
        badge: '🌪️',
        tagline: 'Refleks cepat & gaya pemanjat akrobatik',
        spriteBase: '/assets/characters/bayu',
    },
    {
        id: 'siti',
        name: 'Siti',
        subtitle: 'Caping Bambu & Cyber Neko',
        color: '#8B5CF6',
        badge: '🎧',
        tagline: 'Topi caping bambu & gamer headset telinga kucing',
        spriteBase: '/assets/characters/siti',
    },
    {
        id: 'jago',
        name: 'Jago',
        subtitle: 'Sang Legenda Sabuk Emas',
        color: '#F59E0B',
        badge: '👑',
        tagline: 'Jubah merah, kacamata hitam & sabuk emas juara',
        spriteBase: '/assets/characters/jago',
    },
    // Backward compatibility aliases for existing games/data
    {
        id: 'climber-red',
        name: 'Budi (Red)',
        subtitle: 'Semangat Merah Putih',
        color: '#EF4444',
        badge: '🇮🇩',
        tagline: 'Kaos putih & ikat kepala merah putih',
        spriteBase: '/assets/characters/budi',
    },
    {
        id: 'climber-blue',
        name: 'Rara (Blue)',
        subtitle: 'Gadis Visor Sporty',
        color: '#06B6D4',
        badge: '⚡',
        tagline: 'Kuncir kuda & visor sporty cyan',
        spriteBase: '/assets/characters/rara',
    },
    {
        id: 'climber-green',
        name: 'Koko (Green)',
        subtitle: 'Si Ceria Baju Hijau',
        color: '#10B981',
        badge: '🌿',
        tagline: 'Baju hijau tropis & topi visor',
        spriteBase: '/assets/characters/koko',
    },
    {
        id: 'climber-yellow',
        name: 'Ujang (Yellow)',
        subtitle: 'Jawara Madura',
        color: '#DC2626',
        badge: '🥊',
        tagline: 'Kaos loreng merah-putih',
        spriteBase: '/assets/characters/ujang',
    },
    {
        id: 'climber-purple',
        name: 'Siti (Purple)',
        subtitle: 'Caping & Cyber Neko',
        color: '#8B5CF6',
        badge: '🎧',
        tagline: 'Caping bambu & cyber neko headset',
        spriteBase: '/assets/characters/siti',
    },
    {
        id: 'climber-orange',
        name: 'Jaya (Orange)',
        subtitle: 'Rompi Oranye Energik',
        color: '#F97316',
        badge: '🔥',
        tagline: 'Rompi oranye penuh tenaga',
        spriteBase: '/assets/characters/jaya',
    },
];
exports.SKILL_DEFINITIONS = {
    iron_grip: {
        type: 'iron_grip',
        name: 'Iron Grip',
        description: 'Immunity to slipping and boosts grip strength by 50% for 5s.',
        cooldownSeconds: 15,
        durationSeconds: 5,
        icon: 'Shield',
        keybind: 'Q'
    },
    super_climb: {
        type: 'super_climb',
        name: 'Super Climb',
        description: 'Doubles climbing speed for 4s, but consumes 1.5x stamina.',
        cooldownSeconds: 20,
        durationSeconds: 4,
        icon: 'Zap',
        keybind: 'E'
    },
    recovery: {
        type: 'recovery',
        name: 'Quick Recovery',
        description: 'Instantly restores +30 Stamina and cleanses stun / daze.',
        cooldownSeconds: 25,
        durationSeconds: 0,
        icon: 'RefreshCw',
        keybind: 'Space'
    },
    banana_trap: {
        type: 'banana_trap',
        name: 'Banana Trap',
        description: 'Drops a slippery peel behind you. Opponents touching it slip down 10%.',
        cooldownSeconds: 25,
        durationSeconds: 15, // Trap stays on pole for 15s
        icon: 'AlertTriangle',
        keybind: 'Q'
    },
    wind_boost: {
        type: 'wind_boost',
        name: 'Wind Boost',
        description: 'A sudden tropical updraft pushes you up +12% height immediately.',
        cooldownSeconds: 30,
        durationSeconds: 1,
        icon: 'Wind',
        keybind: 'E'
    },
    legendary_climber: {
        type: 'legendary_climber',
        name: 'Legendary Climber',
        description: 'Ultimate power: Maximum grip, perfect balance, and +80% climb speed for 6s.',
        cooldownSeconds: 40,
        durationSeconds: 6,
        energyCost: 100,
        isUltimate: true,
        icon: 'Crown',
        keybind: 'R'
    }
};
exports.PHYSICS_CONFIG = {
    baseClimbSpeed: 4.5, // % height per second at full stamina
    baseDescendSpeed: 8.0, // % height per second
    staminaDepletionClimb: 7.0, // stamina units per second while climbing
    staminaRegenIdle: 6.0, // stamina units per second while staying still
    balanceDriftBase: 12.0, // balance shifts left or right naturally
    balanceRecoverySpeed: 45.0, // balance adjustment speed with keys
    slipThreshold: 75.0, // balance > 75 or < -75 causes slipping
    slipDropDistance: 12.0, // % height dropped on slip
    stunDuration: 1.8, // seconds stunned after a slip
    energyGainRate: 3.5, // ultimate energy points per second of climbing
};
// =========================================================================
// IN-GAME EMOTES CONFIGURATION (24 EMOTES)
// =========================================================================
exports.EMOTE_CATEGORIES = [
    { id: 'all', label: 'Semua', badge: '✨' },
    { id: 'reaction', label: 'Reaksi', badge: '😂' },
    { id: 'taunt', label: 'Taunt', badge: '🔥' },
    { id: 'gameplay', label: 'Taktik', badge: '⚡' },
    { id: 'festival', label: 'Festival', badge: '🎉' },
];
exports.EMOTE_LIST = [
    // Row 1 - Budi, Ujang, Rara
    { id: 'ggwp', label: 'GGWP!', category: 'reaction', character: 'Budi', image: '/assets/emotes/ggwp.png', description: 'Budi jempol api sportivitas!' },
    { id: 'aaghh', label: 'AAGHH!!', category: 'reaction', character: 'Budi', image: '/assets/emotes/aaghh.png', description: 'Budi panik histeris kaget!' },
    { id: 'hahaha', label: 'HAHAHA!', category: 'taunt', character: 'Ujang', image: '/assets/emotes/hahaha.png', description: 'Ujang tertawa puas mengejek lawan!' },
    { id: 'ez', label: 'EZ!', category: 'taunt', character: 'Ujang', image: '/assets/emotes/ez.png', description: 'Ujang pamer otot terlalu gampang!' },
    { id: 'cepat', label: 'CEPAT!!', category: 'gameplay', character: 'Rara', image: '/assets/emotes/cepat.png', description: 'Rara visor berpetir memacu tempo!' },
    { id: 'otw', label: 'OTW!', category: 'gameplay', character: 'Rara', image: '/assets/emotes/otw.png', description: 'Rara meluncur gaspol menuju puncak!' },
    // Row 2 - Koko, Jaya, Siti Caping
    { id: 'santuy', label: 'SANTUY~', category: 'reaction', character: 'Koko', image: '/assets/emotes/santuy.png', description: 'Koko nyantai minum kelapa muda!' },
    { id: 'capekk', label: 'CAPEKK..', category: 'reaction', character: 'Koko', image: '/assets/emotes/capekk.png', description: 'Koko lemas kehabisan stamina!' },
    { id: 'trap', label: 'TRAP!', category: 'gameplay', character: 'Jaya', image: '/assets/emotes/trap.png', description: 'Jaya pasang jebakan pisang licin!' },
    { id: 'sorry', label: 'SORRY!', category: 'reaction', character: 'Jaya', image: '/assets/emotes/sorry.png', description: 'Jaya garuk kepala minta maaf!' },
    { id: 'puyeng', label: 'PUYENG!', category: 'reaction', character: 'Siti', image: '/assets/emotes/puyeng.png', description: 'Siti caping pusing berputar bintang!' },
    { id: 'wush', label: 'WUSH!!', category: 'gameplay', character: 'Siti', image: '/assets/emotes/wush.png', description: 'Siti caping menerobos angin kencang!' },
    // Row 3 - Siti Gamer, Jago, Pole, Ghost
    { id: 'wow', label: 'WOW!', category: 'reaction', character: 'Siti', image: '/assets/emotes/wow.png', description: 'Siti gamer mata bintang terpukau!' },
    { id: 'ampun', label: 'AMPUN!', category: 'reaction', character: 'Siti', image: '/assets/emotes/ampun.png', description: 'Siti gamer menangis mohon ampun!' },
    { id: 'jagoan', label: 'JAGOAN!', category: 'taunt', character: 'Jago', image: '/assets/emotes/jagoan.png', description: 'Jago bermahkota raja pemanjat!' },
    { id: 'licin', label: 'LICIN!', category: 'gameplay', character: 'Jago', image: '/assets/emotes/licin.png', description: 'Jago belepotan oli licin!' },
    { id: 'merosot', label: 'MEROSOT!', category: 'gameplay', image: '/assets/emotes/merosot.png', description: 'Tiang oli licin anjlok ke bawah!' },
    { id: 'rip', label: 'RIP', category: 'taunt', image: '/assets/emotes/rip.png', description: 'Hantu melayang gugur di arena!' },
    // Row 4 - Festival & Item Props
    { id: 'awas', label: 'AWAS!', category: 'gameplay', image: '/assets/emotes/awas.png', description: 'Awas ada kulit pisang jebakan!' },
    { id: 'merdeka', label: 'MERDEKA!', category: 'festival', image: '/assets/emotes/merdeka.png', description: 'Bendera Merah Putih berkibar meriah!' },
    { id: 'juara', label: 'JUARA!', category: 'festival', image: '/assets/emotes/juara.png', description: 'Piala emas sang juara turnamen!' },
    { id: 'dakap', label: 'DAKAP!', category: 'festival', image: '/assets/emotes/dakap.png', description: 'Sepeda impian hadiah panjat pinang!' },
    { id: 'tanya', label: '?!', category: 'reaction', image: '/assets/emotes/tanya.png', description: 'Kaget tanda tanya dan tanda seru!' },
    { id: 'pelicin', label: 'PELICIN!', category: 'gameplay', image: '/assets/emotes/pelicin.png', description: 'Oli pelicin tumpah di tiang pinang!' },
];
