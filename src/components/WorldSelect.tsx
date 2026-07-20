import React from 'react';
import { useGameStore } from '../store';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { GameData } from '../utils/GameData';

export const WORLDS = [
  { id: 1, name: 'Jelly Hills',    emoji: '🌸', hue: 330, desc: 'Sweet & simple puzzles',  starsNeeded: 0 },
  { id: 2, name: 'Dino Valley',    emoji: '🦕', hue: 140, desc: 'Bombs, keys & chests!',   starsNeeded: 5 },
  { id: 3, name: 'Cosmo Station',  emoji: '🚀', hue: 225, desc: 'Rainbow magic & chaos!',  starsNeeded: 10 },
  { id: 4, name: 'Coral Reef',     emoji: '🐠', hue: 175, desc: 'Rotator waves & corals!', starsNeeded: 15 },
  { id: 5, name: 'Ice Castle',     emoji: '❄️', hue: 195, desc: 'Chilled locks & spires!',  starsNeeded: 22 },
  { id: 6, name: 'Volcanic Land',  emoji: '🌋', hue: 10,  desc: 'Magma cores & danger!',    starsNeeded: 30 }
];

export const WorldSelect: React.FC = () => {
  const { coins, selectWorld, setScreen } = useGameStore();

  const totalStars = GameData.totalStars();

  const getStarsForWorld = (worldId: number) => {
    let worldStars = 0;
    for (let l = 1; l <= 5; l++) {
      worldStars += GameData.starsFor(worldId, l);
    }
    return worldStars;
  };

  return (
    <div className="screen-container" style={{ background: '#0a001a' }}>
      {/* Header */}
      <div className="safe-top">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setScreen('menu')}
          className="hud-btn"
        >
          <ArrowLeft size={20} />
        </motion.button>
        <span className="screen-title">SELECT WORLD</span>
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

      {/* World Cards Grid */}
      <div className="world-grid">
        {WORLDS.map((world, i) => {
          const unlocked = totalStars >= world.starsNeeded;
          const starsEarned = getStarsForWorld(world.id);
          const borderGlowColor = `hsl(${world.hue}, 100%, 65%)`;

          return (
            <motion.div
              key={world.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
              whileHover={unlocked ? { y: -6, borderColor: borderGlowColor } : {}}
              onClick={() => {
                if (unlocked) {
                  selectWorld(world.id);
                }
              }}
              className={`world-card ${!unlocked ? 'world-locked' : ''}`}
              style={{
                background: unlocked 
                  ? `radial-gradient(circle at center, hsl(${world.hue}, 80%, 25%) 0%, #100624 100%)`
                  : '#120c20',
                borderColor: unlocked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)'
              }}
            >
              <div className="world-card-glow" />
              
              <span className="world-index">0{world.id}</span>
              
              <span className="world-emoji">{world.emoji}</span>
              
              <span className="world-name" style={{ color: unlocked ? '#ffffff' : 'rgba(255,255,255,0.4)' }}>
                {world.name}
              </span>
              
              {unlocked ? (
                <span className="world-stars">
                  ⭐ {starsEarned}/15
                </span>
              ) : (
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.5)',
                  background: 'rgba(0,0,0,0.5)',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  <span>🔒</span>
                  <span>{world.starsNeeded} ⭐</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
