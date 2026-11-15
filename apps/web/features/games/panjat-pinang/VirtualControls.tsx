import React from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  RefreshCw,
  Shield,
  Zap,
  AlertTriangle,
  Wind,
  Crown
} from 'lucide-react';
import { ClimberInput, ClimberPlayerState, SkillType, SKILL_DEFINITIONS } from '@gamehouse/shared';

interface VirtualControlsProps {
  inputState: ClimberInput;
  setInputKey: (key: keyof ClimberInput, pressed: boolean) => void;
  climber?: ClimberPlayerState;
  onActivateSkill: (skill: SkillType) => void;
}

export const VirtualControls: React.FC<VirtualControlsProps> = ({
  inputState,
  setInputKey,
  climber,
  onActivateSkill,
}) => {
  const triggerHaptic = (ms: number = 25) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch {}
    }
  };

  const handleTouchKey = (key: keyof ClimberInput, pressed: boolean) => (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (pressed) triggerHaptic(20);
    setInputKey(key, pressed);
  };

  const handleSkillTap = (skill: SkillType) => (e: React.SyntheticEvent) => {
    e.preventDefault();
    triggerHaptic(40);
    onActivateSkill(skill);
  };

  const isStunned = climber?.isStunned || false;
  const energy = climber?.energy || 0;
  const isUltimateReady = energy >= 100;

  // Skill cooldown checks
  const getCd = (type: SkillType) => climber?.skillCooldowns[type] || 0;
  const isEffectActive = (type: SkillType) => climber?.activeEffects.some(e => e.type === type);

  return (
    <div
      className="w-full flex items-end justify-between px-2 sm:px-6 select-none touch-control pointer-events-none"
      style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom, 14px))' }}
    >
      {/* ================= LEFT THUMB: DIRECTIONAL D-PAD ================= */}
      <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center pointer-events-auto shrink-0">
        {/* Semi-transparent D-Pad Background Circle */}
        <div className="absolute inset-0 rounded-full bg-slate-900/75 backdrop-blur-md border border-slate-700/60 shadow-2xl" />

        {/* Center Pivot Indicator */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-surface border border-slate-700/80 flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-slate-400">
          CLIMB
        </div>

        {/* UP / CLIMB BUTTON */}
        <button
          type="button"
          onTouchStart={handleTouchKey('up', true)}
          onTouchEnd={handleTouchKey('up', false)}
          onMouseDown={handleTouchKey('up', true)}
          onMouseUp={handleTouchKey('up', false)}
          className={`absolute top-1 left-1/2 -translate-x-1/2 w-11 sm:w-12 h-12 sm:h-13 rounded-t-2xl rounded-b-lg flex flex-col items-center justify-center transition-all ${
            inputState.up
              ? 'bg-orange-500 text-white shadow-glow-orange scale-95'
              : 'bg-surface-elevated/90 text-orange-400 border border-orange-500/30 active:bg-orange-600'
          }`}
          title="Climb Up"
        >
          <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
          <span className="text-[7px] sm:text-[8px] font-black tracking-tighter">UP</span>
        </button>

        {/* DOWN / DESCEND BUTTON */}
        <button
          type="button"
          onTouchStart={handleTouchKey('down', true)}
          onTouchEnd={handleTouchKey('down', false)}
          onMouseDown={handleTouchKey('down', true)}
          onMouseUp={handleTouchKey('down', false)}
          className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-11 sm:w-12 h-10 sm:h-11 rounded-b-2xl rounded-t-lg flex items-center justify-center transition-all ${
            inputState.down
              ? 'bg-indigo-500 text-white shadow-glow-primary scale-95'
              : 'bg-surface-elevated/90 text-indigo-300 border border-slate-700 active:bg-indigo-600'
          }`}
          title="Descend"
        >
          <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* LEFT / BALANCE LEFT BUTTON */}
        <button
          type="button"
          onTouchStart={handleTouchKey('left', true)}
          onTouchEnd={handleTouchKey('left', false)}
          onMouseDown={handleTouchKey('left', true)}
          onMouseUp={handleTouchKey('left', false)}
          className={`absolute left-1 top-1/2 -translate-y-1/2 w-10 sm:w-11 h-11 sm:h-12 rounded-l-2xl rounded-r-lg flex items-center justify-center transition-all ${
            inputState.left
              ? 'bg-cyan-500 text-white shadow-glow-cyan scale-95'
              : 'bg-surface-elevated/90 text-cyan-300 border border-slate-700 active:bg-cyan-600'
          }`}
          title="Balance Left"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* RIGHT / BALANCE RIGHT BUTTON */}
        <button
          type="button"
          onTouchStart={handleTouchKey('right', true)}
          onTouchEnd={handleTouchKey('right', false)}
          onMouseDown={handleTouchKey('right', true)}
          onMouseUp={handleTouchKey('right', false)}
          className={`absolute right-1 top-1/2 -translate-y-1/2 w-10 sm:w-11 h-11 sm:h-12 rounded-r-2xl rounded-l-lg flex items-center justify-center transition-all ${
            inputState.right
              ? 'bg-cyan-500 text-white shadow-glow-cyan scale-95'
              : 'bg-surface-elevated/90 text-cyan-300 border border-slate-700 active:bg-cyan-600'
          }`}
          title="Balance Right"
        >
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* ================= RIGHT THUMB: ACTION & SKILL CLUSTER ================= */}
      <div className="relative w-36 h-36 sm:w-48 sm:h-48 flex items-center justify-center pointer-events-auto shrink-0">
        {/* Action Panel Frosted Background */}
        <div className="absolute inset-0 rounded-full bg-slate-900/75 backdrop-blur-md border border-slate-700/60 shadow-2xl" />

        {/* 1. BIG RECOVERY / STUN BUTTON (Centered for Right Thumb) */}
        <button
          type="button"
          onTouchStart={handleTouchKey('recovery', true)}
          onTouchEnd={handleTouchKey('recovery', false)}
          onMouseDown={handleTouchKey('recovery', true)}
          onMouseUp={handleTouchKey('recovery', false)}
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center font-black transition-all border-2 shadow-lg ${
            isStunned
              ? 'bg-gradient-to-tr from-rose-600 to-amber-500 text-white border-amber-300 shadow-glow-orange scale-105 animate-pulse'
              : inputState.recovery
              ? 'bg-emerald-500 text-white border-emerald-300 shadow-lg scale-95'
              : 'bg-surface-elevated text-emerald-400 border-emerald-500/50 active:scale-95'
          }`}
        >
          <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 mb-0.5 ${isStunned ? 'animate-spin' : ''}`} />
          <span className="text-[8px] sm:text-[9px] font-black tracking-tight leading-none">
            {isStunned ? 'MASH!' : 'RECOVER'}
          </span>
        </button>

        {/* 2. SKILL 1: IRON GRIP (Top-Left of cluster) */}
        <button
          type="button"
          disabled={getCd('iron_grip') > 0}
          onTouchStart={handleSkillTap('iron_grip')}
          onMouseDown={handleSkillTap('iron_grip')}
          className={`absolute top-1 left-1.5 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex flex-col items-center justify-center border transition-all ${
            isEffectActive('iron_grip')
              ? 'bg-cyan-500 text-white border-cyan-200 shadow-glow-cyan animate-pulse'
              : getCd('iron_grip') > 0
              ? 'bg-slate-900/80 text-slate-500 border-slate-800'
              : 'bg-surface-elevated/95 text-cyan-300 border-cyan-500/50 active:scale-90'
          }`}
          title="Iron Grip"
        >
          {getCd('iron_grip') > 0 ? (
            <span className="text-[9px] sm:text-[10px] font-black text-amber-400">{Math.ceil(getCd('iron_grip'))}s</span>
          ) : (
            <>
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[6px] sm:text-[7px] font-bold">GRIP</span>
            </>
          )}
        </button>

        {/* 3. SKILL 2: SUPER CLIMB (Top-Center of cluster) */}
        <button
          type="button"
          disabled={getCd('super_climb') > 0}
          onTouchStart={handleSkillTap('super_climb')}
          onMouseDown={handleSkillTap('super_climb')}
          className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex flex-col items-center justify-center border transition-all ${
            isEffectActive('super_climb')
              ? 'bg-amber-500 text-white border-amber-200 shadow-glow-orange animate-pulse'
              : getCd('super_climb') > 0
              ? 'bg-slate-900/80 text-slate-500 border-slate-800'
              : 'bg-surface-elevated/95 text-amber-400 border-amber-500/50 active:scale-90'
          }`}
          title="Super Climb"
        >
          {getCd('super_climb') > 0 ? (
            <span className="text-[9px] sm:text-[10px] font-black text-amber-400">{Math.ceil(getCd('super_climb'))}s</span>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400" />
              <span className="text-[6px] sm:text-[7px] font-bold">2X</span>
            </>
          )}
        </button>

        {/* 4. SKILL 3: BANANA TRAP (Top-Right of cluster) */}
        <button
          type="button"
          disabled={getCd('banana_trap') > 0}
          onTouchStart={handleSkillTap('banana_trap')}
          onMouseDown={handleSkillTap('banana_trap')}
          className={`absolute top-1 right-1.5 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex flex-col items-center justify-center border transition-all ${
            getCd('banana_trap') > 0
              ? 'bg-slate-900/80 text-slate-500 border-slate-800'
              : 'bg-surface-elevated/95 text-yellow-300 border-yellow-500/50 active:scale-90'
          }`}
          title="Banana Trap"
        >
          {getCd('banana_trap') > 0 ? (
            <span className="text-[9px] sm:text-[10px] font-black text-amber-400">{Math.ceil(getCd('banana_trap'))}s</span>
          ) : (
            <>
              <span className="text-[10px] sm:text-xs">🍌</span>
              <span className="text-[6px] sm:text-[7px] font-bold">TRAP</span>
            </>
          )}
        </button>

        {/* 5. SKILL 4: WIND BOOST (Left side of cluster) */}
        <button
          type="button"
          disabled={getCd('wind_boost') > 0}
          onTouchStart={handleSkillTap('wind_boost')}
          onMouseDown={handleSkillTap('wind_boost')}
          className={`absolute left-0.5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex flex-col items-center justify-center border transition-all ${
            getCd('wind_boost') > 0
              ? 'bg-slate-900/80 text-slate-500 border-slate-800'
              : 'bg-surface-elevated/95 text-sky-300 border-sky-500/50 active:scale-90'
          }`}
          title="Wind Boost"
        >
          {getCd('wind_boost') > 0 ? (
            <span className="text-[9px] sm:text-[10px] font-black text-amber-400">{Math.ceil(getCd('wind_boost'))}s</span>
          ) : (
            <>
              <Wind className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[6px] sm:text-[7px] font-bold">WIND</span>
            </>
          )}
        </button>

        {/* 6. ULTIMATE: LEGENDARY CLIMBER (Right side of cluster) */}
        <button
          type="button"
          disabled={!isUltimateReady || getCd('legendary_climber') > 0}
          onTouchStart={handleSkillTap('legendary_climber')}
          onMouseDown={handleSkillTap('legendary_climber')}
          className={`absolute right-0.5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex flex-col items-center justify-center border transition-all ${
            isEffectActive('legendary_climber')
              ? 'bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-white border-white shadow-glow-accent animate-pulse scale-110'
              : isUltimateReady
              ? 'bg-gradient-to-r from-amber-500 to-pink-500 text-white border-yellow-300 shadow-glow-orange scale-105 animate-bounce'
              : 'bg-slate-900/80 text-slate-600 border-slate-800 opacity-60'
          }`}
          title="Legendary Climber Ultimate"
        >
          <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-[6px] sm:text-[7px] font-black">
            {isUltimateReady ? 'ULT!' : `${energy}%`}
          </span>
        </button>
      </div>
    </div>
  );
};
