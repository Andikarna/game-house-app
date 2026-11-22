import { SkillDefinition, SkillType, AvatarId, EmoteDefinition, EmoteId, EmoteCategory, ImpostorCategory } from '../types';

export const SERVER_TICK_RATE = 20; // 20 ticks per second (50ms interval)
export const CLIENT_INPUT_RATE = 20; // client sends input every 50ms

export const DEFAULT_GAME_DURATION: Record<string, number> = {
  'classic-race': 180, // 3 minutes
  'survival-climb': 120, // 2 minutes
  'skill-battle': 150, // 2.5 minutes
  'classic': 600, // 10 minutes
  'quick': 300, // 5 minutes
  'impostor-classic': 240, // 4 minutes
};

export interface AvatarOption {
  id: AvatarId;
  name: string;
  subtitle: string;
  color: string;
  badge: string;
  tagline: string;
  spriteBase: string;
}

export const PRIMARY_AVATARS: AvatarId[] = [
  'budi',
  'ujang',
  'rara',
  'koko',
  'jaya',
  'bayu',
  'siti',
  'jago',
];

export function normalizeAvatarId(avatar?: string | null): AvatarId {
  if (!avatar) return 'budi';
  if (avatar === 'climber-red') return 'budi';
  if (avatar === 'climber-blue') return 'rara';
  if (avatar === 'climber-green') return 'koko';
  if (avatar === 'climber-yellow') return 'ujang';
  if (avatar === 'climber-purple') return 'siti';
  if (avatar === 'climber-orange') return 'jaya';
  return avatar as AvatarId;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
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

export const SKILL_DEFINITIONS: Record<SkillType, SkillDefinition> = {
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

export const PHYSICS_CONFIG = {
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

export const EMOTE_CATEGORIES: { id: EmoteCategory; label: string; badge: string }[] = [
  { id: 'all', label: 'Semua', badge: '✨' },
  { id: 'reaction', label: 'Reaksi', badge: '😂' },
  { id: 'taunt', label: 'Taunt', badge: '🔥' },
  { id: 'gameplay', label: 'Taktik', badge: '⚡' },
  { id: 'festival', label: 'Festival', badge: '🎉' },
];

export const EMOTE_LIST: EmoteDefinition[] = [
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

// =========================================================================
// IMPOSTOR DESA GAME CONFIGURATION & DATASETS
// =========================================================================

export interface ImpostorCategoryConfig {
  id: ImpostorCategory;
  name: string;
  icon: string;
  badge: string;
  description: string;
  words: string[];
}

export const IMPOSTOR_CATEGORIES: Record<ImpostorCategory, ImpostorCategoryConfig> = {
  'pertanian': {
    id: 'pertanian',
    name: 'Pertanian',
    icon: '🌾',
    badge: 'Sawah & Tani',
    description: 'Sawah, alat tani, dan hasil panen pedesaan',
    words: [
      'Sawah', 'Padi', 'Cangkul', 'Traktor', 'Pupuk', 'Panen', 'Jagung', 'Ladang', 'Petani', 'Kerbau',
      'Caping', 'Irigasi', 'Terasering', 'Lumbung', 'Pematang', 'Jerami', 'Orang-orangan sawah', 'Arit', 'Biji padi', 'Garpu tanah',
      'Singkong', 'Ubi jalar', 'Kedelai', 'Kacang tanah', 'Bawang merah', 'Cabai rawit', 'Tembakau', 'Tebu', 'Semangka', 'Mentimun',
      'Musim tanam', 'Bajak singkal', 'Saluran air', 'Hama tikus', 'Pondok sawah',
    ],
  },
  'hewan': {
    id: 'hewan',
    name: 'Hewan Ternak',
    icon: '🐄',
    badge: 'Ternak & Satwa',
    description: 'Hewan peliharaan dan ternak di pedesaan',
    words: [
      'Ayam', 'Bebek', 'Kambing', 'Sapi', 'Kerbau', 'Kelinci', 'Kucing', 'Burung', 'Angsa', 'Kuda',
      'Entog', 'Kalkun', 'Merpati', 'Burung perkutut', 'Ikan lele', 'Ikan nila', 'Ikan mas', 'Belut', 'Kambing etawa', 'Ayam jago',
      'Anjing kampung', 'Bunglon', 'Katak sawah', 'Capung', 'Jangkrik', 'Kunang-kunang', 'Kupu-kupu', 'Tupai', 'Musang', 'Kelelawar',
      'Burung hantu', 'Belalang', 'Semut rangrang', 'Cacing tanah', 'Bebek manila',
    ],
  },
  'pasar-desa': {
    id: 'pasar-desa',
    name: 'Pasar Desa',
    icon: '🏪',
    badge: 'Pasar & Niaga',
    description: 'Komoditas, warung, dan bahan di pasar tradisional',
    words: [
      'Warung', 'Bakso', 'Sayur', 'Cabai', 'Beras', 'Tempe', 'Tahu', 'Kelapa', 'Pisang', 'Singkong',
      'Timbangan bebek', 'Kantung kresek', 'Keranjang anyaman', 'Uang koin', 'Ikan asin', 'Garam kasar', 'Minyak goreng', 'Gula merah', 'Bawang putih', 'Bumbu dapur',
      'Kangkung', 'Bayam', 'Terong', 'Tomat', 'Kacang panjang', 'Labu siam', 'Tauge', 'Krupuk kaleng', 'Es lilin', 'Jajanan pasar',
      'Los pasar', 'Kios kelontong', 'Penjual jamu', 'Kupon undian', 'Becak pasar',
    ],
  },
  'kehidupan-desa': {
    id: 'kehidupan-desa',
    name: 'Kehidupan Desa',
    icon: '🏡',
    badge: 'Warga & Lingkungan',
    description: 'Tempat berkumpul, fasilitas desa, dan alam sekitar',
    words: [
      'Pos ronda', 'Balai desa', 'Sumur', 'Kebun', 'Mushola', 'Sepeda ontel', 'Sungai', 'Jembatan bambu', 'Lapangan desa', 'Gardu listrik',
      'Rumah panggung', 'Lumbung desa', 'Pancuran air', 'Empang ikan', 'Gapura desa', 'Jalan setapak', 'Kandang ternak', 'Dapur pawon', 'Pagar bambu', 'Bale-bale',
      'Kentongan', 'Ronda malam', 'Kerja bakti', 'Pengajian', 'Arisan warga', 'Kenduri', 'Kopdes', 'Rembuk warga', 'Gotong royong', 'Pondok pesantren',
      'Kran umum', 'Kuburan desa', 'Beringin tua', 'Sungai berbatu', 'Warung kopi',
    ],
  },
  'makanan': {
    id: 'makanan',
    name: 'Makanan Khas',
    icon: '🍲',
    badge: 'Kuliner Desa',
    description: 'Kuliner tradisional khas desa yang lezat',
    words: [
      'Rendang', 'Pecel', 'Gudeg', 'Soto', 'Rawon', 'Nasi uduk', 'Gorengan', 'Klepon', 'Getuk', 'Serabi',
      'Nasi liwet', 'Lontong sayur', 'Tahu tempe bacem', 'Sayur lodeh', 'Sayur asem', 'Sambal terasi', 'Ikan bakar', 'Ayam kremes', 'Pepes tahu', 'Urap sayur',
      'Kue cucur', 'Lumpia', 'Lemper', 'Onde-onde', 'Nagasari', 'Tiwul', 'Cenil', 'Ketan serundeng', 'Bakwan jagung', 'Rempeyek',
      'Es dawet', 'Wedang jahe', 'Bajigur', 'Kolak pisang', 'Bubur sumsum',
    ],
  },
  'perkakas-alat': {
    id: 'perkakas-alat',
    name: 'Perkakas & Alat',
    icon: '🔨',
    badge: 'Alat & Perkakas',
    description: 'Peralatan tukang kayu, tani, dan dapur tradisional',
    words: [
      'Cangkul', 'Arit', 'Golok', 'Palu', 'Gergaji kayu', 'Pahat', 'Parutan kelapa', 'Cobek batu', 'Ulekan', 'Tampah beras',
      'Kukusan bambu', 'Centong nasi', 'Dandang nasi', 'Kuali tanah', 'Kendi air', 'Teko seng', 'Cangkir blirik', 'Senter ronda', 'Lampu petromak', 'Lilin malam',
      'Tali tambang', 'Paku payung', 'Meteran gulung', 'Tang jepit', 'Obeng min', 'Kapak kayu', 'Sekop pasir', 'Ayakan pasir', 'Batu asahan', 'Pancing ikan',
      'Jaring jala', 'Bubu bambu', 'Alu penumbuk', 'Lesung batu', 'Sapu lidi',
    ],
  },
  'alam-geografi': {
    id: 'alam-geografi',
    name: 'Alam Pedesaan',
    icon: '🏞️',
    badge: 'Bentang Alam',
    description: 'Sungai, perbukitan, hutan, dan bentang alam pedesaan',
    words: [
      'Sungai', 'Bukit', 'Gunung', 'Lembah', 'Hutan pinus', 'Mata air', 'Air terjun', 'Danau kecil', 'Rawa-rawa', 'Gua batu',
      'Pematang sawah', 'Kebun teh', 'Hutan bambu', 'Jurang', 'Batu kali', 'Pasir kali', 'Muara sungai', 'Padang rumput', 'Lereng gunung', 'Puncak bukit',
      'Kabut pagi', 'Hujan gerimis', 'Pelangi sore', 'Angin sepoi', 'Embun pagi', 'Matahari terbit', 'Senja jingga', 'Tanah merah', 'Bebatuan cadas', 'Semak belukar',
      'Pohon beringin', 'Pohon randu', 'Rumpun bambu', 'Hulu sungai', 'Tebing curam',
    ],
  },
  'permainan-tradisional': {
    id: 'permainan-tradisional',
    name: 'Permainan Tradisional',
    icon: '🪁',
    badge: 'Dolanan Rakyat',
    description: 'Dolanan tradisional anak desa tempo dulu',
    words: [
      'Layangan', 'Gasing', 'Kelereng', 'Egrang', 'Congklak', 'Bakiak', 'Petak umpet', 'Gobak sodor', 'Lompat tali', 'Bentengan',
      'Bekel', 'Engklek', 'Ular naga', 'Mobil bambu', 'Pletokan bambu', 'Ketapel', 'Gundu', 'Balap karung', 'Tarik tambang', 'Panjat pinang',
      'Lari kelereng', 'Gatrik', 'Pocong-pocongan', 'Kite gelasan', 'Bedil bambu', 'Kapal otok-otok', 'Panggal kayu', 'Tepuk kartu', 'Hompimpa', 'Suten jari',
      'Sepak tekong', 'Cublak suweng', 'Gundukan pasir', 'Kuda-kudaan kayu', 'Adu cupang',
    ],
  },
  'kesenian-budaya': {
    id: 'kesenian-budaya',
    name: 'Kesenian & Budaya',
    icon: '🎭',
    badge: 'Seni & Tradisi',
    description: 'Kesenian daerah, alat musik, dan upacara adat desa',
    words: [
      'Gamelan', 'Wayang kulit', 'Kendang', 'Suling bambu', 'Angklung', 'Reog', 'Kuda lumping', 'Tari piring', 'Tari jaipong', 'Batik tulis',
      'Gong perunggu', 'Saron gamelan', 'Calung bambu', 'Rebana', 'Gambus', 'Bedug mushola', 'Topeng kayu', 'Keris pusaka', 'Blangkon', 'Sarung tenun',
      'Kebaya encim', 'Udeng bali', 'Janur kuning', 'Tumpeng selamatan', 'Sesajen bunga', 'Bersih desa', 'Pentas ketoprak', 'Lakon wayang', 'Dalang wayang', 'Sindhen tari',
      'Nyinden lagu', 'Kirab budaya', 'Sedekah bumi', 'Parade obor', 'Festival rakyat',
    ],
  },
  'transportasi-desa': {
    id: 'transportasi-desa',
    name: 'Transportasi Desa',
    icon: '🚲',
    badge: 'Mobilitas Desa',
    description: 'Kendaraan tradisional dan sarana transportasi pedesaan',
    words: [
      'Sepeda ontel', 'Becak', 'Delman', 'Andong', 'Gerobak dorong', 'Gerobak sapi', 'Perahu getek', 'Rakit bambu', 'Perahu dayung', 'Cidomo',
      'Sepeda motor bebek', 'Odong-odong', 'Pick up sayur', 'Truk gabah', 'Angkot desa', 'Dokar kuda', 'Kereta kelinci', 'Perahu sampan', 'Bemo roda tiga', 'Kaisar roda tiga',
      'Kereta mini', 'Sepeda jengki', 'Becak motor', 'Kuda beban', 'Sepeda mini keranjang', 'Perahu tambang', 'Pedati sapi', 'Truk pasir kali', 'Gerobak bakso', 'Gerobak cilok',
      'Sepeda kumbang', 'Truk pupuk', 'Motor trail kebun', 'Ojek pangkalan', 'Stasiun desa kecil',
    ],
  },
};

export const IMPOSTOR_CAMOUFLAGE_THEMES: Record<ImpostorCategory, string[]> = {
  'pertanian': ['Luar ruangan', 'Tanah subur', 'Musim & Cuaca', 'Alat kerja', 'Hasil bumi', 'Dikelola petani'],
  'hewan': ['Makhluk hidup', 'Peliharaan/Ternak', 'Suara khas', 'Kandang/Alam', 'Bulu/Kulit', 'Pedesaan'],
  'pasar-desa': ['Jual beli', 'Bahan masakan', 'Kios & Warung', 'Segar/Kering', 'Murah meriah', 'Kebutuhan warga'],
  'kehidupan-desa': ['Fasilitas warga', 'Tempat kumpul', 'Rutinitas desa', 'Gotong royong', 'Suasana tenang', 'Bangunan desa'],
  'makanan': ['Bumbu rempah', 'Cita rasa khas', 'Dimasak hangat', 'Kenyang nikmat', 'Kue tradisional', 'Lauk pauk'],
  'perkakas-alat': ['Alat pertukangan', 'Bahan besi/kayu', 'Benda berguna', 'Dapur & Rumah', 'Butuh keterampilan', 'Alat manual'],
  'alam-geografi': ['Bentang alam', 'Air & Bebatuan', 'Hutan & Bukit', 'Pemandangan asri', 'Udara pedesaan', 'Unsur alam'],
  'permainan-tradisional': ['Dolanan anak', 'Dimainkan di luar', 'Gerak & Taktik', 'Alat sederhana', 'Kebersamaan sore', 'Gelak tawa'],
  'kesenian-budaya': ['Warisan leluhur', 'Alat musik & Tari', 'Pentas hajatan', 'Suara merdu', 'Pakaian adat', 'Kesenian rakyat'],
  'transportasi-desa': ['Alat transportasi', 'Roda & Tenaga', 'Jalan pedesaan', 'Mengangkut muatan', 'Perjalanan santai', 'Tanpa polusi'],
};

export const IMPOSTOR_PHASE_TIMERS = {
  roleReveal: 12, // 12 seconds
  clueTurn: 90, // 1 menit 30 detik (90 seconds)
  discussion: 120, // 2 menit (120 seconds) discussion
  voting: 25, // 25 seconds secret voting
  revote: 20, // 20 seconds revote if tied
  impostorGuess: 30, // 30 seconds for impostor to guess word
  result: 30,
};

export const IMPOSTOR_PLAYER_LIMITS = {
  minPlayers: 4,
  maxPlayers: 6,
};

