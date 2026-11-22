import { 
  GameId, 
  GameMode, 
  RoomSettings, 
  Player, 
  GameResultData, 
  ImpostorCategory, 
  ImpostorPhase, 
  ImpostorPlayerRole,
  ImpostorPlayerPublic,
  ImpostorClueEntry,
  ImpostorVoteSummary,
  ImpostorPrivateRoleData,
  ImpostorPublicGameState,
  ImpostorResultData,
  ImpostorInput,
  ImpostorChatMessage,
  IMPOSTOR_CATEGORIES,
  IMPOSTOR_CAMOUFLAGE_THEMES,
  IMPOSTOR_PHASE_TIMERS,
  IMPOSTOR_PLAYER_LIMITS,
  AvatarId
} from '@gamehouse/shared';
import { Server as SocketIOServer } from 'socket.io';
import { GameModule } from '../../core/GameModule';

// Contextual Clues for Bots when playing as Villagers (knows the secret word)
const BOT_CLUES_BY_WORD: Record<string, string[]> = {
  // 1. Pertanian
  'Sawah': ['Lumpur', 'Padi', 'Terasering', 'Irigasi', 'Hijau', 'Petani', 'Basah', 'Tanah'],
  'Padi': ['Kuning', 'Bulir', 'Beras', 'Tangkai', 'Panen', 'Lumbung', 'Emas'],
  'Cangkul': ['Besi', 'Gali', 'Kebun', 'Gagang', 'Tanah', 'Alat', 'Tajam'],
  'Traktor': ['Mesin', 'Bahan bakar', 'Roda besar', 'Bajak', 'Bising', 'Modern'],
  'Pupuk': ['Penyubur', 'Kandang', 'Tanaman', 'Tumbuh', 'Organik', 'Bau'],
  'Panen': ['Hasil', 'Syukuran', 'Pesta', 'Melimpah', 'Waktu', 'Musim'],
  'Jagung': ['Biji', 'Tongkol', 'Rambut', 'Bakar', 'Manis', 'Kuning'],
  'Ladang': ['Kering', 'Tanam', 'Bukit', 'Luas', 'Pohon', 'Palawija'],
  'Petani': ['Caping', 'Kerja', 'Orang', 'Sawah', 'Keringat', 'Pahlawan'],
  'Kerbau': ['Tanduk', 'Bajak', 'Kubangan', 'Kandang', 'Kuat', 'Besar'],
  'Caping': ['Anyaman', 'Kepala', 'Bambu', 'Panas', 'Petani', 'Pelindung'],
  'Irigasi': ['Aliran', 'Pintu air', 'Parit', 'Sawah', 'Subur', 'Basah'],
  'Terasering': ['Berundak', 'Lereng', 'Indah', 'Bali', 'Padi', 'Hijau'],
  'Jerami': ['Kering', 'Batang padi', 'Tumpukan', 'Pakan', 'Kuning', 'Cokelat'],
  'Arit': ['Tajam', 'Besi lengkung', 'Rumput', 'Padi', 'Tangan', 'Bilah'],
  'Singkong': ['Umbi', 'Rebus', 'Tanah', 'Goreng', 'Tape', 'Akar'],
  'Ubi jalar': ['Manis', 'Kukus', 'Ungu', 'Kuning', 'Tanah', 'Daun'],
  'Kedelai': ['Kacang', 'Tempe', 'Tahu', 'Kecap', 'Polong', 'Protein'],
  'Semangka': ['Merah', 'Segar', 'Berair', 'Biji', 'Manis', 'Bulat'],

  // 2. Hewan Ternak
  'Ayam': ['Berkokok', 'Telur', 'Jago', 'Unggas', 'Subuh', 'Bulu', 'Pagi'],
  'Bebek': ['Kwekkwek', 'Berenang', 'Paruh', 'Moncong', 'Telur asin', 'Jalan bebek'],
  'Kambing': ['Embek', 'Rumput', 'Tanduk', 'Prengus', 'Kurban', 'Tanduk'],
  'Sapi': ['Susu', 'Lembu', 'Ternak', 'Daging', 'Padang', 'Kandang'],
  'Kelinci': ['Telinga panjang', 'Wortel', 'Melompat', 'Imut', 'Bulu halus'],
  'Kucing': ['Meong', 'Kumis', 'Cakar', 'Lucu', 'Peliharaan', 'Tidur'],
  'Burung': ['Sayap', 'Terbang', 'Sangkar', 'Kicau', 'Pohon', 'Sarang'],
  'Angsa': ['Leher panjang', 'Putih', 'Danau', 'Galak', 'Berenang'],
  'Kuda': ['Tunggang', 'Kencang', 'Tapal', 'Suri', 'Delman', 'Pelari'],
  'Ikan lele': ['Kumis', 'Lendir', 'Kolam terpal', 'Patil', 'Goreng', 'Air tawar'],
  'Belut': ['Licin', 'Lumpur', 'Sawah', 'Panjang', 'Goreng kering', 'Air'],
  'Capung': ['Sayap transparan', 'Terbang cepat', 'Hinggap', 'Air bersih', 'Mata besar'],
  'Jangkrik': ['Krik-krik', 'Malam hari', 'Aduan', 'Kaki melompat', 'Sayap getar'],
  'Kunang-kunang': ['Cahaya malam', 'Kelap-kelip', 'Bercahaya', 'Sawah', 'Gelap'],

  // 3. Pasar Desa
  'Warung': ['Kopi', 'Belanja', 'Jajan', 'Hutang', 'Kelontong', 'Tetangga'],
  'Bakso': ['Kuah', 'Bulat', 'Mie', 'Sambal', 'Daging', 'Mangkok', 'Gerobak'],
  'Sayur': ['Segar', 'Bayam', 'Hijau', 'Kangkung', 'Masak', 'Vitamin'],
  'Cabai': ['Pedas', 'Merah', 'Rawit', 'Ulek', 'Sambal', 'Bumbu'],
  'Beras': ['Karung', 'Putih', 'Nasi', 'Pokok', 'Dimasak', 'Tumbuk'],
  'Tempe': ['Kedelai', 'Goreng', 'Ragi', 'Murah', 'Lauk', 'Protein'],
  'Tahu': ['Putih', 'Lembut', 'Kedelai', 'Goreng', 'Camilan', 'Kuning'],
  'Kelapa': ['Santan', 'Pohon tinggi', 'Es', 'Sabut', 'Batok', 'Air kelapa'],
  'Pisang': ['Kuning', 'Tandan', 'Goreng', 'Manis', 'Buah', 'Monyet'],
  'Timbangan bebek': ['Kuningan', 'Jarum', 'Beban', 'Pasar', 'Berat', 'Ukuran'],
  'Ikan asin': ['Kering', 'Asin', 'Goreng', 'Sambal terasi', 'Awet', 'Jemur'],
  'Minyak goreng': ['Kuning', 'Wajan', 'Gorengan', 'Jerigen', 'Licin', 'Panas'],
  'Gula merah': ['Manis', 'Aren', 'Kelapa', 'Cokelat padat', 'Kolak', 'Bumbu'],

  // 4. Kehidupan Desa
  'Pos ronda': ['Kentongan', 'Malam', 'Jaga', 'Kopi', 'Siskamling', 'Bambu'],
  'Balai desa': ['Rapat', 'Lurah', 'Kumpul', 'Warga', 'Kantor', 'Pengumuman'],
  'Sumur': ['Timba', 'Air', 'Dalam', 'Tali', 'Segar', 'Mandi'],
  'Kebun': ['Pohon', 'Buah', 'Teduh', 'Tanah', 'Tanaman', 'Hijau'],
  'Mushola': ['Adzan', 'Sholat', 'Kubah', 'Sajadah', 'Wudhu', 'Tenang'],
  'Sepeda ontel': ['Gowes', 'Besi tua', 'Roda dua', 'Rantai', 'Stang tinggi', 'Klasik'],
  'Sungai': ['Aliran', 'Ikan', 'Batu', 'Jernih', 'Mandi', 'Air'],
  'Jembatan bambu': ['Penyeberangan', 'Bambu', 'Sungai', 'Hubung', 'Goyang'],
  'Lapangan desa': ['Sepak bola', 'Rumput', 'Main', 'Lomba', 'Upacara', 'Luas'],
  'Gardu listrik': ['Tiang', 'Kabel', 'Lampu', 'Perempatan', 'Terang'],
  'Rumah panggung': ['Kayu', 'Tinggi', 'Kolong', 'Tradisional', 'Tiang kayu'],
  'Kentongan': ['Bambu', 'Pukul', 'Bunyi', 'Ronda', 'Tanda bahaya', 'Berongga'],
  'Gotong royong': ['Warga', 'Bersama', 'Bantu', 'Kompak', 'Tenaga', 'Desa'],

  // 5. Makanan Khas
  'Rendang': ['Daging', 'Padang', 'Santan', 'Cokelat', 'Rempah', 'Enak'],
  'Pecel': ['Bumbu kacang', 'Sayur', 'Krupuk', 'Pedas', 'Madiun', 'Pincuk'],
  'Gudeg': ['Nangka muda', 'Manis', 'Jogja', 'Krecek', 'Opor', 'Khas'],
  'Soto': ['Kuah kuning', 'Ayam', 'Mangkok', 'Jeruk nipis', 'Hangat', 'Suwir'],
  'Rawon': ['Kluwek', 'Hitam', 'Daging', 'Kecambah', 'Surabaya', 'Gurih'],
  'Nasi uduk': ['Gurih', 'Santan', 'Sarapan', 'Bawang goreng', 'Bungkus'],
  'Gorengan': ['Bala-bala', 'Bakwan', 'Minyak', 'Cabe rawit', 'Crispy', 'Hangat'],
  'Klepon': ['Gula merah', 'Kelapa parut', 'Hijau', 'Meletus', 'Ketan', 'Bulat'],
  'Getuk': ['Singkong', 'Lindri', 'Warna-warni', 'Kelapa', 'Tradisional'],
  'Serabi': ['Kinca', 'Tepung beras', 'Kuah', 'Pagi', 'Tradisional', 'Solo'],
  'Nasi liwet': ['Kastrol', 'Teri', 'Aroma pandan', 'Sunda', 'Daun pisang', 'Hangat'],
  'Sayur asem': ['Jagung', 'Asam', 'Melinjo', 'Kacang panjang', 'Segar', 'Siang'],
  'Sambal terasi': ['Ulek', 'Cobek', 'Pedas', 'Tomat', 'Lalapan', 'Merah'],
  'Es dawet': ['Cendol', 'Santan', 'Gula merah', 'Segar', 'Es batu', 'Gelas'],

  // 6. Perkakas & Alat
  'Golok': ['Bilah besi', 'Kayu', 'Tebas', 'Tajam', 'Hutan', 'Sarung kayu'],
  'Palu': ['Paku', 'Besi berat', 'Ketok', 'Tukang kayu', 'Keras', 'Gagang'],
  'Gergaji kayu': ['Gigi tajam', 'Potong', 'Serbuk kayu', 'Besi panjang', 'Tukang'],
  'Cobek batu': ['Batu kali', 'Ulekan', 'Sambal', 'Bumbu', 'Dapur', 'Cekung'],
  'Ulekan': ['Tangan', 'Batu', 'Giling', 'Menghaluskan', 'Pasangan cobek'],
  'Tampah beras': ['Anyaman bambu', 'Nampi', 'Bulat', 'Beras', 'Kotoran', 'Tradisional'],
  'Kukusan bambu': ['Kerucut', 'Anyaman', 'Tumpeng', 'Nasi', 'Uap air', 'Dandang'],
  'Kendi air': ['Tanah liat', 'Cocor', 'Air sejuk', 'Minum', 'Tradisional', 'Gerabah'],
  'Lampu petromak': ['Minyak tanah', 'Kaus lampu', 'Pompa', 'Terang benderang', 'Malam'],
  'Tali tambang': ['Serat kuat', 'Ikat', 'Tarik tambang', 'Panjang', 'Gulungan'],
  'Pancing ikan': ['Kail', 'Umpan', 'Senar', 'Joran', 'Sungai', 'Menunggu'],

  // 7. Alam Pedesaan
  'Bukit': ['Tinggi', 'Hijau', 'Pemandangan', 'Tanah', 'Mendaki', 'Angin'],
  'Gunung': ['Puncak', 'Awan', 'Berapi', 'Sejuk', 'Hutan', 'Megah'],
  'Lembah': ['Rendah', 'Diapit bukit', 'Subur', 'Kabut', 'Sungai mengalir'],
  'Mata air': ['Jernih', 'Muncul tanah', 'Dingin', 'Batu', 'Segar', 'Alami'],
  'Air terjun': ['Jatuh', 'Gemuruh', 'Tebing', 'Buih putih', 'Batu kali', 'Percikan'],
  'Danau kecil': ['Genangan', 'Ikan', 'Tenang', 'Air tawar', 'Tepian'],
  'Hutan pinus': ['Pohon tegak', 'Daun jarum', 'Wangi damar', 'Teduh', 'Kabut'],
  'Batu kali': ['Bulat licin', 'Arus air', 'Keras', 'Bantaran', 'Bahan pondasi'],
  'Kabut pagi': ['Putih tipis', 'Dingin', 'Menutupi pandangan', 'Embun', 'Subuh'],
  'Hujan gerimis': ['Rintik-rintik', 'Basah', 'Suara atap', 'Dingin', 'Pelangi'],

  // 8. Permainan Tradisional
  'Layangan': ['Benang', 'Kertas', 'Angin', 'Terbang langit', 'Aduan', 'Bambu'],
  'Gasing': ['Kayu putar', 'Tali lilit', 'Keseimbangan', 'Muter kencang', 'Lantai tanah'],
  'Kelereng': ['Kaca bulat', 'Sentil', 'Gundu', 'Lingkaran tanah', 'Warna-warni'],
  'Egrang': ['Bambu tinggi', 'Pijakan kaki', 'Seimbang', 'Jalan jangkung', 'Ketangkasan'],
  'Congklak': ['Papan kayu', 'Lubang', 'Biji kerang', 'Dua orang', 'Tradisional'],
  'Bakiak': ['Kayu panjang', 'Tali karet', 'Kompak', 'Langkah bareng', 'Lomba'],
  'Petak umpet': ['Jaga pos', 'Sembunyi', 'Hitungan', 'Cari teman', 'Sore hari'],
  'Gobak sodor': ['Garis lapangan', 'Hadang lawan', 'Lari gesit', 'Kelompok', 'Seru'],
  'Lompat tali': ['Karet gelang', 'Lompatan tinggi', 'Putar tali', 'Anak perempuan'],
  'Balap karung': ['Karung goni', 'Lompat-lompat', 'Tujuh belasan', 'Jatuh bangun', 'Tawa'],
  'Panjat pinang': ['Batang licin', 'Oli gemuk', 'Hadiah puncak', 'Bahu membahu', 'Merdeka'],

  // 9. Kesenian & Budaya
  'Gamelan': ['Gong', 'Kendang', 'Perunggu', 'Tabuh', 'Jawa Bali', 'Irama merdu'],
  'Wayang kulit': ['Kelir putih', 'Dalang', 'Kulit kerbau', 'Bayangan', 'Lakon semalam'],
  'Kendang': ['Kulit sapi', 'Pukul tangan', 'Irama rancak', 'Kayu jati', 'Iringan tari'],
  'Suling bambu': ['Tiup', 'Lubang nada', 'Merdu menyayat', 'Bambu tipis', 'Pedesaan'],
  'Angklung': ['Bambu goyang', 'Getar nada', 'Jawa Barat', 'Harmoni bareng', 'Unesco'],
  'Reog': ['Topeng singa', 'Bulu merak', 'Ponorogo', 'Gigi gigit', 'Atraksi gagah'],
  'Kuda lumping': ['Anyaman bambu', 'Kesurupan', 'Pecut cambuk', 'Gamelan', 'Tarian mistis'],
  'Batik tulis': ['Canting', 'Malam lilin', 'Kain mori', 'Motif khas', 'Sabar telaten'],
  'Keris pusaka': ['Bilah berlekuk', 'Pamor besi', 'Warisan leluhur', 'Sarung kayu', 'Mistis'],
  'Tumpeng selamatan': ['Nasi kuning', 'Kerucut tumpeng', 'Lauk tujuh rupa', 'Doa syukur', 'Kenduri'],

  // 10. Transportasi Desa
  'Becak': ['Roda tiga', 'Kayuh sepeda', 'Penumpang depan', 'Tenda peneduh', 'Santai'],
  'Delman': ['Kuda penarik', 'Kusir pecut', 'Roda kayu besar', 'Kerincing lonceng', 'Wisata'],
  'Andong': ['Kereta kuda', 'Empat roda', 'Kraton', 'Kusir blangkon', 'Jogja Solo'],
  'Gerobak dorong': ['Dua roda', 'Beban pasir', 'Tangan dorong', 'Kayu papan', 'Kerja'],
  'Gerobak sapi': ['Pedati', 'Sapi gandeng', 'Muatan jerami', 'Kayu kokoh', 'Jalan lambat'],
  'Perahu getek': ['Rakit bambu', 'Sungai arus', 'Tali gantung', 'Menyeberang', 'Dayung bambu'],
  'Sepeda motor bebek': ['Mesin irit', 'Roda dua', 'Knalpot', 'Kebun sawah', 'Ojek'],
  'Odong-odong': ['Lampu hias', 'Musik riang', 'Anak-anak keliling', 'Gowes modif', 'Sore'],
  'Pick up sayur': ['Bak terbuka', 'Sayur pasar', 'Subuh melaju', 'Tepung beras', 'Muatan penuh'],
  'Dokar kuda': ['Roda dua', 'Kuda lari', 'Kusir tua', 'Suara tapal kuda', 'Pasar desa'],
};

// Strategic Disguise Clues for Impostor Bots (Deceptive and blends naturally with villager clues!)
const BOT_DECEPTIVE_IMPOSTOR_CLUES: Record<ImpostorCategory, string[]> = {
  'pertanian': [
    'Subur', 'Tanah', 'Luar ruangan', 'Ditanam', 'Diolah', 'Musim', 'Hijau', 'Pagi hari', 
    'Perlu tenaga', 'Hasil bumi', 'Tradisional', 'Air', 'Panas terik', 'Disiram', 'Keringat'
  ],
  'hewan': [
    'Bernyawa', 'Peliharaan', 'Suara khas', 'Kandang', 'Bergerak', 'Bulu', 'Pagi', 
    'Liar', 'Jinak', 'Kaki empat', 'Makan rumput', 'Bertelur', 'Keluarga hewan', 'Lincah'
  ],
  'pasar-desa': [
    'Segar', 'Dijual', 'Timbangan', 'Bungkus', 'Pagi hari', 'Pangan', 'Murah', 
    'Banyak macam', 'Khas desa', 'Kios', 'Kebutuhan dapur', 'Belanjaan', 'Uang pas'
  ],
  'kehidupan-desa': [
    'Warga', 'Kumpul bersama', 'Bambu', 'Tradisi', 'Malam hari', 'Kayu', 'Air bersih', 
    'Luar ruangan', 'Ramai', 'Teduh', 'Pedesaan', 'Rukun', 'Sederhana', 'Gotong royong'
  ],
  'makanan': [
    'Bumbu rempah', 'Gurih', 'Hangat', 'Rempah', 'Khas desa', 'Enak', 'Aroma wangi', 
    'Pedas manis', 'Lauk pauk', 'Kuah sedap', 'Tradisional', 'Kenyang', 'Ketan', 'Goreng'
  ],
  'perkakas-alat': [
    'Besi baja', 'Kayu kuat', 'Pegang tangan', 'Kerja keras', 'Tajam', 'Tenaga otot', 
    'Keras', 'Benda berguna', 'Dapur', 'Rumah tangga', 'Tukang', 'Manual'
  ],
  'alam-geografi': [
    'Air mengalir', 'Batu kali', 'Alami', 'Pohon hijau', 'Terbuka luas', 'Sejuk asri', 
    'Tinggi', 'Aliran', 'Pagi sejuk', 'Tanah subur', 'Pemandangan indah', 'Lembah'
  ],
  'permainan-tradisional': [
    'Main sore', 'Anak-anak', 'Halaman luas', 'Lari kencang', 'Bahan kayu', 'Seru ramai', 
    'Tali', 'Beregu', 'Tradisional', 'Gembira', 'Tawa riang', 'Kekompakan'
  ],
  'kesenian-budaya': [
    'Irama musik', 'Suara merdu', 'Pentas panggung', 'Tradisi leluhur', 'Adat istiadat', 
    'Bambu kayu', 'Pakaian adat', 'Malam pentas', 'Gerakan luwes', 'Khas daerah', 'Budaya'
  ],
  'transportasi-desa': [
    'Roda berputar', 'Bahan kayu', 'Jalan desa', 'Tumpangan warga', 'Muatan hasil', 
    'Tradisional', 'Tenaga kayuh', 'Santai melaju', 'Dinaiki bersama', 'Pagi hari'
  ],
};

export class ImpostorDesaGame implements GameModule {
  public readonly id: GameId = 'impostor-desa';
  public readonly name: string = 'Impostor Desa';
  public readonly minPlayers: number = IMPOSTOR_PLAYER_LIMITS.minPlayers;
  public readonly maxPlayers: number = IMPOSTOR_PLAYER_LIMITS.maxPlayers;
  public readonly availableModes: GameMode[] = ['impostor-classic'];

  // Game Context
  private roomId: string = '';
  private io: SocketIOServer | null = null;
  private settings: RoomSettings | null = null;
  private playersMap: Map<string, Player> = new Map();

  // Authoritative State (Private to Server)
  private impostorPlayerId: string = '';
  private lastImpostorPlayerId: string = '';
  private secretWord: string = '';
  private category: ImpostorCategory = 'pertanian';
  private usedWords: Set<string> = new Set();
  private playerScores: Map<string, number> = new Map();

  // Game Loop & Machine
  private phase: ImpostorPhase = 'role-reveal';
  private phaseTimer: number = IMPOSTOR_PHASE_TIMERS.roleReveal;
  private phaseTotalTime: number = IMPOSTOR_PHASE_TIMERS.roleReveal;
  private roundNumber: number = 1;
  private playerOrder: string[] = [];
  private currentClueTurnIndex: number = 0;

  // Clues & Votes
  private clues: ImpostorClueEntry[] = [];
  private clueGivenByPlayer: Set<string> = new Set();
  private votes: Map<string, string> = new Map(); // voterId -> targetId
  private chatMessages: ImpostorChatMessage[] = [];
  private readyPlayers: Set<string> = new Set();
  private eligibleCandidates: string[] = [];
  private isRevote: boolean = false;

  // Guess & Result
  private caughtImpostorId: string | null = null;
  private impostorGuess: string | null = null;
  private guessIsCorrect: boolean = false;
  private winner: 'villagers' | 'impostor' | null = null;
  private winReason: string = '';
  private resultData: ImpostorResultData | null = null;
  private gameFinished: boolean = false;

  // Bot AI State (Mode Latihan)
  private botReadyTimers: Map<string, number> = new Map();
  private botClueTimer: number = 2.0;
  private botVoteTimers: Map<string, number> = new Map();
  private botChatCooldown: number = 4.0;
  private botGuessTimer: number = 2.5;

  public initialize(
    roomId: string, 
    players: Player[], 
    settings: RoomSettings, 
    io: SocketIOServer
  ): void {
    this.roomId = roomId;
    this.settings = settings;
    this.io = io;
    this.playersMap.clear();

    players.forEach(p => {
      this.playersMap.set(p.id, { ...p });
      if (!this.playerScores.has(p.id)) {
        this.playerScores.set(p.id, p.score || 0);
      }
    });

    this.resetRoundState();
  }

  private resetRoundState(): void {
    const playerIds = Array.from(this.playersMap.keys());
    if (playerIds.length === 0) return;

    // 1. Pick category
    const activeCategories: ImpostorCategory[] = 
      (this.settings?.impostorCategories && this.settings.impostorCategories.length > 0)
        ? this.settings.impostorCategories
        : (Object.keys(IMPOSTOR_CATEGORIES) as ImpostorCategory[]);

    const selectedCategory = activeCategories[Math.floor(Math.random() * activeCategories.length)] || 'pertanian';
    this.category = selectedCategory;

    // 2. Pick secret word from category
    const categoryConfig = IMPOSTOR_CATEGORIES[this.category];
    const availableWords = categoryConfig.words.filter(w => !this.usedWords.has(w));
    const wordPool = availableWords.length > 0 ? availableWords : categoryConfig.words;
    const selectedWord = wordPool[Math.floor(Math.random() * wordPool.length)];
    this.secretWord = selectedWord;
    this.usedWords.add(selectedWord);

    // 3. Pick 1 Impostor randomly, ensuring role rotates and changes each round
    const candidates = playerIds.filter(id => id !== this.lastImpostorPlayerId);
    const pool = candidates.length > 0 ? candidates : playerIds;
    const randomImpostorIdx = Math.floor(Math.random() * pool.length);
    this.impostorPlayerId = pool[randomImpostorIdx];
    this.lastImpostorPlayerId = this.impostorPlayerId;

    // 4. Randomize turn order for clues
    this.playerOrder = [...playerIds].sort(() => Math.random() - 0.5);
    this.currentClueTurnIndex = 0;

    // 5. Reset collections
    this.clues = [];
    this.clueGivenByPlayer.clear();
    this.votes.clear();
    this.chatMessages = [];
    this.readyPlayers.clear();
    this.eligibleCandidates = [...playerIds];
    this.isRevote = false;
    this.caughtImpostorId = null;
    this.impostorGuess = null;
    this.guessIsCorrect = false;
    this.winner = null;
    this.winReason = '';
    this.resultData = null;
    this.gameFinished = false;

    // 6. Set initial phase: role-reveal
    this.phase = 'role-reveal';
    this.phaseTotalTime = IMPOSTOR_PHASE_TIMERS.roleReveal;
    this.phaseTimer = this.phaseTotalTime;

    // 7. Initialize bot AI state for practice mode
    this.initBotState();
  }

  public start(): void {
    // Send individual private role event to each player's socket!
    this.sendPrivateRolesToAll();
  }

  public sendPrivateRolesToAll(): void {
    if (!this.io) return;

    const categoryConfig = IMPOSTOR_CATEGORIES[this.category];
    const allCategoryNames = Object.values(IMPOSTOR_CATEGORIES).map(c => c.name);

    this.playersMap.forEach((player) => {
      const isImpostor = player.id === this.impostorPlayerId;
      const role: ImpostorPlayerRole = isImpostor ? 'impostor' : 'villager';

      const privateRoleData: ImpostorPrivateRoleData = {
        playerId: player.id,
        role,
        category: this.category,
        categoryLabel: categoryConfig.name,
        // CRITICAL SECURITY: secretWord is NEVER sent to the impostor!
        secretWord: isImpostor ? undefined : this.secretWord,
        allCategories: allCategoryNames,
        camouflageThemes: IMPOSTOR_CAMOUFLAGE_THEMES[this.category] || [],
      };

      // Individual socket emit
      this.io?.to(player.socketId).emit('impostor:private-role', privateRoleData);
    });
  }

  public update(deltaTime: number): void {
    if (this.gameFinished && this.phase === 'result') return;

    this.phaseTimer -= deltaTime;

    // Run Bot AI update loop
    this.updateBots(deltaTime);

    if (this.phaseTimer <= 0) {
      this.advancePhaseOnTimeout();
    }
  }

  private advancePhaseOnTimeout(): void {
    switch (this.phase) {
      case 'role-reveal':
        this.transitionToCluePhase();
        break;

      case 'clue':
        this.handleClueTurnTimeout();
        break;

      case 'discussion':
        this.transitionToVotingPhase();
        break;

      case 'voting':
      case 'revote':
        this.tallyVotesAndAdvance();
        break;

      case 'impostor-guess':
        // Time ran out for impostor to guess! Villagers win!
        this.finishWithResult(
          'villagers',
          'Waktu menebak habis! Impostor tertangkap dan Warga Desa Menang!'
        );
        break;

      case 'result':
        // Round concluded
        break;
    }
  }

  private transitionToCluePhase(): void {
    this.phase = 'clue';
    this.currentClueTurnIndex = 0;
    this.phaseTotalTime = IMPOSTOR_PHASE_TIMERS.clueTurn;
    this.phaseTimer = this.phaseTotalTime;
    this.botClueTimer = 1.6 + Math.random() * 0.8;
  }

  private handleClueTurnTimeout(): void {
    const currentTurnPlayerId = this.playerOrder[this.currentClueTurnIndex];
    if (currentTurnPlayerId && !this.clueGivenByPlayer.has(currentTurnPlayerId)) {
      const player = this.playersMap.get(currentTurnPlayerId);
      // Auto-submit timeout placeholder clue
      this.recordClue(
        currentTurnPlayerId,
        player?.nickname || 'Warga',
        player?.avatar || 'budi',
        '...'
      );
    }
    this.advanceClueTurn();
  }

  private advanceClueTurn(): void {
    this.currentClueTurnIndex++;

    if (this.currentClueTurnIndex >= this.playerOrder.length) {
      // All players have given a clue -> transition to discussion
      this.transitionToDiscussionPhase();
    } else {
      // Next turn
      this.phaseTotalTime = IMPOSTOR_PHASE_TIMERS.clueTurn;
      this.phaseTimer = this.phaseTotalTime;
      this.botClueTimer = 1.6 + Math.random() * 0.8;
    }
  }

  private transitionToDiscussionPhase(): void {
    this.phase = 'discussion';
    this.phaseTotalTime = IMPOSTOR_PHASE_TIMERS.discussion;
    this.phaseTimer = this.phaseTotalTime;
    this.botChatCooldown = 3.5 + Math.random() * 3.0;
  }

  private transitionToVotingPhase(eligibleCandidates?: string[], isRevote: boolean = false): void {
    this.phase = isRevote ? 'revote' : 'voting';
    this.isRevote = isRevote;
    this.votes.clear();

    const activePlayerIds = Array.from(this.playersMap.keys());
    this.eligibleCandidates = eligibleCandidates || [...activePlayerIds];

    this.phaseTotalTime = isRevote ? IMPOSTOR_PHASE_TIMERS.revote : IMPOSTOR_PHASE_TIMERS.voting;
    this.phaseTimer = this.phaseTotalTime;

    // Initialize vote timers for bot players
    this.initBotVoteTimers();
  }

  private tallyVotesAndAdvance(): void {
    // Count votes for each candidate
    const voteCounts: Record<string, number> = {};
    const voterMap: Record<string, string[]> = {};

    this.eligibleCandidates.forEach(id => {
      voteCounts[id] = 0;
      voterMap[id] = [];
    });

    this.votes.forEach((targetId, voterId) => {
      if (this.eligibleCandidates.includes(targetId)) {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
        if (!voterMap[targetId]) voterMap[targetId] = [];
        voterMap[targetId].push(voterId);
      }
    });

    // Find highest vote count
    let maxVotes = 0;
    this.eligibleCandidates.forEach(id => {
      const c = voteCounts[id] || 0;
      if (c > maxVotes) maxVotes = c;
    });

    const topCandidates = this.eligibleCandidates.filter(id => (voteCounts[id] || 0) === maxVotes);

    // If zero votes cast by everyone: Impostor wins
    if (maxVotes === 0 || topCandidates.length === 0) {
      this.finishWithResult(
        'impostor',
        'Tidak ada pemain yang memberikan suara! Impostor berhasil lolos dan Menang!'
      );
      return;
    }

    // Check for tie
    if (topCandidates.length > 1) {
      if (!this.isRevote) {
        // First tie: Enter revote phase for tied candidates only
        this.transitionToVotingPhase(topCandidates, true);
        return;
      } else {
        // Second tie (tie after revote): Impostor wins!
        this.finishWithResult(
          'impostor',
          'Hasil voting tetap seri setelah revote! Impostor berhasil mengadu domba warga dan Menang!'
        );
        return;
      }
    }

    // Single top voted player
    const eliminatedPlayerId = topCandidates[0];
    const eliminatedPlayer = this.playersMap.get(eliminatedPlayerId);

    if (eliminatedPlayerId === this.impostorPlayerId) {
      // Impostor was voted! Transition to Impostor Guess phase
      this.caughtImpostorId = eliminatedPlayerId;
      this.phase = 'impostor-guess';
      this.phaseTotalTime = IMPOSTOR_PHASE_TIMERS.impostorGuess;
      this.phaseTimer = this.phaseTotalTime;
      this.botGuessTimer = 2.5;
    } else {
      // An innocent villager was voted! Impostor wins!
      this.finishWithResult(
        'impostor',
        `Warga salah menuduh ${eliminatedPlayer?.nickname || 'Warga Desa'}! Impostor berhasil lolos dan Menang!`
      );
    }
  }

  private finishWithResult(winner: 'villagers' | 'impostor', reason: string): void {
    this.winner = winner;
    this.winReason = reason;
    this.phase = 'result';
    this.phaseTotalTime = IMPOSTOR_PHASE_TIMERS.result;
    this.phaseTimer = this.phaseTotalTime;
    this.gameFinished = true;

    // Award scores based on rules:
    // - Villagers win (caught impostor, impostor failed guess): +2 points to every villager
    // - Impostor wins (wrong vote, correct word guess, tie revote): +5 points to the impostor
    // - Losers: 0 points
    const awardedScores: Record<string, number> = {};
    const playerIds = Array.from(this.playersMap.keys());

    playerIds.forEach(id => {
      let pointsToAdd = 0;
      if (winner === 'villagers' && id !== this.impostorPlayerId) {
        pointsToAdd = 2;
      } else if (winner === 'impostor' && id === this.impostorPlayerId) {
        pointsToAdd = 5;
      } else {
        pointsToAdd = 0;
      }

      awardedScores[id] = pointsToAdd;
      const currentScore = this.playerScores.get(id) || 0;
      const newScore = currentScore + pointsToAdd;
      this.playerScores.set(id, newScore);

      const p = this.playersMap.get(id);
      if (p) {
        p.score = newScore;
      }
    });

    // Build Leaderboard sorted by total score descending
    const leaderboard = playerIds.map(id => {
      const p = this.playersMap.get(id);
      return {
        playerId: id,
        nickname: p?.nickname || 'Pemain',
        avatar: p?.avatar || 'budi',
        role: (id === this.impostorPlayerId ? 'impostor' : 'villager') as ImpostorPlayerRole,
        isWinner: (winner === 'villagers' && id !== this.impostorPlayerId) || (winner === 'impostor' && id === this.impostorPlayerId),
        pointsAdded: awardedScores[id] || 0,
        totalScore: this.playerScores.get(id) || 0,
      };
    }).sort((a, b) => b.totalScore - a.totalScore);

    // Build vote summaries
    const voteSummaries: ImpostorVoteSummary[] = [];
    const voteCounts: Record<string, { count: number; voters: string[] }> = {};

    this.playersMap.forEach(p => {
      voteCounts[p.id] = { count: 0, voters: [] };
    });

    this.votes.forEach((targetId, voterId) => {
      if (voteCounts[targetId]) {
        voteCounts[targetId].count++;
        voteCounts[targetId].voters.push(voterId);
      }
    });

    this.playersMap.forEach(p => {
      const data = voteCounts[p.id] || { count: 0, voters: [] };
      voteSummaries.push({
        candidateId: p.id,
        candidateNickname: p.nickname,
        candidateAvatar: p.avatar,
        voteCount: data.count,
        voterIds: data.voters,
      });
    });

    // Sort vote summaries descending
    voteSummaries.sort((a, b) => b.voteCount - a.voteCount);

    const impostorPlayer = this.playersMap.get(this.impostorPlayerId);
    const votesRecord: Record<string, string> = {};
    this.votes.forEach((targetId, voterId) => {
      votesRecord[voterId] = targetId;
    });

    this.resultData = {
      winner,
      winReason: reason,
      impostorPlayerId: this.impostorPlayerId,
      impostorNickname: impostorPlayer?.nickname || 'Impostor',
      impostorAvatar: impostorPlayer?.avatar || 'budi',
      secretWord: this.secretWord,
      category: this.category,
      categoryLabel: IMPOSTOR_CATEGORIES[this.category]?.name || 'Pedesaan',
      votes: votesRecord,
      voteSummaries,
      impostorGuess: this.impostorGuess,
      guessIsCorrect: this.guessIsCorrect,
      awardedScores,
      leaderboard,
    };

    if (this.io) {
      this.io.to(this.roomId).emit('impostor:result', this.resultData);
    }
  }

  public handleInput(playerId: string, input: ImpostorInput | any): void {
    if (!input || typeof input !== 'object') return;

    switch (input.action) {
      case 'ready-role':
        this.handlePlayerReadyRole(playerId);
        break;

      case 'submit-clue':
        this.handleSubmitClue(playerId, input.clue);
        break;

      case 'start-voting':
        this.handleStartVoting(playerId);
        break;

      case 'submit-vote':
        this.handleSubmitVote(playerId, input.targetPlayerId);
        break;

      case 'submit-guess':
        this.handleSubmitGuess(playerId, input.guessedWord);
        break;

      case 'send-chat':
        this.handleSendChat(playerId, input.message);
        break;
    }
  }

  public containsForbiddenDiscussionWords(message: string): { isForbidden: boolean; word?: string } {
    const cleanMsg = (message || '').toLowerCase();
    const wordList = new Set<string>();

    // 1. The secret word itself
    if (this.secretWord && this.secretWord.length >= 2) {
      wordList.add(this.secretWord.toLowerCase());
    }

    // 2. All words in the active category
    const categoryConfig = IMPOSTOR_CATEGORIES[this.category];
    if (categoryConfig && categoryConfig.words) {
      categoryConfig.words.forEach(w => {
        if (w.length >= 2) wordList.add(w.toLowerCase());
      });
    }

    // 3. Related clue bank words for this secret word
    const clueBank = BOT_CLUES_BY_WORD[this.secretWord];
    if (clueBank) {
      clueBank.forEach(w => {
        if (w.length >= 2) wordList.add(w.toLowerCase());
      });
    }

    // 4. Clues already submitted by players in the clue phase
    this.clues.forEach(c => {
      if (c.clue && c.clue.trim().length >= 2) {
        wordList.add(c.clue.trim().toLowerCase());
      }
    });

    for (const forbidden of wordList) {
      if (forbidden.length < 2) continue;
      const escaped = forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9])${escaped}($|\\s|[^a-zA-Z0-9])`, 'i');
      if (regex.test(cleanMsg) || cleanMsg.includes(forbidden)) {
        return { isForbidden: true, word: forbidden };
      }
    }

    return { isForbidden: false };
  }

  private handleSendChat(playerId: string, rawMessage: string): void {
    const clean = (rawMessage || '').trim().substring(0, 60);
    if (!clean) return;

    const player = this.playersMap.get(playerId);
    if (!player) return;

    // Filter forbidden discussion words (secret word, category words, related clues)
    const forbiddenCheck = this.containsForbiddenDiscussionWords(clean);
    if (forbiddenCheck.isForbidden) {
      if (this.io && player.socketId && !player.isBot) {
        this.io.to(player.socketId).emit(
          'error:message',
          `Dilarang menyebut kata rahasia atau kata terkait ("${forbiddenCheck.word}") dalam diskusi!`
        );
      }
      return;
    }

    const msg: ImpostorChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      playerId: player.id,
      nickname: player.nickname,
      avatar: player.avatar,
      message: clean,
      timestamp: Date.now(),
    };

    this.chatMessages.push(msg);
    if (this.chatMessages.length > 20) {
      this.chatMessages.shift();
    }
  }

  private handlePlayerReadyRole(playerId: string): void {
    if (this.phase !== 'role-reveal') return;
    this.readyPlayers.add(playerId);

    // If all players are ready, advance immediately
    if (this.readyPlayers.size >= this.playersMap.size) {
      this.transitionToCluePhase();
    }
  }

  private handleSubmitClue(playerId: string, rawClue: string): void {
    if (this.phase !== 'clue') return;

    const currentTurnPlayerId = this.playerOrder[this.currentClueTurnIndex];
    if (currentTurnPlayerId !== playerId) return;
    if (this.clueGivenByPlayer.has(playerId)) return;

    const cleanClue = (rawClue || '').trim().substring(0, 40);
    if (!cleanClue) return;

    // Disallow typing the exact secret word
    if (cleanClue.toLowerCase() === this.secretWord.toLowerCase()) {
      const player = this.playersMap.get(playerId);
      if (player && this.io) {
        this.io.to(player.socketId).emit('error:message', 'Petunjuk tidak boleh menyebut kata rahasia secara persis!');
      }
      return;
    }

    // Disallow duplicate clues (case-insensitive check against already submitted clues this round)
    const isDuplicate = this.clues.some(c => c.clue.trim().toLowerCase() === cleanClue.toLowerCase());
    if (isDuplicate) {
      const player = this.playersMap.get(playerId);
      if (player && this.io) {
        this.io.to(player.socketId).emit(
          'error:message', 
          `Kata "${cleanClue}" sudah digunakan oleh warga lain! Berikan kata petunjuk yang berbeda.`
        );
      }
      return;
    }

    const player = this.playersMap.get(playerId);
    this.recordClue(
      playerId,
      player?.nickname || 'Pemain',
      player?.avatar || 'budi',
      cleanClue
    );

    this.advanceClueTurn();
  }

  private recordClue(playerId: string, nickname: string, avatar: AvatarId, clue: string): void {
    this.clueGivenByPlayer.add(playerId);
    this.clues.push({
      playerId,
      nickname,
      avatar,
      clue,
      turnNumber: this.clues.length + 1,
    });
  }

  private handleStartVoting(playerId: string): void {
    if (this.phase !== 'discussion') return;
    // Host or majority can initiate voting early
    this.transitionToVotingPhase();
  }

  private handleSubmitVote(voterPlayerId: string, targetPlayerId: string): void {
    if (this.phase !== 'voting' && this.phase !== 'revote') return;
    if (!this.playersMap.has(voterPlayerId)) return;
    if (voterPlayerId === targetPlayerId) return; // Cannot vote self
    if (!this.eligibleCandidates.includes(targetPlayerId)) return;
    if (this.votes.has(voterPlayerId)) return; // 1 vote per phase

    this.votes.set(voterPlayerId, targetPlayerId);

    // If all players have voted, tally immediately!
    const activePlayerCount = Array.from(this.playersMap.values()).filter(p => p.isConnected).length;
    if (this.votes.size >= activePlayerCount) {
      this.tallyVotesAndAdvance();
    }
  }

  private handleSubmitGuess(playerId: string, rawGuess: string): void {
    if (this.phase !== 'impostor-guess') return;
    if (playerId !== this.impostorPlayerId) return; // Only impostor can guess

    const cleanGuess = (rawGuess || '').trim();
    this.impostorGuess = cleanGuess;

    const isCorrect = cleanGuess.toLowerCase() === this.secretWord.toLowerCase();
    this.guessIsCorrect = isCorrect;

    if (isCorrect) {
      this.finishWithResult(
        'impostor',
        `Impostor berhasil menebak kata rahasia "${this.secretWord}" dan Menang!`
      );
    } else {
      this.finishWithResult(
        'villagers',
        `Tebakan Impostor ("${cleanGuess}") salah! Kata rahasianya adalah "${this.secretWord}". Warga Desa Menang!`
      );
    }
  }

  public handleSkill(_playerId: string, _skill: any): void {
    // Impostor Desa has no physical skills
  }

  public handlePlayerDisconnect(playerId: string): void {
    const player = this.playersMap.get(playerId);
    if (player) {
      player.isConnected = false;
    }

    // If disconnected player is currently on turn in clue phase, auto advance after 2s
    if (this.phase === 'clue') {
      const currentTurnPlayerId = this.playerOrder[this.currentClueTurnIndex];
      if (currentTurnPlayerId === playerId) {
        this.handleClueTurnTimeout();
      }
    }
  }

  public handlePlayerReconnect(player: Player): void {
    const existing = this.playersMap.get(player.id);
    if (existing) {
      existing.socketId = player.socketId;
      existing.isConnected = true;
    } else {
      this.playersMap.set(player.id, { ...player, isConnected: true });
    }

    // Send private role securely to reconnected player
    if (this.io && this.phase !== 'result') {
      const isImpostor = player.id === this.impostorPlayerId;
      const role: ImpostorPlayerRole = isImpostor ? 'impostor' : 'villager';
      const categoryConfig = IMPOSTOR_CATEGORIES[this.category];

      const privateRoleData: ImpostorPrivateRoleData = {
        playerId: player.id,
        role,
        category: this.category,
        categoryLabel: categoryConfig?.name || 'Pedesaan',
        secretWord: isImpostor ? undefined : this.secretWord,
        allCategories: Object.values(IMPOSTOR_CATEGORIES).map(c => c.name),
        camouflageThemes: IMPOSTOR_CAMOUFLAGE_THEMES[this.category] || [],
      };

      this.io.to(player.socketId).emit('impostor:private-role', privateRoleData);
    }
  }

  public isFinished(): boolean {
    return this.gameFinished;
  }

  public getState(): ImpostorPublicGameState {
    const playersPublic: Record<string, ImpostorPlayerPublic> = {};

    this.playersMap.forEach(p => {
      playersPublic[p.id] = {
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        isConnected: p.isConnected,
        isReadyForRole: this.readyPlayers.has(p.id),
        hasGivenClue: this.clueGivenByPlayer.has(p.id),
        hasVoted: this.votes.has(p.id),
        isHost: p.isHost,
        isBot: p.isBot,
        score: this.playerScores.get(p.id) || 0,
      };
    });

    const currentTurnPlayerId = 
      this.phase === 'clue' && this.currentClueTurnIndex < this.playerOrder.length 
        ? this.playerOrder[this.currentClueTurnIndex] 
        : null;

    // Public state NEVER reveals secretWord, impostorPlayerId, or who voted for whom!
    return {
      gameId: 'impostor-desa',
      gameMode: 'impostor-classic',
      status: this.gameFinished ? 'finished' : 'in-game',
      phase: this.phase,
      phaseTimeRemaining: Math.max(0, Math.ceil(this.phaseTimer)),
      phaseTotalTime: this.phaseTotalTime,
      roundNumber: this.roundNumber,
      category: this.category,
      categoryLabel: IMPOSTOR_CATEGORIES[this.category]?.name || 'Pedesaan',
      players: playersPublic,
      playerOrder: this.playerOrder,
      currentClueTurnIndex: this.currentClueTurnIndex,
      currentTurnPlayerId,
      clues: this.clues,
      eligibleCandidateIds: this.eligibleCandidates,
      votedPlayerIds: Array.from(this.votes.keys()),
      chatMessages: this.chatMessages,
      caughtImpostorId: this.caughtImpostorId,
      impostorGuess: this.impostorGuess,
      guessIsCorrect: this.guessIsCorrect,
      winner: this.winner,
      winReason: this.winReason,
      resultData: this.resultData,
    };
  }

  public getResults(): GameResultData {
    const rankings = Array.from(this.playersMap.values()).map((p) => {
      const isWinner = this.winner === 'impostor' 
        ? p.id === this.impostorPlayerId 
        : p.id !== this.impostorPlayerId;
      return {
        playerId: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        rank: isWinner ? 1 : 2,
        finalHeight: isWinner ? 100 : 0,
        fallCount: 0,
        skillsUsedCount: 0,
        score: isWinner ? 1000 : 250,
      };
    });

    return {
      gameId: 'impostor-desa',
      gameMode: (this.settings?.gameMode || 'impostor-classic') as GameMode,
      winner: rankings.find(r => r.rank === 1) || null,
      rankings,
      endedAt: Date.now(),
    };
  }

  // --- Bot AI Simulation Methods (Mode Latihan) ---
  private initBotState(): void {
    this.botReadyTimers.clear();
    this.botVoteTimers.clear();
    this.botClueTimer = 1.6 + Math.random() * 0.8;
    this.botChatCooldown = 4.0 + Math.random() * 3.0;
    this.botGuessTimer = 2.5;

    // Stagger bot ready times between 0.8s and 2.5s
    let delay = 0.8;
    this.playersMap.forEach((player) => {
      if (player.isBot) {
        this.botReadyTimers.set(player.id, delay);
        delay += 0.6 + Math.random() * 0.4;
      }
    });
  }

  private initBotVoteTimers(): void {
    this.botVoteTimers.clear();
    this.playersMap.forEach((player) => {
      if (player.isBot) {
        this.botVoteTimers.set(player.id, 1.5 + Math.random() * 2.0);
      }
    });
  }

  private updateBots(deltaTime: number): void {
    if (this.gameFinished) return;

    // 1. Role Reveal Phase: bots automatically ready up
    if (this.phase === 'role-reveal') {
      const readyKeys = Array.from(this.botReadyTimers.keys());
      for (const botId of readyKeys) {
        const timer = (this.botReadyTimers.get(botId) || 0) - deltaTime;
        if (timer <= 0) {
          this.botReadyTimers.delete(botId);
          this.handlePlayerReadyRole(botId);
        } else {
          this.botReadyTimers.set(botId, timer);
        }
      }
    }

    // 2. Clue Phase: if current turn is a bot, bot submits clue
    else if (this.phase === 'clue') {
      const currentTurnPlayerId = this.playerOrder[this.currentClueTurnIndex];
      const currentPlayer = this.playersMap.get(currentTurnPlayerId);

      if (currentPlayer?.isBot && !this.clueGivenByPlayer.has(currentTurnPlayerId)) {
        this.botClueTimer -= deltaTime;
        if (this.botClueTimer <= 0) {
          const clue = this.generateBotClue(currentTurnPlayerId);
          this.handleSubmitClue(currentTurnPlayerId, clue);
          this.botClueTimer = 1.6 + Math.random() * 0.8;
        }
      }
    }

    // 3. Discussion Phase: bots drop realistic debate chats
    else if (this.phase === 'discussion') {
      this.botChatCooldown -= deltaTime;
      if (this.botChatCooldown <= 0) {
        const bots = Array.from(this.playersMap.values()).filter(p => p.isBot);
        if (bots.length > 0) {
          const speakingBot = bots[Math.floor(Math.random() * bots.length)];
          const chatMsg = this.generateBotChatMessage(speakingBot.id);
          if (chatMsg) {
            this.handleSendChat(speakingBot.id, chatMsg);
          }
        }
        this.botChatCooldown = 6.0 + Math.random() * 6.0;
      }
    }

    // 4. Voting / Revote Phase: bots cast intelligent votes
    else if (this.phase === 'voting' || this.phase === 'revote') {
      const botVoteKeys = Array.from(this.botVoteTimers.keys());
      for (const botId of botVoteKeys) {
        const timer = (this.botVoteTimers.get(botId) || 0) - deltaTime;
        if (timer <= 0) {
          this.botVoteTimers.delete(botId);
          if (!this.votes.has(botId)) {
            const targetId = this.generateBotVote(botId);
            if (targetId) {
              this.handleSubmitVote(botId, targetId);
            }
          }
        } else {
          this.botVoteTimers.set(botId, timer);
        }
      }
    }

    // 5. Impostor Guess Phase: if caught impostor is a bot, bot guesses
    else if (this.phase === 'impostor-guess') {
      if (this.caughtImpostorId && this.playersMap.get(this.caughtImpostorId)?.isBot) {
        this.botGuessTimer -= deltaTime;
        if (this.botGuessTimer <= 0) {
          const guess = this.generateBotImpostorGuess();
          this.handleSubmitGuess(this.caughtImpostorId, guess);
        }
      }
    }
  }

  private generateBotClue(botId: string): string {
    const isImpostor = botId === this.impostorPlayerId;
    const existingClues = new Set(this.clues.map(c => c.clue.trim().toLowerCase()));

    if (isImpostor) {
      // Impostor bot camouflages intelligently using high-plausibility deceptive category traits!
      const pool = BOT_DECEPTIVE_IMPOSTOR_CLUES[this.category] || [
        'Pedesaan', 'Tradisi', 'Hijau', 'Keluarga', 'Gotong royong', 'Suasana asri', 'Khas desa'
      ];
      // Randomize selection so each round has different camouflage choices
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const available = shuffled.filter(w => !existingClues.has(w.toLowerCase()));

      if (available.length > 0) {
        return available[0];
      }

      // Extended fallback if all category disguise clues were already used
      const extendedPool = ['Masyarakat', 'Daerah', 'Kegiatan', 'Benda', 'Tradisional', 'Nuansa', 'Khas desa', 'Suasana'];
      const availableExtended = extendedPool.filter(w => !existingClues.has(w.toLowerCase()));
      return availableExtended.length > 0 
        ? availableExtended[0]
        : `Unik-${this.clues.length + 1}`;
    } else {
      // Villager bot knows secret word
      const wordBank = BOT_CLUES_BY_WORD[this.secretWord] || [];
      const shuffledWordBank = [...wordBank].sort(() => Math.random() - 0.5);
      const availableWordBank = shuffledWordBank.filter(w => !existingClues.has(w.toLowerCase()));
      if (availableWordBank.length > 0) {
        return availableWordBank[0];
      }

      // Fallback related words from category themes
      const themes = IMPOSTOR_CAMOUFLAGE_THEMES[this.category] || [];
      const availableThemes = themes.filter(t => !existingClues.has(t.toLowerCase()));
      if (availableThemes.length > 0) {
        return availableThemes[Math.floor(Math.random() * availableThemes.length)];
      }

      // Fallback related words from category list (excluding secret word and existing clues)
      const categoryConfig = IMPOSTOR_CATEGORIES[this.category];
      if (categoryConfig && categoryConfig.words) {
        const related = categoryConfig.words.filter(
          w => w.toLowerCase() !== this.secretWord.toLowerCase() && !existingClues.has(w.toLowerCase())
        );
        if (related.length > 0) {
          return related[Math.floor(Math.random() * related.length)];
        }
      }

      // Safe fallback adjectives that haven't been used
      const genericWords = ['Bermanfaat', 'Khas desa', 'Penting', 'Unik', 'Dikenal warga', 'Nyata'];
      const availableGeneric = genericWords.filter(w => !existingClues.has(w.toLowerCase()));
      return availableGeneric.length > 0 
        ? availableGeneric[0] 
        : `Petunjuk-${this.clues.length + 1}`;
    }
  }

  private generateBotChatMessage(botId: string): string {
    const isImpostor = botId === this.impostorPlayerId;
    const otherPlayers = Array.from(this.playersMap.values()).filter(p => p.id !== botId);
    if (otherPlayers.length === 0) return '';
    const randomTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];

    const targetClueEntry = this.clues.find(c => c.playerId === randomTarget.id);
    const myClueEntry = this.clues.find(c => c.playerId === botId);

    if (isImpostor) {
      const targetName = randomTarget.nickname;
      const targetClue = targetClueEntry ? `"${targetClueEntry.clue}"` : 'tadi';
      const myClue = myClueEntry ? `"${myClueEntry.clue}"` : 'kataku';

      const impostorBluffs = [
        `Petunjukku ${myClue} jelas nyambung banget sama tema ${IMPOSTOR_CATEGORIES[this.category]?.name || 'desa'}!`,
        `Kok kamu curiga ke aku? Petunjuknya ${targetName} ${targetClue} malah agak aneh gak sih?`,
        `Awas jangan kejebak warga! Aku warga asli, coba perhatikan lagi petunjuk si ${targetName}.`,
        `Tunggu dulu, ${targetName} kok petunjuknya agak melenceng dari temanya ya?`,
        `Aku yakin banget petunjukku cocok, jangan sampai salah tuduh ya warga!`,
      ];
      return impostorBluffs[Math.floor(Math.random() * impostorBluffs.length)];
    } else {
      // Villager bot with authentic deduction skepticism
      const targetName = randomTarget.nickname;
      const targetClue = targetClueEntry ? `"${targetClueEntry.clue}"` : 'dia';

      const villagerLines = [
        `Petunjuk ${targetName} ${targetClue} kok agak mengambang ya? Apa dia impostor?`,
        `Aku ngerasa petunjuk ${targetName} agak mencurigakan, kurang pas sama kataku.`,
        `Petunjukku aman banget kok buat warga yang beneran tahu katanya.`,
        `Antara ${targetName} sama yang lain nih, siapa yang cuma pura-pura tahu?`,
        `Hati-hati ya warga desa, impostor pasti cari aman pakai kata yang terlalu umum!`,
      ];
      return villagerLines[Math.floor(Math.random() * villagerLines.length)];
    }
  }

  private generateBotVote(botId: string): string | null {
    const isImpostor = botId === this.impostorPlayerId;
    const candidates = this.eligibleCandidates.filter(id => id !== botId);
    if (candidates.length === 0) return null;

    if (isImpostor) {
      // Impostor bot tries to survive by framing a villager with an ambiguous clue or voting random
      return candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      // Villagers calculate suspicion based on clues
      const candidateScores = new Map<string, number>();
      const deceptiveWords = BOT_DECEPTIVE_IMPOSTOR_CLUES[this.category] || [];

      for (const candidateId of candidates) {
        let score = 1 + Math.random() * 2; // Baseline noise
        const clueEntry = this.clues.find(c => c.playerId === candidateId);
        
        if (clueEntry) {
          const clueLower = clueEntry.clue.trim().toLowerCase();
          // Did candidate use a generic camouflage word?
          const isDeceptiveWord = deceptiveWords.some(dw => dw.toLowerCase() === clueLower);
          if (isDeceptiveWord) {
            score += 3.5;
          }
        }

        // Slight natural deduction weight towards the actual impostor
        if (candidateId === this.impostorPlayerId) {
          score += 2.5;
        }

        candidateScores.set(candidateId, score);
      }

      // Pick candidate with highest suspicion
      let highestCandidate = candidates[0];
      let highestScore = -1;
      for (const candidateId of candidates) {
        const score = candidateScores.get(candidateId) || 0;
        if (score > highestScore) {
          highestScore = score;
          highestCandidate = candidateId;
        }
      }

      return highestCandidate;
    }
  }

  private generateBotImpostorGuess(): string {
    // 35% chance to guess correct
    if (Math.random() < 0.35) {
      return this.secretWord;
    }
    const categoryConfig = IMPOSTOR_CATEGORIES[this.category];
    const pool = categoryConfig.words;
    return pool[Math.floor(Math.random() * pool.length)] || this.secretWord;
  }

  public cleanup(): void {
    this.playersMap.clear();
    this.clues = [];
    this.clueGivenByPlayer.clear();
    this.votes.clear();
    this.chatMessages = [];
    this.readyPlayers.clear();
    this.io = null;
  }

  // --- Exposed helpers for Unit Testing & Deterministic assertions ---
  public _getSecretWord(): string {
    return this.secretWord;
  }

  public _getImpostorPlayerId(): string {
    return this.impostorPlayerId;
  }

  public _setImpostorPlayerId(id: string): void {
    this.impostorPlayerId = id;
  }

  public _setSecretWord(word: string): void {
    this.secretWord = word;
  }

  public _setCategory(category: ImpostorCategory): void {
    this.category = category;
  }

  public _forcePhase(phase: ImpostorPhase, timer: number = 20): void {
    this.phase = phase;
    this.phaseTimer = timer;
    this.phaseTotalTime = timer;
  }
}
