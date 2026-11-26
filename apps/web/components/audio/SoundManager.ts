// Procedural Studio-Grade Web Audio API Sound & Multi-Genre Soundtrack Engine for GameHouse

export type MusicTrackId = 'lobby' | 'ludo' | 'snake-ladder' | 'impostor-desa' | 'hidden-team' | 'panjat-pinang';

export const MUSIC_TRACK_META: Record<MusicTrackId, { label: string; emoji: string; genre: string }> = {
  lobby: { label: 'Party Lounge', emoji: '🪩', genre: 'Funky Synth-Pop Groove' },
  ludo: { label: 'Board Bounce', emoji: '🎲', genre: 'Playful Marimba Jazz' },
  'snake-ladder': { label: 'Ular Rimba', emoji: '🐍', genre: 'Tropical Jungle Bounce' },
  'impostor-desa': { label: 'Misteri Kampung', emoji: '🔍', genre: 'Sneaky Detective Chimes' },
  'hidden-team': { label: 'Dewan Noir', emoji: '🕵️', genre: 'Cyber-Noir Espionage' },
  'panjat-pinang': { label: 'Pesta 17-an', emoji: '🥁', genre: 'Festive Gamelan Party' },
};

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.55;
  private bgmVolume: number = 0.36;

  // Audio Routing Bus
  private bgmBus: GainNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;
  private bgmCompressor: DynamicsCompressorNode | null = null;
  private bgmGain: GainNode | null = null;
  private delaySend: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Sequencer State
  private bgmInterval: any = null;
  private isBgmPlaying: boolean = false;
  private currentStep: number = 0;
  private nextNoteTime: number = 0;
  private currentTrack: MusicTrackId = 'lobby';
  private trackListeners: Set<(info: { playing: boolean; track: MusicTrackId }) => void> = new Set();
  private musicListeners: Set<(playing: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('gh_audio_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      this.setupAutoUnlock();
    }
  }

  private setupAutoUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (!this.isMuted && !this.isBgmPlaying) {
        this.startBGM(this.currentTrack);
      }
    };

    try {
      this.initContext();
      if (!this.isMuted) {
        this.startBGM(this.currentTrack);
      }
    } catch {}

    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    window.addEventListener('click', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // Pre-generate crisp white noise buffer for realistic shakers, hats, snares
        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * 1.0;
        const buffer = this.ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buffer;

        // SFX Bus
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        this.sfxGain.connect(this.ctx.destination);

        // Studio Master BGM Chain: bgmBus -> Warm Lowpass -> Compressor -> bgmGain -> destination
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.isMuted ? 0 : this.bgmVolume * this.volume, this.ctx.currentTime);
        this.bgmGain.connect(this.ctx.destination);

        this.bgmCompressor = this.ctx.createDynamicsCompressor();
        this.bgmCompressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
        this.bgmCompressor.knee.setValueAtTime(20, this.ctx.currentTime);
        this.bgmCompressor.ratio.setValueAtTime(4, this.ctx.currentTime);
        this.bgmCompressor.attack.setValueAtTime(0.01, this.ctx.currentTime);
        this.bgmCompressor.release.setValueAtTime(0.18, this.ctx.currentTime);
        this.bgmCompressor.connect(this.bgmGain);

        this.bgmFilter = this.ctx.createBiquadFilter();
        this.bgmFilter.type = 'lowpass';
        this.bgmFilter.frequency.setValueAtTime(5200, this.ctx.currentTime);
        this.bgmFilter.Q.setValueAtTime(0.6, this.ctx.currentTime);
        this.bgmFilter.connect(this.bgmCompressor);

        this.bgmBus = this.ctx.createGain();
        this.bgmBus.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.bgmBus.connect(this.bgmFilter);

        // Stereo-feel Echo / Atmosphere Delay Send
        const delayNode = this.ctx.createDelay(1.0);
        delayNode.delayTime.setValueAtTime(0.32, this.ctx.currentTime);

        const delayFilter = this.ctx.createBiquadFilter();
        delayFilter.type = 'lowpass';
        delayFilter.frequency.setValueAtTime(1900, this.ctx.currentTime);

        const delayFeedback = this.ctx.createGain();
        delayFeedback.gain.setValueAtTime(0.26, this.ctx.currentTime);

        const delayWet = this.ctx.createGain();
        delayWet.gain.setValueAtTime(0.28, this.ctx.currentTime);

        this.delaySend = this.ctx.createGain();
        this.delaySend.gain.setValueAtTime(1.0, this.ctx.currentTime);

        this.delaySend.connect(delayNode);
        delayNode.connect(delayFilter);
        delayFilter.connect(delayFeedback);
        delayFeedback.connect(delayNode);
        delayFilter.connect(delayWet);
        delayWet.connect(this.bgmCompressor);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('gh_audio_muted', String(muted));
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(muted ? 0 : this.bgmVolume * this.volume, this.ctx.currentTime, 0.04);
    }
    this.notifyListeners();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    if (!this.isMuted && !this.isBgmPlaying) {
      this.startBGM(this.currentTrack);
    }
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx && !this.isMuted) {
      this.sfxGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
    if (this.bgmGain && this.ctx && !this.isMuted) {
      this.bgmGain.gain.setTargetAtTime(this.bgmVolume * this.volume, this.ctx.currentTime, 0.03);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getCurrentTrack(): MusicTrackId {
    return this.currentTrack;
  }

  public isBGMActive(): boolean {
    return this.isBgmPlaying && !this.isMuted;
  }

  public subscribeMusicChange(listener: (playing: boolean) => void): () => void {
    this.musicListeners.add(listener);
    listener(this.isBGMActive());
    return () => {
      this.musicListeners.delete(listener);
    };
  }

  public subscribeTrackChange(listener: (info: { playing: boolean; track: MusicTrackId }) => void): () => void {
    this.trackListeners.add(listener);
    listener({ playing: this.isBGMActive(), track: this.currentTrack });
    return () => {
      this.trackListeners.delete(listener);
    };
  }

  private notifyListeners() {
    const active = this.isBGMActive();
    this.musicListeners.forEach((l) => {
      try { l(active); } catch {}
    });
    this.trackListeners.forEach((l) => {
      try { l({ playing: active, track: this.currentTrack }); } catch {}
    });
  }

  // =========================================================================
  // 1. MULTI-GENRE PROCEDURAL SOUNDTRACK ENGINE (128-STEP 8-BAR COMPOSITIONS)
  // =========================================================================
  public startBGM(track: MusicTrackId = 'lobby') {
    this.initContext();
    if (!this.ctx) return;

    if (this.isBgmPlaying && this.currentTrack === track) return;
    if (this.isBgmPlaying) {
      this.stopBGM(false);
    }

    this.currentTrack = track;
    this.isBgmPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.06;

    if (this.bgmGain) {
      this.bgmGain.gain.setValueAtTime(this.isMuted ? 0 : this.bgmVolume * this.volume, this.ctx.currentTime);
    }

    // Step duration (16th notes):
    // lobby: ~116 BPM (0.129s) | ludo: ~120 BPM (0.125s) | impostor-desa: ~108 BPM (0.139s)
    // hidden-team: ~114 BPM (0.131s) | panjat-pinang: ~130 BPM (0.115s)
    const stepDurations: Record<MusicTrackId, number> = {
      lobby: 0.129,
      ludo: 0.125,
      'snake-ladder': 0.122,
      'impostor-desa': 0.139,
      'hidden-team': 0.131,
      'panjat-pinang': 0.115,
    };
    const stepDuration = stepDurations[track] || 0.129;
    const lookAhead = 0.16;

    this.bgmInterval = setInterval(() => {
      if (!this.ctx || !this.isBgmPlaying) return;
      while (this.nextNoteTime < this.ctx.currentTime + lookAhead) {
        switch (this.currentTrack) {
          case 'ludo':
            this.scheduleLudoStep(this.currentStep, this.nextNoteTime);
            break;
          case 'snake-ladder':
            this.scheduleSnakeLadderStep(this.currentStep, this.nextNoteTime);
            break;
          case 'impostor-desa':
            this.scheduleImpostorStep(this.currentStep, this.nextNoteTime);
            break;
          case 'hidden-team':
            this.scheduleHiddenTeamStep(this.currentStep, this.nextNoteTime);
            break;
          case 'panjat-pinang':
            this.schedulePanjatStep(this.currentStep, this.nextNoteTime);
            break;
          case 'lobby':
          default:
            this.scheduleLobbyStep(this.currentStep, this.nextNoteTime);
            break;
        }
        this.nextNoteTime += stepDuration;
        this.currentStep = (this.currentStep + 1) % 128; // 8 bars (Section A + Section B)
      }
    }, 25);

    this.notifyListeners();
  }

  public playPanjatBGM() { this.startBGM('panjat-pinang'); }
  public playLudoBGM() { this.startBGM('ludo'); }
  public playSnakeLadderBGM() { this.startBGM('snake-ladder'); }
  public playLobbyBGM() { this.startBGM('lobby'); }
  public playImpostorBGM() { this.startBGM('impostor-desa'); }
  public playHiddenTeamBGM() { this.startBGM('hidden-team'); }

  public cycleTrack(): MusicTrackId {
    const order: MusicTrackId[] = ['lobby', 'ludo', 'snake-ladder', 'impostor-desa', 'hidden-team', 'panjat-pinang'];
    const idx = order.indexOf(this.currentTrack);
    const next = order[(idx + 1) % order.length];
    if (this.isMuted) {
      this.setMuted(false);
    }
    this.startBGM(next);
    return next;
  }

  public stopBGM(notify: boolean = true) {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.isBgmPlaying = false;
    if (notify) {
      this.notifyListeners();
    }
  }

  public toggleMusic(): boolean {
    if (this.isBGMActive()) {
      this.setMuted(true);
      return false;
    } else {
      this.setMuted(false);
      this.startBGM(this.currentTrack);
      return true;
    }
  }

  // =========================================================================
  // TRACK A: LOBBY — "PARTY LOUNGE GROOVE" (Upbeat Funky Rhodes & Synth-Pop, 116 BPM)
  // =========================================================================
  private scheduleLobbyStep(step: number, time: number) {
    if (!this.ctx || !this.bgmBus || this.isMuted) return;

    const bar = Math.floor(step / 16); // 0..7
    const stepInBar = step % 16;

    // 1. Crisp Funk Drums
    if (stepInBar === 0 || stepInBar === 10 || (bar % 2 === 1 && stepInBar === 6)) {
      this.playWarmKick(time, 0.34);
    }
    if (stepInBar === 4 || stepInBar === 12) {
      this.playNoiseSnare(time, 0.16);
    }
    if (step % 2 === 0) {
      this.playNoiseHihat(time, stepInBar % 4 === 2 ? 0.05 : 0.025, stepInBar === 14 ? 0.08 : 0.03);
    }
    // Fill on bar 7 end
    if (bar === 7 && (stepInBar === 13 || stepInBar === 14 || stepInBar === 15)) {
      this.playNoiseSnare(time, 0.11);
    }

    // 2. Lush Neo-Soul / Nintendo-Party Rhodes Chords (Fmaj7 - Em7 - Dm7 - G13 | Fmaj7 - E7 - Am9 - G13)
    const chordMap: Record<number, number[]> = {
      0: [349.23, 440.00, 523.25, 659.25], // Fmaj7
      16: [329.63, 392.00, 493.88, 587.33], // Em7
      32: [293.66, 349.23, 440.00, 523.25], // Dm7
      48: [392.00, 493.88, 587.33, 659.25], // G13
      64: [349.23, 440.00, 523.25, 659.25], // Fmaj7
      80: [329.63, 415.30, 493.88, 587.33], // E7
      96: [220.00, 329.63, 392.00, 493.88], // Am9
      112: [392.00, 493.88, 587.33, 698.46], // G9sus4
    };
    if (chordMap[step]) {
      this.playRhodesChord(time, chordMap[step], 0.9, 0.09);
    }
    // Syncopated chord comp stab on stepInBar 6 & 14
    if (stepInBar === 6 || stepInBar === 14) {
      const barChord = chordMap[bar * 16];
      if (barChord) {
        this.playRhodesChord(time, barChord, 0.16, 0.06);
      }
    }

    // 3. Bouncy Funk Sub Bassline
    const bassRoots = [87.31, 82.41, 73.42, 98.00, 87.31, 82.41, 110.00, 98.00];
    const root = bassRoots[bar];
    if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10) {
      this.playSubBass(time, root, 0.22, 0.28);
    } else if (stepInBar === 3 || stepInBar === 14) {
      this.playSubBass(time, root * 2.0, 0.12, 0.20); // funky octave slap
    } else if (stepInBar === 15) {
      this.playSubBass(time, root * 1.5, 0.10, 0.18); // fifth pick-up
    }

    // 4. Catchy Lead Synth-Bell Melody (A Section + B Section variation)
    const melodyA: Record<number, { freq: number; dur: number }> = {
      0: { freq: 659.25, dur: 0.20 }, // E5
      3: { freq: 783.99, dur: 0.16 }, // G5
      6: { freq: 880.00, dur: 0.28 }, // A5
      10: { freq: 783.99, dur: 0.18 }, // G5
      12: { freq: 659.25, dur: 0.22 }, // E5
      16: { freq: 587.33, dur: 0.20 }, // D5
      19: { freq: 659.25, dur: 0.18 }, // E5
      22: { freq: 783.99, dur: 0.30 }, // G5
      28: { freq: 587.33, dur: 0.20 }, // D5
      32: { freq: 523.25, dur: 0.20 }, // C5
      35: { freq: 587.33, dur: 0.18 }, // D5
      38: { freq: 659.25, dur: 0.26 }, // E5
      42: { freq: 523.25, dur: 0.18 }, // C5
      48: { freq: 587.33, dur: 0.24 }, // D5
      52: { freq: 659.25, dur: 0.18 }, // E5
      56: { freq: 783.99, dur: 0.34 }, // G5
      62: { freq: 880.00, dur: 0.14 }, // A5
    };
    const melodyB: Record<number, { freq: number; dur: number }> = {
      64: { freq: 1046.50, dur: 0.22 }, // C6
      67: { freq: 880.00, dur: 0.18 }, // A5
      70: { freq: 783.99, dur: 0.28 }, // G5
      74: { freq: 659.25, dur: 0.20 }, // E5
      80: { freq: 783.99, dur: 0.20 }, // G5
      83: { freq: 830.61, dur: 0.20 }, // G#5 (soulful E7 lift!)
      86: { freq: 987.77, dur: 0.30 }, // B5
      92: { freq: 830.61, dur: 0.18 }, // G#5
      96: { freq: 880.00, dur: 0.22 }, // A5
      99: { freq: 1046.50, dur: 0.18 }, // C6
      102: { freq: 1174.66, dur: 0.28 }, // D6
      108: { freq: 1046.50, dur: 0.18 }, // C6
      112: { freq: 987.77, dur: 0.22 }, // B5
      116: { freq: 880.00, dur: 0.18 }, // A5
      120: { freq: 783.99, dur: 0.36 }, // G5
      124: { freq: 659.25, dur: 0.16 }, // E5
    };
    const note = melodyA[step] || melodyB[step];
    if (note) {
      this.playFunkPluck(time, note.freq, note.dur, 0.13, true);
    }
  }

  // =========================================================================
  // TRACK B: LUDO PARTY — "BOARD GAME BOUNCE" (120 BPM, 128 Steps)
  // =========================================================================
  private scheduleLudoStep(step: number, time: number) {
    if (!this.ctx || !this.bgmBus || this.isMuted) return;
    const bar = Math.floor(step / 16);
    const stepInBar = step % 16;

    // 1. Acoustic Kick, Woodblock Rim, Crispy Shaker
    if (stepInBar === 0 || stepInBar === 8 || (bar % 2 === 1 && stepInBar === 10)) {
      this.playWarmKick(time, 0.28);
    }
    if (stepInBar === 4 || stepInBar === 12 || step % 32 === 14) {
      this.playWoodblock(time, stepInBar === 12);
    }
    if (step % 2 === 1) {
      this.playNoiseHihat(time, stepInBar % 4 === 3 ? 0.04 : 0.02, 0.025);
    }
    if (step === 0 || step === 64) {
      this.playAgogoBell(time, step === 0 ? 880 : 1046.5);
    }

    // 2. Warm Upright Bass Walking Line (8 bars: C - Am - Dm - G | C - E7 - F - G7)
    const ludoBassPattern: Record<number, number> = {
      0: 130.81, 4: 164.81, 8: 196.00, 12: 220.00,
      16: 110.00, 20: 130.81, 24: 146.83, 28: 174.61,
      32: 146.83, 36: 174.61, 40: 220.00, 44: 196.00,
      48: 98.00, 52: 123.47, 56: 146.83, 60: 174.61,
      64: 130.81, 68: 196.00, 72: 164.81, 76: 130.81,
      80: 164.81, 84: 207.65, 88: 246.94, 92: 164.81,
      96: 174.61, 100: 220.00, 104: 261.63, 108: 196.00,
      112: 196.00, 116: 174.61, 120: 146.83, 124: 98.00,
    };
    if (ludoBassPattern[step]) {
      this.playSubBass(time, ludoBassPattern[step], 0.21, 0.24);
    }

    // 3. Playful Marimba & Kalimba Dual Melody
    const ludoMelody: Record<number, { freq: number; dur: number }> = {
      0: { freq: 523.25, dur: 0.15 }, 3: { freq: 659.25, dur: 0.15 }, 6: { freq: 783.99, dur: 0.18 }, 10: { freq: 659.25, dur: 0.15 }, 12: { freq: 880.00, dur: 0.22 },
      16: { freq: 783.99, dur: 0.16 }, 20: { freq: 659.25, dur: 0.16 }, 24: { freq: 523.25, dur: 0.18 }, 28: { freq: 587.33, dur: 0.24 },
      32: { freq: 698.46, dur: 0.16 }, 35: { freq: 587.33, dur: 0.16 }, 38: { freq: 659.25, dur: 0.16 }, 42: { freq: 698.46, dur: 0.16 }, 44: { freq: 880.00, dur: 0.22 },
      48: { freq: 783.99, dur: 0.18 }, 52: { freq: 659.25, dur: 0.16 }, 56: { freq: 587.33, dur: 0.28 }, 60: { freq: 783.99, dur: 0.12 }, 62: { freq: 880.00, dur: 0.12 },
      // Section B
      64: { freq: 1046.50, dur: 0.18 }, 67: { freq: 987.77, dur: 0.16 }, 70: { freq: 880.00, dur: 0.20 }, 74: { freq: 783.99, dur: 0.18 },
      80: { freq: 830.61, dur: 0.18 }, 84: { freq: 987.77, dur: 0.18 }, 88: { freq: 1046.50, dur: 0.24 }, 92: { freq: 830.61, dur: 0.16 },
      96: { freq: 880.00, dur: 0.18 }, 100: { freq: 1046.50, dur: 0.18 }, 104: { freq: 1174.66, dur: 0.24 }, 108: { freq: 1046.50, dur: 0.18 },
      112: { freq: 987.77, dur: 0.18 }, 116: { freq: 880.00, dur: 0.18 }, 120: { freq: 783.99, dur: 0.30 }, 124: { freq: 659.25, dur: 0.14 },
    };
    if (ludoMelody[step]) {
      this.playMarimba(time, ludoMelody[step].freq, ludoMelody[step].dur, true);
    }

    // 4. Upbeat Chords on off-beats
    if (stepInBar === 2 || stepInBar === 10) {
      const chords = bar < 4
        ? [[523.25, 659.25], [440.00, 523.25], [587.33, 698.46], [587.33, 783.99]][bar]
        : [[523.25, 783.99], [493.88, 830.61], [523.25, 880.00], [587.33, 783.99]][bar - 4];
      chords.forEach((f) => this.playMarimbaChime(time, f, 0.08));
    }
  }

  // =========================================================================
  // TRACK B2: ULAR TANGGA 2.5D — "ULAR RIMBA" (Tropical Jungle Marimba)
  // =========================================================================
  private scheduleSnakeLadderStep(step: number, time: number) {
    if (!this.ctx || !this.bgmBus || this.isMuted) return;
    const bar = Math.floor(step / 16);
    const stepInBar = step % 16;

    if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10) {
      this.playWarmKick(time, stepInBar === 0 ? 0.30 : 0.22);
    }
    if (stepInBar === 4 || stepInBar === 12 || stepInBar === 15) {
      this.playWoodblock(time, stepInBar !== 4);
    }
    if (step % 2 === 0) {
      this.playNoiseHihat(time, stepInBar % 4 === 2 ? 0.04 : 0.018, 0.024);
    }
    if (stepInBar === 0 && bar % 2 === 0) {
      this.playAgogoBell(time, bar % 4 === 0 ? 987.77 : 1174.66);
    }

    const jungleBass: Record<number, number> = {
      0: 146.83, 6: 174.61, 10: 220.00,
      16: 130.81, 22: 164.81, 26: 196.00,
      32: 116.54, 38: 146.83, 42: 174.61,
      48: 130.81, 54: 164.81, 58: 196.00,
    };
    const bassStep = step % 64;
    if (jungleBass[bassStep]) {
      this.playSubBass(time, jungleBass[bassStep], 0.22, 0.23);
    }

    const jungleMelody: Record<number, { freq: number; dur: number }> = {
      0: { freq: 587.33, dur: 0.14 }, 3: { freq: 739.99, dur: 0.14 }, 6: { freq: 880.00, dur: 0.16 }, 10: { freq: 1046.50, dur: 0.18 },
      16: { freq: 987.77, dur: 0.14 }, 19: { freq: 880.00, dur: 0.14 }, 22: { freq: 783.99, dur: 0.18 }, 28: { freq: 659.25, dur: 0.20 },
      32: { freq: 587.33, dur: 0.14 }, 35: { freq: 698.46, dur: 0.14 }, 38: { freq: 880.00, dur: 0.16 }, 42: { freq: 932.33, dur: 0.18 },
      48: { freq: 880.00, dur: 0.16 }, 52: { freq: 783.99, dur: 0.16 }, 56: { freq: 659.25, dur: 0.22 }, 60: { freq: 783.99, dur: 0.14 },
      64: { freq: 1174.66, dur: 0.16 }, 67: { freq: 1046.50, dur: 0.14 }, 70: { freq: 987.77, dur: 0.16 }, 74: { freq: 880.00, dur: 0.18 },
      80: { freq: 783.99, dur: 0.16 }, 84: { freq: 880.00, dur: 0.16 }, 88: { freq: 1046.50, dur: 0.20 }, 92: { freq: 880.00, dur: 0.14 },
      96: { freq: 932.33, dur: 0.16 }, 100: { freq: 1046.50, dur: 0.16 }, 104: { freq: 1174.66, dur: 0.22 }, 108: { freq: 1046.50, dur: 0.16 },
      112: { freq: 987.77, dur: 0.16 }, 116: { freq: 880.00, dur: 0.16 }, 120: { freq: 783.99, dur: 0.24 }, 124: { freq: 659.25, dur: 0.14 },
    };
    if (jungleMelody[step]) {
      this.playMarimba(time, jungleMelody[step].freq, jungleMelody[step].dur, true);
    }
  }

  // =========================================================================
  // TRACK C: I'AMPOSTOR — "MISTERI KAMPUNG" (108 BPM, Sneaky Detective + Gamelan, 128 Steps)
  // =========================================================================
  private scheduleImpostorStep(step: number, time: number) {
    if (!this.ctx || !this.bgmBus || this.isMuted) return;
    const bar = Math.floor(step / 16);
    const stepInBar = step % 16;

    // 1. Stealthy Kendang / Woodblock & Soft Shaker Groove
    if (stepInBar === 0 || stepInBar === 10) {
      this.playWarmKick(time, 0.25);
    }
    if (stepInBar === 4 || stepInBar === 12 || stepInBar === 14) {
      this.playWoodblock(time, stepInBar === 14);
    }
    if (step % 2 === 1) {
      this.playNoiseHihat(time, stepInBar % 4 === 3 ? 0.032 : 0.015, 0.025);
    }

    // 2. Sneaking Detective Walking Bass (D minor chromatic stealth)
    const stealthBass: Record<number, number> = {
      0: 73.42, 4: 87.31, 8: 98.00, 12: 103.83, // D -> F -> G -> G#
      16: 110.00, 20: 103.83, 24: 98.00, 28: 87.31, // A -> G# -> G -> F
      32: 73.42, 36: 87.31, 40: 98.00, 44: 110.00,
      48: 116.54, 52: 110.00, 56: 98.00, 60: 82.41, // Bb -> A -> G -> E
      64: 73.42, 68: 110.00, 72: 87.31, 76: 110.00,
      80: 98.00, 84: 116.54, 88: 110.00, 92: 98.00,
      96: 87.31, 100: 82.41, 104: 73.42, 108: 65.41,
      112: 110.00, 116: 103.83, 120: 98.00, 124: 82.41,
    };
    if (stealthBass[step]) {
      this.playSubBass(time, stealthBass[step], 0.22, 0.25);
    }

    // 3. Playful Pizzicato & Woody Mystery Chimes
    const mysteryMelody: Record<number, { freq: number; dur: number }> = {
      0: { freq: 587.33, dur: 0.16 }, 4: { freq: 659.25, dur: 0.14 }, 6: { freq: 698.46, dur: 0.18 }, 10: { freq: 880.00, dur: 0.18 },
      16: { freq: 830.61, dur: 0.18 }, 20: { freq: 698.46, dur: 0.16 }, 24: { freq: 659.25, dur: 0.20 }, 28: { freq: 587.33, dur: 0.18 },
      32: { freq: 587.33, dur: 0.16 }, 36: { freq: 698.46, dur: 0.16 }, 40: { freq: 880.00, dur: 0.18 }, 44: { freq: 932.33, dur: 0.18 },
      48: { freq: 880.00, dur: 0.22 }, 52: { freq: 783.99, dur: 0.16 }, 56: { freq: 659.25, dur: 0.26 },
      // B section suspicious climbs
      64: { freq: 1174.66, dur: 0.14 }, 66: { freq: 1108.73, dur: 0.14 }, 68: { freq: 1046.50, dur: 0.14 }, 70: { freq: 987.77, dur: 0.18 },
      74: { freq: 880.00, dur: 0.22 }, 80: { freq: 783.99, dur: 0.16 }, 84: { freq: 932.33, dur: 0.18 }, 88: { freq: 880.00, dur: 0.22 },
      96: { freq: 698.46, dur: 0.16 }, 100: { freq: 659.25, dur: 0.16 }, 104: { freq: 587.33, dur: 0.24 },
      112: { freq: 880.00, dur: 0.16 }, 116: { freq: 830.61, dur: 0.16 }, 120: { freq: 659.25, dur: 0.28 },
    };
    if (mysteryMelody[step]) {
      this.playPizzicato(time, mysteryMelody[step].freq, mysteryMelody[step].dur, true);
    }

    // Subtle minor chord pad on bar starts
    if (stepInBar === 0 && bar % 2 === 0) {
      const chords = bar < 4 ? [293.66, 349.23, 440.00] : [261.63, 349.23, 440.00];
      this.playRhodesChord(time, chords, 1.2, 0.06);
    }
  }

  // =========================================================================
  // TRACK D: HIDDEN TEAM — "DEWAN NOIR" (114 BPM Cyber-Noir Espionage Groove, 128 Steps)
  // =========================================================================
  private scheduleHiddenTeamStep(step: number, time: number) {
    if (!this.ctx || !this.bgmBus || this.isMuted) return;
    const bar = Math.floor(step / 16);
    const stepInBar = step % 16;

    // 1. Sleek Espionage Electronic Beat
    if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10) {
      this.playWarmKick(time, 0.34);
    }
    if (stepInBar === 4 || stepInBar === 12) {
      this.playNoiseSnare(time, 0.14);
    }
    if (step % 2 === 0) {
      this.playNoiseHihat(time, stepInBar % 4 === 2 ? 0.045 : 0.02, 0.03);
    }

    // 2. Pulsing 16th-Note Synthwave Bassline (Am -> F -> Dm -> E7)
    const progRoots = [110.00, 87.31, 73.42, 82.41, 110.00, 87.31, 98.00, 82.41];
    const r = progRoots[bar];
    if (step % 2 === 0) {
      const octave = stepInBar % 4 === 2 ? r * 2 : r;
      this.playSubBass(time, octave, 0.13, stepInBar % 4 === 0 ? 0.26 : 0.16);
    }

    // 3. Lush Atmospheric Cyber-Noir Pad Swells (every 2 bars)
    const noirChords: Record<number, number[]> = {
      0: [220.00, 261.63, 329.63, 493.88], // Am9
      16: [174.61, 220.00, 261.63, 329.63], // Fmaj7
      32: [146.83, 174.61, 220.00, 329.63], // Dm9
      48: [164.81, 207.65, 246.94, 293.66], // E7
      64: [220.00, 261.63, 329.63, 493.88],
      80: [174.61, 220.00, 261.63, 329.63],
      96: [196.00, 246.94, 293.66, 349.23], // G7
      112: [164.81, 207.65, 246.94, 329.63], // E7sus
    };
    if (noirChords[step]) {
      this.playCyberPad(time, noirChords[step], 1.7, 0.055);
    }

    // 4. Mysterious Noir Rhodes / Kalimba Arp Hook
    const noirLead: Record<number, { freq: number; dur: number }> = {
      0: { freq: 659.25, dur: 0.25 }, 6: { freq: 783.99, dur: 0.22 }, 12: { freq: 659.25, dur: 0.20 },
      16: { freq: 698.46, dur: 0.25 }, 22: { freq: 659.25, dur: 0.22 }, 28: { freq: 523.25, dur: 0.22 },
      32: { freq: 587.33, dur: 0.25 }, 38: { freq: 659.25, dur: 0.22 }, 44: { freq: 523.25, dur: 0.22 },
      48: { freq: 493.88, dur: 0.30 }, 56: { freq: 659.25, dur: 0.18 }, 60: { freq: 830.61, dur: 0.20 },
      // B Section tension rise
      64: { freq: 880.00, dur: 0.22 }, 68: { freq: 987.77, dur: 0.20 }, 72: { freq: 1046.50, dur: 0.26 },
      80: { freq: 880.00, dur: 0.22 }, 84: { freq: 783.99, dur: 0.20 }, 88: { freq: 698.46, dur: 0.26 },
      96: { freq: 783.99, dur: 0.22 }, 102: { freq: 880.00, dur: 0.22 }, 108: { freq: 987.77, dur: 0.22 },
      112: { freq: 830.61, dur: 0.32 }, 120: { freq: 659.25, dur: 0.22 },
    };
    if (noirLead[step]) {
      this.playFunkPluck(time, noirLead[step].freq, noirLead[step].dur, 0.11, true);
    }
  }

  // =========================================================================
  // TRACK E: PANJAT PINANG — "PESTA 17 AGUSTUS" (130 BPM Festive Gamelan Party, 128 Steps)
  // =========================================================================
  private schedulePanjatStep(step: number, time: number) {
    if (!this.ctx || !this.bgmBus || this.isMuted) return;
    const s64 = step % 64;
    const isSnare = s64 % 8 === 4;

    if (s64 % 8 === 0 || s64 === 10 || s64 === 26 || s64 === 42 || s64 === 58) {
      this.playWarmKick(time, 0.32);
    }
    if (isSnare) {
      this.playNoiseSnare(time, 0.16);
    }
    if (s64 % 2 === 1) {
      this.playNoiseHihat(time, s64 % 4 === 3 ? 0.04 : 0.02, 0.03);
    }
    if (s64 === 0 || s64 === 32) {
      this.playGamelanGong(time, s64 === 0 ? 110 : 130.8);
    }

    const bassNotes: Record<number, number> = {
      0: 65.41, 4: 65.41, 6: 98.00, 8: 65.41, 12: 110.00, 14: 116.54,
      16: 87.31, 20: 87.31, 22: 130.81, 24: 98.00, 28: 98.00, 30: 123.47,
      32: 65.41, 36: 65.41, 38: 98.00, 40: 65.41, 44: 110.00, 46: 116.54,
      48: 87.31, 52: 98.00, 56: 98.00, 60: 130.81,
    };
    if (bassNotes[s64]) {
      this.playSubBass(time, bassNotes[s64], 0.18, 0.25);
    }

    const melodyNotes: Record<number, { freq: number; dur: number }> = {
      0: { freq: 523.25, dur: 0.22 }, 4: { freq: 659.25, dur: 0.22 }, 8: { freq: 783.99, dur: 0.32 }, 12: { freq: 783.99, dur: 0.20 },
      16: { freq: 880.00, dur: 0.24 }, 20: { freq: 783.99, dur: 0.20 }, 24: { freq: 659.25, dur: 0.22 }, 28: { freq: 523.25, dur: 0.28 },
      32: { freq: 587.33, dur: 0.20 }, 36: { freq: 659.25, dur: 0.20 }, 40: { freq: 698.46, dur: 0.20 }, 44: { freq: 659.25, dur: 0.20 }, 46: { freq: 587.33, dur: 0.20 },
      48: { freq: 523.25, dur: 0.22 }, 52: { freq: 659.25, dur: 0.22 }, 56: { freq: 783.99, dur: 0.24 }, 60: { freq: 1046.5, dur: 0.40 },
    };
    if (melodyNotes[s64]) {
      const freq = step >= 64 ? melodyNotes[s64].freq : melodyNotes[s64].freq;
      this.playGamelanMelody(time, freq, melodyNotes[s64].dur);
    }
  }

  // =========================================================================
  // STUDIO SYNTHESIZER & PERCUSSION VOICES
  // =========================================================================
  private playWarmKick(time: number, vol: number = 0.3) {
    if (!this.ctx || !this.bgmBus) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.085);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc.connect(gain);
    gain.connect(this.bgmBus);
    osc.start(time);
    osc.stop(time + 0.13);
  }

  private playNoiseSnare(time: number, vol: number = 0.14) {
    if (!this.ctx || !this.bgmBus || !this.noiseBuffer) return;
    // Crisp filtered noise burst
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1900, time);
    filter.Q.setValueAtTime(0.9, time);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(vol, time);
    nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
    src.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.bgmBus);
    src.start(time);
    src.stop(time + 0.12);

    // Body punch
    const osc = this.ctx.createOscillator();
    const oGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, time);
    osc.frequency.exponentialRampToValueAtTime(95, time + 0.06);
    oGain.gain.setValueAtTime(vol * 0.75, time);
    oGain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
    osc.connect(oGain);
    oGain.connect(this.bgmBus);
    osc.start(time);
    osc.stop(time + 0.08);
  }

  private playNoiseHihat(time: number, vol: number = 0.03, dur: number = 0.035) {
    if (!this.ctx || !this.bgmBus || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, time);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmBus);
    src.start(time);
    src.stop(time + dur + 0.01);
  }

  private playSubBass(time: number, freq: number, dur: number, vol: number = 0.24) {
    if (!this.ctx || !this.bgmBus) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, time);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.002, time + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmBus);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private playRhodesChord(time: number, freqs: number[], dur: number, volPerNote: number = 0.08) {
    if (!this.ctx || !this.bgmBus) return;
    freqs.forEach((f) => {
      const osc = this.ctx!.createOscillator();
      const harm = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, time);
      harm.type = 'triangle';
      harm.frequency.setValueAtTime(f * 2.0, time);
      const hGain = this.ctx!.createGain();
      hGain.gain.setValueAtTime(volPerNote * 0.25, time);
      hGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(volPerNote, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(gain);
      harm.connect(hGain);
      hGain.connect(gain);
      gain.connect(this.bgmBus!);
      if (this.delaySend) gain.connect(this.delaySend);

      osc.start(time);
      harm.start(time);
      osc.stop(time + dur + 0.02);
      harm.stop(time + 0.16);
    });
  }

  private playFunkPluck(time: number, freq: number, dur: number, vol: number = 0.12, useDelay: boolean = true) {
    if (!this.ctx || !this.bgmBus) return;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 1.003, time); // subtle chorus warmth

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3400, time);
    filter.frequency.exponentialRampToValueAtTime(900, time + dur);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmBus);
    if (useDelay && this.delaySend) {
      gain.connect(this.delaySend);
    }

    osc.start(time);
    osc2.start(time);
    osc.stop(time + dur + 0.02);
    osc2.stop(time + dur + 0.02);
  }

  private playCyberPad(time: number, freqs: number[], dur: number, volPerNote: number = 0.05) {
    if (!this.ctx || !this.bgmBus) return;
    freqs.forEach((f) => {
      const osc = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * 0.996, time);
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(f * 1.004, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(volPerNote, time + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmBus!);

      osc.start(time);
      osc2.start(time);
      osc.stop(time + dur + 0.03);
      osc2.stop(time + dur + 0.03);
    });
  }

  private playPizzicato(time: number, freq: number, dur: number, useDelay: boolean = true) {
    if (!this.ctx || !this.bgmBus) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(this.bgmBus);
    if (useDelay && this.delaySend) gain.connect(this.delaySend);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private playGamelanGong(time: number, freq: number) {
    if (!this.ctx || !this.bgmBus) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.24, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);
    osc.connect(gain);
    gain.connect(this.bgmBus);
    osc.start(time);
    osc.stop(time + 1.25);
  }

  private playGamelanMelody(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.bgmBus) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.005, time + duration);
    osc.connect(gain);
    gain.connect(this.bgmBus);
    if (this.delaySend) gain.connect(this.delaySend);
    osc.start(time);
    osc.stop(time + duration + 0.05);

    const bell = this.ctx.createOscillator();
    const bGain = this.ctx.createGain();
    bell.type = 'triangle';
    bell.frequency.setValueAtTime(freq * 2.0, time);
    bGain.gain.setValueAtTime(0.05, time);
    bGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.7);
    bell.connect(bGain);
    bGain.connect(this.bgmBus);
    bell.start(time);
    bell.stop(time + duration * 0.75);
  }

  private playWoodblock(time: number, isHigh: boolean) {
    if (!this.ctx || !this.bgmBus) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isHigh ? 1180 : 840, time);
    osc.frequency.exponentialRampToValueAtTime(320, time + 0.035);
    gain.gain.setValueAtTime(0.16, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.connect(gain);
    gain.connect(this.bgmBus);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  private playAgogoBell(time: number, freq: number) {
    if (!this.ctx || !this.bgmBus) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.11, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc.connect(gain);
    gain.connect(this.bgmBus);
    if (this.delaySend) gain.connect(this.delaySend);
    osc.start(time);
    osc.stop(time + 0.25);
  }

  private playMarimba(time: number, freq: number, duration: number, useDelay: boolean = true) {
    if (!this.ctx || !this.bgmBus) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.20, time);
    gain.gain.exponentialRampToValueAtTime(0.003, time + duration);
    osc.connect(gain);
    gain.connect(this.bgmBus);
    if (useDelay && this.delaySend) gain.connect(this.delaySend);
    osc.start(time);
    osc.stop(time + duration + 0.02);

    const click = this.ctx.createOscillator();
    const cGain = this.ctx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(freq * 3.0, time);
    cGain.gain.setValueAtTime(0.06, time);
    cGain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
    click.connect(cGain);
    cGain.connect(this.bgmBus);
    click.start(time);
    click.stop(time + 0.03);
  }

  private playMarimbaChime(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.bgmBus) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.07, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.bgmBus);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  // =========================================================================
  // 2. IN-GAME SOUND EFFECTS (SFX)
  // =========================================================================
  public playDiceRoll() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const delays = [0, 0.065, 0.135, 0.21, 0.29, 0.38];
      const freqs = [760, 620, 540, 480, 420, 360];

      delays.forEach((delay, idx) => {
        const hitTime = now + delay;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freqs[idx] + (Math.random() * 30 - 15), hitTime);
        osc.frequency.exponentialRampToValueAtTime(100, hitTime + 0.045);

        const vol = (0.24 - idx * 0.032) * this.volume;
        gain.gain.setValueAtTime(vol, hitTime);
        gain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.045);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.ctx!.destination);

        osc.start(hitTime);
        osc.stop(hitTime + 0.05);
      });
    } catch {}
  }

  public playDiceImpact() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

      gain.gain.setValueAtTime(0.25 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  public playPop() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

      gain.gain.setValueAtTime(0.18 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  public playCriticalRoll() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.5];
      chord.forEach((freq, idx) => {
        const hit = now + idx * 0.05;
        const osc = this.ctx!.createOscillator();
        const harm = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, hit);

        harm.type = 'sine';
        harm.frequency.setValueAtTime(freq * 2, hit);

        const vol = 0.22 * this.volume;
        gain.gain.setValueAtTime(vol, hit);
        gain.gain.exponentialRampToValueAtTime(0.001, hit + 0.5);

        osc.connect(gain);
        harm.connect(gain);
        gain.connect(this.sfxGain || this.ctx!.destination);

        osc.start(hit);
        harm.start(hit);
        osc.stop(hit + 0.55);
        harm.stop(hit + 0.55);
      });
    } catch {}
  }

  public playNumberReveal(num: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      if (num === 6) {
        this.playCriticalRoll();
        return;
      }

      const now = this.ctx.currentTime;
      const baseFreqs = [329.63, 392.0, 440.0, 523.25, 587.33];
      const freq = baseFreqs[Math.max(0, Math.min(4, (num || 1) - 1))];

      const osc = this.ctx.createOscillator();
      const harm = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      harm.type = 'sine';
      harm.frequency.setValueAtTime(freq * 2, now);

      const vol = 0.2 * this.volume;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      harm.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);

      osc.start(now);
      harm.start(now);
      osc.stop(now + 0.4);
      harm.stop(now + 0.4);
    } catch {}
  }

  public playTokenCapture() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const punchOsc = this.ctx.createOscillator();
      const punchGain = this.ctx.createGain();

      punchOsc.type = 'square';
      punchOsc.frequency.setValueAtTime(420, now);
      punchOsc.frequency.exponentialRampToValueAtTime(70, now + 0.16);

      punchGain.gain.setValueAtTime(0.35 * this.volume, now);
      punchGain.gain.exponentialRampToValueAtTime(0.005, now + 0.18);

      punchOsc.connect(punchGain);
      punchGain.connect(this.sfxGain || this.ctx.destination);

      punchOsc.start(now);
      punchOsc.stop(now + 0.19);

      const slideOsc = this.ctx.createOscillator();
      const slideGain = this.ctx.createGain();

      slideOsc.type = 'sine';
      slideOsc.frequency.setValueAtTime(980, now + 0.08);
      slideOsc.frequency.exponentialRampToValueAtTime(180, now + 0.42);

      slideGain.gain.setValueAtTime(0.001, now);
      slideGain.gain.linearRampToValueAtTime(0.28 * this.volume, now + 0.12);
      slideGain.gain.exponentialRampToValueAtTime(0.005, now + 0.42);

      slideOsc.connect(slideGain);
      slideGain.connect(this.sfxGain || this.ctx.destination);

      slideOsc.start(now + 0.08);
      slideOsc.stop(now + 0.45);

      const thudOsc = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();

      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(140, now + 0.42);
      thudOsc.frequency.exponentialRampToValueAtTime(50, now + 0.58);

      thudGain.gain.setValueAtTime(0.3 * this.volume, now + 0.42);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      thudOsc.connect(thudGain);
      thudGain.connect(this.sfxGain || this.ctx.destination);

      thudOsc.start(now + 0.42);
      thudOsc.stop(now + 0.62);
    } catch {}
  }

  public playTokenMove() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.07);

      gain.gain.setValueAtTime(0.18 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  public playTokenFinish() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
      notes.forEach((freq, idx) => {
        const hitTime = now + idx * 0.08;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, hitTime);

        const harm = this.ctx!.createOscillator();
        const hGain = this.ctx!.createGain();
        harm.type = 'sine';
        harm.frequency.setValueAtTime(freq * 2.0, hitTime);

        const vol = 0.28 * this.volume;
        gain.gain.setValueAtTime(vol, hitTime);
        gain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.65);

        hGain.gain.setValueAtTime(vol * 0.35, hitTime);
        hGain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.45);

        osc.connect(gain);
        harm.connect(hGain);
        gain.connect(this.sfxGain || this.ctx!.destination);
        hGain.connect(this.sfxGain || this.ctx!.destination);

        osc.start(hitTime);
        harm.start(hitTime);
        osc.stop(hitTime + 0.7);
        harm.stop(hitTime + 0.5);
      });
    } catch {}
  }

  public playClimb() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220 + Math.random() * 40, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08 * this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {}
  }

  public playSlip() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.2 * this.volume, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.36);
    } catch {}
  }

  public playRecovery() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [330, 440, 550].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.15 * this.volume, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.ctx!.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.16);
      });
    } catch {}
  }

  public playSkill(skillType: string) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (skillType === 'iron_grip') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.12);
        gain.gain.setValueAtTime(0.2 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      } else if (skillType === 'super_climb') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.22);
        gain.gain.setValueAtTime(0.15 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      } else if (skillType === 'banana_trap') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);
        gain.gain.setValueAtTime(0.25 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      } else if (skillType === 'wind_boost') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);
        gain.gain.setValueAtTime(0.25 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.4);
        gain.gain.setValueAtTime(0.3 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      }

      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch {}
  }

  public playCountdown(count: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = count === 0 ? 880 : 440;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.25 * this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (count === 0 ? 0.4 : 0.15));

      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + (count === 0 ? 0.42 : 0.16));
    } catch {}
  }

  public playVictory() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        gain.gain.setValueAtTime(0.25 * this.volume, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.6);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.ctx!.destination);

        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.65);
      });
    } catch {}
  }

  public playEmote(emoteId?: string) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.18);

      gain.gain.setValueAtTime(0.28 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  // =========================================================================
  // ULAR TANGGA 2.5D DEDICATED SOUND EFFECTS
  // =========================================================================

  public playPawnHop(stepIndex: number = 0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const baseFreq = 460 + (stepIndex % 6) * 45;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.38, now + 0.075);

      gain.gain.setValueAtTime(0.18 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  public playLadderClimb() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = now + idx * 0.075;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.04, t + 0.12);

        gain.gain.setValueAtTime(0.22 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.ctx!.destination);
        osc.start(t);
        osc.stop(t + 0.24);
      });
    } catch {}
  }

  public playSnakeSlide() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Playful cartoon descending slide whistle + wobble
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(760, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.72);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(14, now);
      lfoGain.gain.setValueAtTime(24, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);

      gain.gain.setValueAtTime(0.22 * this.volume, now);
      gain.gain.linearRampToValueAtTime(0.18 * this.volume, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.78);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.8);
      osc.stop(now + 0.8);

      // Soft thud at tail landing
      const thud = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(150, now + 0.72);
      thud.frequency.exponentialRampToValueAtTime(55, now + 0.9);
      thudGain.gain.setValueAtTime(0.26 * this.volume, now + 0.72);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.92);
      thud.connect(thudGain);
      thudGain.connect(this.sfxGain || this.ctx.destination);
      thud.start(now + 0.72);
      thud.stop(now + 0.94);
    } catch {}
  }

  public playBounce100() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.28);

      gain.gain.setValueAtTime(0.25 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.34);
    } catch {}
  }
}

export const soundManager = new SoundManager();
