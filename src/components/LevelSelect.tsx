import React from 'react';
import { useGameStore } from '../store';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { GameData } from '../utils/GameData';
import { WORLDS } from './WorldSelect';

export const LevelSelect: React.FC = () => {
  const { coins, selectedWorld, selectLevel, setScreen } = useGameStore();

  const worldInfo = WORLDS.find(w => w.id === selectedWorld) ?? WORLDS[0];

  // Get max unlocked level for this world
  const maxUnlockedLevel = parseInt(
    localStorage.getItem(`arrow_buddies_w${selectedWorld}_level`) ?? '1'
  );

  const getStarsForLevel = (lvlIdx: number) => {
    return GameData.starsFor(selectedWorld, lvlIdx);
  };

  const getLevelColor = (unlocked: boolean) => {
    if (!unlocked) return '#17112a';
    // Return a gradient color based on world hue
    return `radial-gradient(circle at center, hsl(${worldInfo.hue}, 75%, 28%) 0%, #150a2d 100%)`;
  };

  const totalStars = GameData.totalStars();

  return (
    <div className="screen-container" style={{ background: '#0a001a' }}>
      {/* Header */}
      <div className="safe-top">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setScreen('world_select')}
          className="hud-btn"
        >
          <ArrowLeft size={20} />
        </motion.button>
        <span className="screen-title" style={{ fontSize: '20px' }}>
          {worldInfo.name}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="hud-bubble">
            <span>⭐</span>
            <span style={{ color: 'var(--color-yellow)' }}>{totalStars}</span>
          </div>
          <div className="hud-bubble">
            <span>🪙</span>
            <span>{coins}</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Level Tiles Grid */}
      <div className="level-grid">
        {Array.from({ length: 5 }).map((_, idx) => {
          const levelNum = idx + 1;
          const unlocked = levelNum <= maxUnlockedLevel;
          const stars = getStarsForLevel(levelNum);
          const tileBg = getLevelColor(unlocked);
          const activeBorderColor = `hsl(${worldInfo.hue}, 95%, 60%)`;

          return (
            <motion.div
              key={levelNum}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.05, type: 'spring', stiffness: 400, damping: 15 }}
              whileHover={unlocked ? { scale: 1.06, borderColor: activeBorderColor } : {}}
              onClick={() => {
                if (unlocked) {
                  selectLevel(levelNum, false);
                }
              }}
              className="level-tile"
              style={{
                background: tileBg,
                borderColor: unlocked ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.03)',
                cursor: unlocked ? 'pointer' : 'not-allowed',
                color: unlocked ? '#ffffff' : 'rgba(255,255,255,0.2)'
              }}
            >
              {unlocked ? (
                <>
                  <span style={{ transform: 'translateY(-6px)' }}>{levelNum}</span>
                  <div className="level-stars-mini">
                    {Array.from({ length: 3 }).map((_, sIdx) => (
                      <span
                        key={sIdx}
                        style={{
                          opacity: sIdx < stars ? 1 : 0.25,
                          textShadow: sIdx < stars ? '0 0 5px #ffcc00' : 'none'
                        }}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <span>🔒</span>
              )}
            </motion.div>
          );
        })}
      </div>

      <div style={{ flex: 1.2 }} />
    </div>
  );
};
