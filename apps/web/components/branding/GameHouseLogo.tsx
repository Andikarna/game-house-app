import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const GameHouseLogo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  showText = true 
}) => {
  const sizeMap = {
    sm: { icon: 28, text: 'text-lg', sub: 'text-[9px]' },
    md: { icon: 40, text: 'text-2xl', sub: 'text-[10px]' },
    lg: { icon: 54, text: 'text-3xl', sub: 'text-xs' },
    xl: { icon: 72, text: 'text-5xl', sub: 'text-sm' },
  };

  const { icon: iconSize, text: textSize, sub: subSize } = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Geometric House + Game Controller SVG Logo */}
      <div 
        className="relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-[2px] shadow-lg shadow-indigo-500/30 transition-transform duration-300 hover:scale-105"
        style={{ width: iconSize, height: iconSize }}
      >
        <div className="w-full h-full bg-surface rounded-[14px] flex items-center justify-center p-1.5 overflow-hidden relative">
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            {/* House Roof Geometric Peak */}
            <path
              d="M50 12 L88 42 L80 48 L50 24 L20 48 L12 42 Z"
              fill="url(#roof-gradient)"
            />
            {/* House Body / Controller Chassis */}
            <path
              d="M22 46 C22 42 26 38 30 38 L70 38 C74 38 78 42 78 46 L82 72 C83 80 75 86 68 82 L58 76 L42 76 L32 82 C25 86 17 80 18 72 Z"
              fill="url(#chassis-gradient)"
            />
            {/* D-Pad on Left (House Door shaped) */}
            <rect x="30" y="52" width="6" height="14" rx="2" fill="#FFFFFF" fillOpacity="0.9" />
            <rect x="26" y="56" width="14" height="6" rx="2" fill="#FFFFFF" fillOpacity="0.9" />
            
            {/* Action Buttons on Right (House Window layout) */}
            <circle cx="64" cy="54" r="3.2" fill="#F97316" />
            <circle cx="72" cy="62" r="3.2" fill="#06B6D4" />
            <circle cx="64" cy="70" r="3.2" fill="#10B981" />
            <circle cx="56" cy="62" r="3.2" fill="#F59E0B" />

            {/* Gradients */}
            <defs>
              <linearGradient id="roof-gradient" x1="12" y1="12" x2="88" y2="48" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F97316" />
                <stop offset="1" stopColor="#EC4899" />
              </linearGradient>
              <linearGradient id="chassis-gradient" x1="20" y1="38" x2="80" y2="84" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366F1" />
                <stop offset="0.5" stopColor="#8B5CF6" />
                <stop offset="1" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center">
            <span className={`font-black tracking-tight text-white ${textSize}`}>
              GAME
            </span>
            <span className={`font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-400 ${textSize}`}>
              HOUSE
            </span>
          </div>
          <span className={`font-semibold tracking-wider uppercase text-indigo-300/70 ${subSize}`}>
            Party Game Platform
          </span>
        </div>
      )}
    </div>
  );
};
