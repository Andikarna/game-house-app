import React from 'react';
import { ClimberPlayerState, SkillType, SKILL_DEFINITIONS } from '@gamehouse/shared';
import { Shield, Zap, RefreshCw, AlertTriangle, Wind, Crown } from 'lucide-react';

interface SkillBarProps {
  climber?: ClimberPlayerState;
  onActivateSkill: (skill: SkillType) => void;
}

export const SkillActionBar: React.FC<SkillBarProps> = ({ climber, onActivateSkill }) => {
  if (!climber) return null;

  const skillsOrder: { type: SkillType; hotkey: string }[] = [
    { type: 'iron_grip', hotkey: 'Q' },
    { type: 'super_climb', hotkey: 'E' },
    { type: 'recovery', hotkey: 'SPACE' },
    { type: 'banana_trap', hotkey: '1' },
    { type: 'wind_boost', hotkey: '2' },
    { type: 'legendary_climber', hotkey: 'R' },
  ];

  const iconMap: Record<SkillType, React.ReactNode> = {
    iron_grip: <Shield className="w-5 h-5 text-cyan-400" />,
    super_climb: <Zap className="w-5 h-5 text-amber-400" />,
    recovery: <RefreshCw className="w-5 h-5 text-emerald-400" />,
    banana_trap: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    wind_boost: <Wind className="w-5 h-5 text-sky-400" />,
    legendary_climber: <Crown className="w-5 h-5 text-pink-400" />,
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 bg-surface/90 backdrop-blur-md px-3 sm:px-5 py-2.5 rounded-2xl border border-slate-700/60 shadow-2xl select-none max-w-full overflow-x-auto">
      {skillsOrder.map(({ type, hotkey }) => {
        const def = SKILL_DEFINITIONS[type];
        const cdRemaining = climber.skillCooldowns[type] || 0;
        const isOnCd = cdRemaining > 0;
        const isActive = climber.activeEffects.some(e => e.type === type);
        const isUltimate = def.isUltimate;
        const canUseUltimate = isUltimate ? climber.energy >= 100 : true;
        const isDisabled = isOnCd || !canUseUltimate || (climber.isStunned && type !== 'recovery');

        return (
          <button
            key={type}
            type="button"
            disabled={isDisabled}
            onClick={() => onActivateSkill(type)}
            title={`${def.name}: ${def.description}`}
            className={`relative flex flex-col items-center justify-center w-12 h-14 sm:w-14 sm:h-16 rounded-xl border transition-all duration-150 active:scale-90 cursor-pointer ${
              isActive
                ? 'bg-indigo-600/30 border-cyan-400 shadow-glow-cyan animate-pulse'
                : isUltimate && canUseUltimate
                ? 'bg-gradient-to-b from-purple-600/30 to-pink-600/30 border-pink-500 shadow-glow-accent'
                : isDisabled
                ? 'bg-slate-900/60 border-slate-800 opacity-50 cursor-not-allowed'
                : 'bg-surface-elevated hover:bg-surface-card border-slate-700/80 hover:border-slate-500'
            }`}
          >
            {/* Skill Icon */}
            <div className="mb-1">{iconMap[type]}</div>

            {/* Hotkey Tag */}
            <span className="text-[10px] font-black text-slate-300 bg-slate-900/80 px-1 rounded border border-slate-800">
              {hotkey}
            </span>

            {/* Cooldown Overlay */}
            {isOnCd && (
              <div className="absolute inset-0 bg-black/80 rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                <span className="text-xs font-black text-amber-400">
                  {Math.ceil(cdRemaining)}s
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
