// Procedural Web Audio API sound & festive background music generator for GameHouse party games

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;
  private bgmVolume: number = 0.32;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmInterval: any = null;
  private isBgmPlaying: boolean = false;
  private currentStep: number = 0;
  private nextNoteTime: number = 0;
  private currentTrack: 'panjat-pinang' | 'ludo' | 'lobby' = 'lobby';
  private musicListeners: Set<(playing: boolean) => void> = new Set();
  private hasSetupUserInteraction: boolean = false;

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
        this.startBGM();
      }
    };

    // Attempt to start BGM immediately on load
    try {
      this.initContext();
      if (!this.isMuted) {
        this.startBGM();
      }
    } catch {}

    // Listen to first user touch/click to unlock audio policy seamlessly
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
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        this.sfxGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.isMuted ? 0 : this.bgmVolume * this.volume, this.ctx.currentTime);
        this.bgmGain.connect(this.ctx.destination);
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
      this.sfxGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(muted ? 0 : this.bgmVolume * this.volume, this.ctx.currentTime);
    }
    this.notifyListeners();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    if (!this.isMuted && !this.isBgmPlaying) {
      this.startBGM();
    }
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx && !this.isMuted) {
      this.sfxGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    if (this.bgmGain && this.ctx && !this.isMuted) {
      this.bgmGain.gain.setValueAtTime(this.bgmVolume * this.volume, this.ctx.currentTime);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
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

  private notifyListeners() {
    const active = this.isBGMActive();
    this.musicListeners.forEach((l) => {
      try {
        l(active);
      } catch {}
    });
  }

  // =========================================================================
  // 1. PROCEDURAL MULTI-GAME BACKGROUND MUSIC (BGM) ENGINE
  // - Panjat Pinang: 17 Agustus Festive Gamelan & Brass Party (~130 BPM)
  // - Ludo Party: Playful Bouncy Marimba Board Game Groove (~118 BPM)
  // =========================================================================
  public startBGM(track: 'panjat-pinang' | 'ludo' | 'lobby' = 'lobby') {
    this.initContext();
    if (!this.ctx) return;

    // If already playing this exact track, keep playing seamlessly
    if (this.isBgmPlaying && this.currentTrack === track) return;

    // If playing another track, stop it first
    if (this.isBgmPlaying) {
      this.stopBGM(false);
    }

    this.currentTrack = track;
    this.isBgmPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;

    if (this.bgmGain) {
      this.bgmGain.gain.setValueAtTime(this.isMuted ? 0 : this.bgmVolume * this.volume, this.ctx.currentTime);
    }

    // High precision lookahead audio scheduler (25ms timer interval)
    // Panjat Pinang: 130 BPM (stepDuration 0.115s)
    // Ludo: 118 BPM (stepDuration 0.127s)
    const stepDuration = track === 'ludo' ? 0.127 : 0.115;
    const lookAhead = 0.16;

    this.bgmInterval = setInterval(() => {
      if (!this.ctx || !this.isBgmPlaying) return;
      while (this.nextNoteTime < this.ctx.currentTime + lookAhead) {
        if (this.currentTrack === 'ludo') {
          this.scheduleLudoStep(this.currentStep, this.nextNoteTime);
        } else {
          this.schedulePanjatStep(this.currentStep, this.nextNoteTime);
        }
        this.nextNoteTime += stepDuration;
        this.currentStep = (this.currentStep + 1) % 64; // 64 steps = 4 bars
      }
    }, 25);

    this.notifyListeners();
  }

  public playPanjatBGM() {
    this.startBGM('panjat-pinang');
  }

  public playLudoBGM() {
    this.startBGM('ludo');
  }

  public playLobbyBGM() {
    this.startBGM('lobby');
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

  private schedulePanjatStep(step: number, time: number) {
    if (!this.ctx || !this.bgmGain || this.isMuted) return;

    // A. Percussion: Kick, Snare, Hi-hat, Gamelan Gong
    const isQuarter = step % 4 === 0;
    const isSnare = step % 8 === 4;

    // Kick Drum (Four on the floor + energetic syncopations)
    if (step % 8 === 0 || step === 10 || step === 26 || step === 42 || step === 58) {
      this.playSynthKick(time);
    }

    // Snare / Handclap on beats 2 and 4
    if (isSnare) {
      this.playSynthSnare(time);
    }

    // Hi-hat / Kendang Ketuk (16th-note rhythmic drive)
    if (step % 2 === 1) {
      this.playSynthHihat(time, step % 4 === 3);
    }

    // Gamelan Bass Gong on bar 1 and bar 3 downbeats
    if (step === 0 || step === 32) {
      this.playGamelanGong(time, step === 0 ? 110 : 130.8);
    }

    // B. Groovy Funk Bassline
    const bassNotes: Record<number, number> = {
      0: 65.41,  // C2
      4: 65.41,  // C2
      6: 98.00,  // G2
      8: 65.41,  // C2
      12: 110.00, // A2
      14: 116.54, // Bb2
      16: 87.31,  // F2
      20: 87.31,  // F2
      22: 130.81, // C3
      24: 98.00,  // G2
      28: 98.00,  // G2
      30: 123.47, // B2
      32: 65.41,  // C2
      36: 65.41,  // C2
      38: 98.00,  // G2
      40: 65.41,  // C2
      44: 110.00, // A2
      46: 116.54, // Bb2
      48: 87.31,  // F2
      52: 98.00,  // G2
      56: 98.00,  // G2
      60: 130.81, // C3
    };

    if (bassNotes[step]) {
      this.playSynthBass(time, bassNotes[step]);
    }

    // C. Celebratory 17 Agustus Indonesian Party Game Melody & Gamelan Chimes
    const melodyNotes: Record<number, { freq: number; dur: number }> = {
      // Bar 1: C5 - E5 - G5 - G5 ("Tu-juh-be-las...")
      0:  { freq: 523.25, dur: 0.22 }, // C5
      4:  { freq: 659.25, dur: 0.22 }, // E5
      8:  { freq: 783.99, dur: 0.32 }, // G5
      12: { freq: 783.99, dur: 0.20 }, // G5
      // Bar 2: A5 - G5 - E5 - C5 ("...A-gus-tus-em-pat-li-ma")
      16: { freq: 880.00, dur: 0.24 }, // A5
      20: { freq: 783.99, dur: 0.20 }, // G5
      24: { freq: 659.25, dur: 0.22 }, // E5
      28: { freq: 523.25, dur: 0.28 }, // C5
      // Bar 3: D5 - E5 - F5 - E5 - D5 ("I-tu-lah-ha-ri...")
      32: { freq: 587.33, dur: 0.20 }, // D5
      36: { freq: 659.25, dur: 0.20 }, // E5
      40: { freq: 698.46, dur: 0.20 }, // F5
      44: { freq: 659.25, dur: 0.20 }, // E5
      46: { freq: 587.33, dur: 0.20 }, // D5
      // Bar 4: C5 - E5 - G5 - C6! ("...Ke-mer-de-ka-an-ki-ta! / PANJAT!")
      48: { freq: 523.25, dur: 0.22 }, // C5
      52: { freq: 659.25, dur: 0.22 }, // E5
      56: { freq: 783.99, dur: 0.24 }, // G5
      60: { freq: 1046.5, dur: 0.40 }, // C6 (Triumphant summit fanfare!)
    };

    if (melodyNotes[step]) {
      this.playGamelanMelody(time, melodyNotes[step].freq, melodyNotes[step].dur);
    }
  }

  // Synthesizer voice helpers for BGM
  private playSynthKick(time: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.08);
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  private playSynthSnare(time: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(230, time);
    osc.frequency.exponentialRampToValueAtTime(110, time + 0.1);
    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.11);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  private playSynthHihat(time: number, isAccent: boolean) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(isAccent ? 6800 : 5200, time);
    gain.gain.setValueAtTime(isAccent ? 0.045 : 0.025, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.04);
  }

  private playGamelanGong(time: number, freq: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 1.25);
  }

  private playSynthBass(time: number, freq: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private playGamelanMelody(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.bgmGain) return;
    // Primary chime
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + duration + 0.05);

    // Indonesian Bronze Gamelan Saron overtone (2.76x ratio harmonic)
    const bell = this.ctx.createOscillator();
    const bGain = this.ctx.createGain();
    bell.type = 'triangle';
    bell.frequency.setValueAtTime(freq * 2.0, time);
    bGain.gain.setValueAtTime(0.06, time);
    bGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.7);
    bell.connect(bGain);
    bGain.connect(this.bgmGain);
    bell.start(time);
    bell.stop(time + duration * 0.75);
  }

  // =========================================================================
  // LUDO PARTY PROCEDURAL SOUNDTRACK (Jaunty Marimba Board Game Groove ~118 BPM)
  // =========================================================================
  private scheduleLudoStep(step: number, time: number) {
    if (!this.ctx || !this.bgmGain || this.isMuted) return;

    // 1. Percussion: Soft Acoustic Kick, Rimshot / Woodblock, Shaker
    // Soft kick on beats 1 and 3 of each bar
    if (step % 16 === 0 || step % 16 === 8) {
      this.playAcousticKick(time);
    }

    // Crisp woodblock / rimshot on beats 2 and 4 (with syncopation on step 14)
    if (step % 16 === 4 || step % 16 === 12 || step % 32 === 14) {
      this.playWoodblock(time, step % 16 === 12);
    }

    // Shaker / Soft Brush on every off-beat 16th
    if (step % 2 === 1) {
      this.playShaker(time, step % 4 === 3);
    }

    // Agogo chime accent on bar downbeats
    if (step === 0 || step === 32) {
      this.playAgogoBell(time, step === 0 ? 880 : 1046.5);
    }

    // 2. Playful Bouncy Walking Upright Bassline (C Major -> A minor -> D minor -> G7)
    const ludoBassNotes: Record<number, number> = {
      // Bar 1: C -> E -> G -> A
      0: 130.81, // C3
      4: 164.81, // E3
      8: 196.00, // G3
      12: 220.00, // A3
      // Bar 2: A -> C -> D -> F
      16: 110.00, // A2
      20: 130.81, // C3
      24: 146.83, // D3
      28: 174.61, // F3
      // Bar 3: G -> B -> D -> F
      32: 98.00,  // G2
      36: 123.47, // B2
      40: 146.83, // D3
      44: 174.61, // F3
      // Bar 4: E -> Eb -> D -> G (Classic Jazz Board Game Turnaround)
      48: 164.81, // E3
      52: 155.56, // Eb3
      56: 146.83, // D3
      60: 98.00,  // G2
    };

    if (ludoBassNotes[step]) {
      this.playUprightBass(time, ludoBassNotes[step]);
    }

    // 3. Playful Marimba / Xylophone Board Game Melody
    const ludoMelody: Record<number, { freq: number; dur: number }> = {
      // Bar 1: Bouncy C Major hook
      0:  { freq: 392.00, dur: 0.14 }, // G4
      3:  { freq: 659.25, dur: 0.14 }, // E5
      6:  { freq: 523.25, dur: 0.18 }, // C5
      10: { freq: 587.33, dur: 0.14 }, // D5
      12: { freq: 659.25, dur: 0.20 }, // E5
      // Bar 2: Playful roll down
      16: { freq: 698.46, dur: 0.16 }, // F5
      20: { freq: 587.33, dur: 0.16 }, // D5
      24: { freq: 493.88, dur: 0.18 }, // B4
      28: { freq: 523.25, dur: 0.26 }, // C5
      // Bar 3: Ascending bouncy arpeggio
      32: { freq: 440.00, dur: 0.14 }, // A4
      35: { freq: 523.25, dur: 0.14 }, // C5
      38: { freq: 659.25, dur: 0.16 }, // E5
      42: { freq: 587.33, dur: 0.16 }, // D5
      44: { freq: 783.99, dur: 0.22 }, // G5
      // Bar 4: Resolution & Pick-up trill
      48: { freq: 659.25, dur: 0.16 }, // E5
      52: { freq: 587.33, dur: 0.16 }, // D5
      56: { freq: 523.25, dur: 0.30 }, // C5
      60: { freq: 783.99, dur: 0.12 }, // G5 (pick-up)
      62: { freq: 880.00, dur: 0.12 }, // A5 (pick-up)
    };

    if (ludoMelody[step]) {
      this.playMarimba(time, ludoMelody[step].freq, ludoMelody[step].dur);
    }

    // 4. Marimba Chord Stabs on upbeat 8ths
    if (step % 4 === 2) {
      const chordNotes = 
        step < 16 ? [659.25, 783.99] :
        step < 32 ? [698.46, 880.00] :
        step < 48 ? [698.46, 987.77] :
        [659.25, 783.99];
      chordNotes.forEach((f) => {
        this.playMarimbaChime(time, f, 0.08);
      });
    }
  }

  // Synthesizer voice helpers for Ludo BGM
  private playAcousticKick(time: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.07);
    gain.gain.setValueAtTime(0.24, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.09);
  }

  private playWoodblock(time: number, isHigh: boolean) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isHigh ? 1180 : 840, time);
    osc.frequency.exponentialRampToValueAtTime(320, time + 0.035);
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  private playShaker(time: number, isAccent: boolean) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(isAccent ? 7400 : 5800, time);
    gain.gain.setValueAtTime(isAccent ? 0.03 : 0.018, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.03);
  }

  private playAgogoBell(time: number, freq: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.25);
  }

  private playUprightBass(time: number, freq: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.19);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.21);
  }

  private playMarimba(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.bgmGain) return;
    // Primary warm woody sine
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.005, time + duration);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + duration + 0.02);

    // Mallet wood click overtone
    const click = this.ctx.createOscillator();
    const cGain = this.ctx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(freq * 3.0, time);
    cGain.gain.setValueAtTime(0.08, time);
    cGain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
    click.connect(cGain);
    cGain.connect(this.bgmGain);
    click.start(time);
    click.stop(time + 0.03);
  }

  private playMarimbaChime(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.bgmGain);
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
      // Tumbling dice rattle: series of realistic percussive impacts
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
      // Solid table felt impact thud
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

  public playCriticalRoll() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // High-energy celebratory sparkling chime for a Critical 6 roll!
      const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
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

  public playTokenCapture() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Heavy Comic Punch Impact ("BONK / KAPOW")
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

      // 2. Flying Slide Whistle ("WHEEE-OOUW" as token is booted back to base)
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

      // 3. Splashdown / Thud when landing in corner base
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
      // Celebratory ascending chime fanfare with sparkling harmonics (C5, E5, G5, B5, C6)
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
      notes.forEach((freq, idx) => {
        const hitTime = now + idx * 0.08;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, hitTime);

        // Glockenspiel crystal harmonic (2x overtone)
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
      // Cheerful party game comic bubble pop chord
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.18); // D6

      gain.gain.setValueAtTime(0.28 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }
}

export const soundManager = new SoundManager();
