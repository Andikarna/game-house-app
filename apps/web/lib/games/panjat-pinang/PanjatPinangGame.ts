import { 
  GameId, 
  GameMode, 
  RoomSettings, 
  Player, 
  PanjatPinangGameState, 
  ClimberPlayerState, 
  TrapObject, 
  SkillType, 
  GameResultData, 
  PlayerGameResult,
  ClimberInput,
  PHYSICS_CONFIG,
  SKILL_DEFINITIONS
} from '@gamehouse/shared';
import { GameModule } from '../../core/GameModule';
import { Server as SocketIOServer } from 'socket.io';

export class PanjatPinangGame implements GameModule {
  public readonly id: GameId = 'panjat-pinang';
  public readonly name: string = 'Panjat Pinang Battle';
  public readonly minPlayers: number = 2;
  public readonly maxPlayers: number = 8;
  public readonly availableModes: GameMode[] = ['classic-race', 'survival-climb', 'skill-battle'];

  private roomId: string = '';
  private io!: SocketIOServer;
  private settings!: RoomSettings;
  private players: Player[] = [];
  
  private state!: PanjatPinangGameState;
  private playerInputs: Map<string, ClimberInput> = new Map();
  private finished: boolean = false;
  private gameEndedAt: number = 0;
  private windDirectionTimer: number = 0;
  private currentWindDrift: number = 0;

  public initialize(
    roomId: string, 
    players: Player[], 
    settings: RoomSettings, 
    io: SocketIOServer
  ): void {
    this.roomId = roomId;
    this.players = [...players];
    this.settings = settings;
    this.io = io;
    this.finished = false;
    this.gameEndedAt = 0;

    const climbers: Record<string, ClimberPlayerState> = {};
    const totalPlayers = players.length;

    players.forEach((player, idx) => {
      // Distribute players around the pole (lanes 0 to 7)
      const lane = idx % 8;
      climbers[player.id] = {
        playerId: player.id,
        lane,
        height: 0,
        targetHeight: 0,
        stamina: 100,
        balance: 0,
        grip: 100,
        climbingSpeed: PHYSICS_CONFIG.baseClimbSpeed,
        energy: this.settings.gameMode === 'skill-battle' ? 50 : 20, // Starting energy
        isClimbing: false,
        isSlipping: false,
        isStunned: false,
        stunTimer: 0,
        activeEffects: [],
        skillCooldowns: {
          iron_grip: 0,
          super_climb: 0,
          recovery: 0,
          banana_trap: 0,
          wind_boost: 0,
          legendary_climber: 0,
        },
        fallCount: 0,
        skillsUsedCount: 0,
      };
    });

    const duration = settings.durationSeconds > 0 ? settings.durationSeconds : 180;

    this.state = {
      gameId: 'panjat-pinang',
      gameMode: settings.gameMode,
      status: 'in-game',
      countdown: 0,
      timerSecondsRemaining: duration,
      totalDurationSeconds: duration,
      climbers,
      traps: [],
      winnerId: null,
      rankings: [],
      environmentSlipperiness: 1.0,
    };
  }

  public start(): void {
    this.state.status = 'in-game';
    this.io.to(this.roomId).emit('game:started', this.state);
  }

  public handleInput(playerId: string, input: ClimberInput): void {
    if (this.finished || !this.state.climbers[playerId]) return;
    this.playerInputs.set(playerId, input);
  }

  public handleSkill(playerId: string, skill: SkillType): void {
    if (this.finished) return;
    const climber = this.state.climbers[playerId];
    if (!climber || climber.isStunned && skill !== 'recovery') return;

    const skillDef = SKILL_DEFINITIONS[skill];
    if (!skillDef) return;

    // Check cooldown
    if (climber.skillCooldowns[skill] > 0) return;

    // Check ultimate energy requirement
    if (skillDef.isUltimate) {
      if (climber.energy < (skillDef.energyCost || 100)) return;
      climber.energy = 0; // Consume energy
    }

    const player = this.players.find(p => p.id === playerId);
    const nickname = player ? player.nickname : 'Player';

    // Apply skill effects
    switch (skill) {
      case 'iron_grip':
        climber.activeEffects.push({ type: 'iron_grip', durationRemaining: skillDef.durationSeconds });
        climber.grip = 150;
        climber.balance = 0;
        break;

      case 'super_climb':
        climber.activeEffects.push({ type: 'super_climb', durationRemaining: skillDef.durationSeconds });
        break;

      case 'recovery':
        climber.stamina = Math.min(100, climber.stamina + 30);
        climber.isStunned = false;
        climber.isSlipping = false;
        climber.stunTimer = 0;
        this.io.to(this.roomId).emit('player:recovered', { playerId, nickname });
        break;

      case 'banana_trap':
        this.state.traps.push({
          id: `trap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          placedByPlayerId: playerId,
          heightPercentage: climber.height,
          lane: climber.lane,
          createdAt: Date.now(),
          durationSeconds: skillDef.durationSeconds,
        });
        break;

      case 'wind_boost':
        climber.height = Math.min(100, climber.height + 12);
        climber.targetHeight = climber.height;
        break;

      case 'legendary_climber':
        climber.activeEffects.push({ type: 'legendary_climber', durationRemaining: skillDef.durationSeconds });
        climber.stamina = 100;
        climber.balance = 0;
        climber.isStunned = false;
        climber.isSlipping = false;
        break;
    }

    // Set cooldown (skill battle mode has 30% cooldown reduction)
    const cdModifier = this.state.gameMode === 'skill-battle' ? 0.7 : 1.0;
    climber.skillCooldowns[skill] = skillDef.cooldownSeconds * cdModifier;
    climber.skillsUsedCount += 1;

    // Broadcast skill used event
    this.io.to(this.roomId).emit('player:skill-used', { playerId, skill, nickname });
  }

  public update(deltaTime: number): void {
    if (this.finished) return;

    // 1. Update Game Timer
    this.state.timerSecondsRemaining = Math.max(0, this.state.timerSecondsRemaining - deltaTime);

    // In Survival Climb mode, increase slipperiness over time
    if (this.state.gameMode === 'survival-climb') {
      const elapsed = this.state.totalDurationSeconds - this.state.timerSecondsRemaining;
      this.state.environmentSlipperiness = 1.0 + (elapsed / this.state.totalDurationSeconds) * 1.5;
    }

    // Update global wind drift fluctuation
    this.windDirectionTimer += deltaTime;
    if (this.windDirectionTimer > 3.0) {
      this.windDirectionTimer = 0;
      this.currentWindDrift = (Math.random() - 0.5) * 35; // random gust between -17.5 and +17.5
    }

    // 2. Update Traps
    this.state.traps = this.state.traps.filter(trap => {
      trap.durationSeconds -= deltaTime;
      return trap.durationSeconds > 0;
    });

    // 3. Update Each Climber
    let firstWinnerId: string | null = null;

    Object.values(this.state.climbers).forEach(climber => {
      // Cooldown decrement
      (Object.keys(climber.skillCooldowns) as SkillType[]).forEach(sk => {
        if (climber.skillCooldowns[sk] > 0) {
          climber.skillCooldowns[sk] = Math.max(0, climber.skillCooldowns[sk] - deltaTime);
        }
      });

      // Active effects duration decrement
      climber.activeEffects = climber.activeEffects.filter(effect => {
        effect.durationRemaining -= deltaTime;
        return effect.durationRemaining > 0;
      });

      const hasIronGrip = climber.activeEffects.some(e => e.type === 'iron_grip');
      const hasSuperClimb = climber.activeEffects.some(e => e.type === 'super_climb');
      const hasLegendary = climber.activeEffects.some(e => e.type === 'legendary_climber');

      // Check Stun state
      if (climber.isStunned) {
        const input = this.playerInputs.get(climber.playerId);
        // Space mashing accelerates recovery
        const recoveryMashing = input && input.recovery ? 2.5 : 1.0;
        climber.stunTimer -= deltaTime * recoveryMashing;

        if (climber.stunTimer <= 0) {
          climber.isStunned = false;
          climber.isSlipping = false;
          climber.stunTimer = 0;
          climber.balance = 0;
          const player = this.players.find(p => p.id === climber.playerId);
          this.io.to(this.roomId).emit('player:recovered', {
            playerId: climber.playerId,
            nickname: player ? player.nickname : 'Player',
          });
        }
        return; // Stunned climbers cannot climb or balance
      }

      const input = this.playerInputs.get(climber.playerId) || {
        up: false,
        down: false,
        left: false,
        right: false,
        recovery: false,
        timestamp: Date.now(),
      };

      // Balance Mechanics
      if (hasIronGrip || hasLegendary) {
        climber.balance = 0;
      } else {
        // Natural grease drift influenced by wind + height + survival mode
        const heightMultiplier = 1.0 + (climber.height / 100) * 0.8;
        const drift = (this.currentWindDrift + (Math.sin(Date.now() / 600 + climber.lane) * 15)) 
          * this.state.environmentSlipperiness * heightMultiplier * deltaTime;
        climber.balance += drift;

        // Player input adjustment
        if (input.left) {
          climber.balance -= PHYSICS_CONFIG.balanceRecoverySpeed * deltaTime;
        }
        if (input.right) {
          climber.balance += PHYSICS_CONFIG.balanceRecoverySpeed * deltaTime;
        }

        // Clamp balance
        climber.balance = Math.max(-100, Math.min(100, climber.balance));
      }

      // Slipping & Falling Logic
      const isBalanceTooFar = Math.abs(climber.balance) >= PHYSICS_CONFIG.slipThreshold;
      const isStaminaExhausted = climber.stamina <= 0 && input.up;

      if ((isBalanceTooFar || isStaminaExhausted) && !hasIronGrip && !hasLegendary) {
        this.triggerFall(climber, PHYSICS_CONFIG.slipDropDistance);
        return;
      }

      // Trap collision check
      this.state.traps = this.state.traps.filter(trap => {
        if (trap.placedByPlayerId !== climber.playerId) {
          const heightDiff = Math.abs(climber.height - trap.heightPercentage);
          if (heightDiff < 2.5) {
            // Triggered trap!
            this.triggerFall(climber, 10.0);
            return false; // Consume trap
          }
        }
        return true;
      });

      // Climbing Movement & Stamina
      if (input.up && climber.height < 100) {
        climber.isClimbing = true;
        
        let speedMultiplier = 1.0;
        if (hasSuperClimb) speedMultiplier *= 2.0;
        if (hasLegendary) speedMultiplier *= 1.8;

        // Low stamina reduces speed
        const staminaFactor = Math.max(0.3, climber.stamina / 100);
        const actualSpeed = PHYSICS_CONFIG.baseClimbSpeed * speedMultiplier * staminaFactor;

        climber.height = Math.min(100, climber.height + actualSpeed * deltaTime);

        // Stamina consumption
        const staminaCost = PHYSICS_CONFIG.staminaDepletionClimb * (hasSuperClimb ? 1.5 : 1.0) * deltaTime;
        climber.stamina = Math.max(0, climber.stamina - staminaCost);

        // Ultimate energy charging
        climber.energy = Math.min(100, climber.energy + PHYSICS_CONFIG.energyGainRate * deltaTime);

        // Win check (reaching 100%)
        if (climber.height >= 100 && !climber.finishedAt) {
          climber.finishedAt = Date.now();
          if (!firstWinnerId) {
            firstWinnerId = climber.playerId;
          }
        }
      } else if (input.down && climber.height > 0) {
        climber.isClimbing = false;
        climber.height = Math.max(0, climber.height - PHYSICS_CONFIG.baseDescendSpeed * deltaTime);
        climber.stamina = Math.min(100, climber.stamina + PHYSICS_CONFIG.staminaRegenIdle * 0.5 * deltaTime);
      } else {
        climber.isClimbing = false;
        // Idle stamina regen
        climber.stamina = Math.min(100, climber.stamina + PHYSICS_CONFIG.staminaRegenIdle * deltaTime);
      }
    });

    // Check Win / Finish conditions
    if (this.state.gameMode === 'classic-race' && firstWinnerId) {
      this.finish(firstWinnerId);
    } else if (this.state.timerSecondsRemaining <= 0) {
      // Time is up! Winner is highest climber
      const highestClimber = Object.values(this.state.climbers).sort((a, b) => b.height - a.height)[0];
      this.finish(highestClimber ? highestClimber.playerId : null);
    }
  }

  private triggerFall(climber: ClimberPlayerState, dropDistance: number): void {
    const previousHeight = climber.height;
    climber.height = Math.max(0, climber.height - dropDistance);
    climber.isSlipping = true;
    climber.isStunned = true;
    climber.stunTimer = PHYSICS_CONFIG.stunDuration;
    climber.fallCount += 1;
    climber.balance = 0; // reset balance after falling
    climber.stamina = Math.max(20, climber.stamina); // Give minimal stamina back

    const player = this.players.find(p => p.id === climber.playerId);
    const nickname = player ? player.nickname : 'Player';

    this.io.to(this.roomId).emit('player:fallen', {
      playerId: climber.playerId,
      heightDropped: Math.round(previousHeight - climber.height),
      nickname,
    });
  }

  private finish(winnerId: string | null): void {
    if (this.finished) return;
    this.finished = true;
    this.gameEndedAt = Date.now();
    this.state.status = 'finished';
    this.state.winnerId = winnerId;

    const results = this.getResults();
    this.state.rankings = results.rankings;

    this.io.to(this.roomId).emit('game:finished', results);
  }

  public getResults(): GameResultData {
    const playerResults: PlayerGameResult[] = Object.values(this.state.climbers).map(climber => {
      const player = this.players.find(p => p.id === climber.playerId);
      const score = Math.round(climber.height * 100 - climber.fallCount * 150 + climber.skillsUsedCount * 50);

      return {
        playerId: climber.playerId,
        nickname: player ? player.nickname : 'Player',
        avatar: player ? player.avatar : 'climber-red',
        rank: 0,
        finalHeight: Math.round(climber.height * 10) / 10,
        completionTimeSeconds: climber.finishedAt ? Math.round((climber.finishedAt - (this.gameEndedAt - (this.state.totalDurationSeconds - this.state.timerSecondsRemaining) * 1000)) / 1000) : undefined,
        fallCount: climber.fallCount,
        skillsUsedCount: climber.skillsUsedCount,
        score: Math.max(0, score),
      };
    });

    // Sort: 100% completed players sorted by time, then sorted by height desc, then score desc
    playerResults.sort((a, b) => {
      if (a.finalHeight >= 100 && b.finalHeight >= 100) {
        return (a.completionTimeSeconds || 999) - (b.completionTimeSeconds || 999);
      }
      if (b.finalHeight !== a.finalHeight) {
        return b.finalHeight - a.finalHeight;
      }
      return b.score - a.score;
    });

    playerResults.forEach((res, idx) => {
      res.rank = idx + 1;
    });

    const winner = playerResults.length > 0 ? playerResults[0] : null;

    return {
      gameId: this.id,
      gameMode: this.state.gameMode,
      winner,
      rankings: playerResults,
      endedAt: this.gameEndedAt || Date.now(),
    };
  }

  public handlePlayerDisconnect(playerId: string): void {
    const climber = this.state.climbers[playerId];
    if (climber) {
      climber.isClimbing = false;
    }
  }

  public handlePlayerReconnect(player: Player): void {
    // Player state retained
  }

  public isFinished(): boolean {
    return this.finished;
  }

  public getState(): PanjatPinangGameState {
    return this.state;
  }

  public cleanup(): void {
    this.playerInputs.clear();
  }
}
