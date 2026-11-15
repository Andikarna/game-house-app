import { useEffect, useRef, useState } from 'react';
import { ClimberInput, SkillType } from '@gamehouse/shared';
import { useGameStore } from '../stores/useGameStore';
import { soundManager } from '../components/audio/SoundManager';

export function useKeyboardControls(onSkillTrigger?: (skill: SkillType) => void) {
  const { socket, gameState, playerId } = useGameStore();

  const inputState = useRef<ClimberInput>({
    up: false,
    down: false,
    left: false,
    right: false,
    recovery: false,
    timestamp: Date.now(),
  });

  // State to drive UI virtual buttons
  const [activeInputs, setActiveInputs] = useState<ClimberInput>({ ...inputState.current });

  const setInputKey = (key: keyof ClimberInput, pressed: boolean) => {
    if (typeof inputState.current[key] === 'boolean') {
      (inputState.current as any)[key] = pressed;
      setActiveInputs({ ...inputState.current });

      if (key === 'up' && pressed) {
        soundManager.playClimb();
      }
    }
  };

  useEffect(() => {
    if (!gameState || gameState.status !== 'in-game') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input element
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const code = e.code;

      if (code === 'KeyW' || code === 'ArrowUp') {
        if (!inputState.current.up) soundManager.playClimb();
        inputState.current.up = true;
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        inputState.current.down = true;
      } else if (code === 'KeyA' || code === 'ArrowLeft') {
        inputState.current.left = true;
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        inputState.current.right = true;
      } else if (code === 'Space') {
        e.preventDefault();
        inputState.current.recovery = true;
      }

      // Skill hotkeys
      if (onSkillTrigger) {
        if (code === 'KeyQ') {
          onSkillTrigger('iron_grip');
        } else if (code === 'KeyE') {
          onSkillTrigger('super_climb');
        } else if (code === 'Digit1') {
          onSkillTrigger('banana_trap');
        } else if (code === 'Digit2') {
          onSkillTrigger('wind_boost');
        } else if (code === 'KeyR') {
          onSkillTrigger('legendary_climber');
        }
      }

      setActiveInputs({ ...inputState.current });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') {
        inputState.current.up = false;
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        inputState.current.down = false;
      } else if (code === 'KeyA' || code === 'ArrowLeft') {
        inputState.current.left = false;
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        inputState.current.right = false;
      } else if (code === 'Space') {
        inputState.current.recovery = false;
      }

      setActiveInputs({ ...inputState.current });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Continuous input streaming to server at 20Hz
    const interval = setInterval(() => {
      if (socket && socket.connected) {
        inputState.current.timestamp = Date.now();
        socket.emit('game:input', inputState.current);
      }
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(interval);
    };
  }, [socket, gameState, onSkillTrigger]);

  return { activeInputs, setInputKey };
}
