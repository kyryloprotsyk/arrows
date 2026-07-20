import React from 'react';
import { useGameStore } from '../store';
import { GelButton } from './GelButton';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Trophy, Calendar, ShoppingBag } from 'lucide-react';

export const MainMenu: React.FC = () => {
  const {
    coins,
    username,
    avatar,
    playerXP,
    muted,
    setMuted,
    setScreen,
    setModal
  } = useGameStore();

  const getLevel = () => {
    if (playerXP <= 0) return 1;
    return Math.min(100, Math.floor(Math.pow(playerXP / 100, 1 / 1.4)) + 1);
  };

  return (
    <div className="screen-container">
      {/* Top HUD Row */}
      <div className="safe-top">
        {/* Profile Card Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setModal('profile')}
          className="hud-bubble"
          style={{ cursor: 'pointer' }}
        >
          <span style={{ fontSize: '20px' }}>{avatar}</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>{username}</span>
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)' }}>LVL {getLevel()}</span>
          </div>
        </motion.div>

        {/* Sound Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setMuted(!muted)}
          className="hud-btn"
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </motion.button>
      </div>

      {/* Spacer to make space for wobbly 3D buddy in R3F */}
      <div style={{ flex: 1, minHeight: '120px' }} />

      {/* Game Title */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 className="neon-text-pink" style={{ fontSize: '48px', lineHeight: 0.9 }}>
          ARROW
        </h1>
        <h2 className="neon-text-cyan" style={{ fontSize: '36px', lineHeight: 1.1, marginTop: '4px' }}>
          BUDDIES 3D
        </h2>
      </div>

      {/* Action Buttons Stack */}
      <div style={{ width: '100%', maxWidth: '280px', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        <GelButton color="pink" onClick={() => setScreen('world_select')}>
          PLAY GAME
        </GelButton>
        <GelButton color="green" onClick={() => setModal('daily')}>
          <Calendar size={18} style={{ marginRight: '8px' }} />
          DAILY CHALLENGE
        </GelButton>
        <GelButton color="orange" onClick={() => setModal('leaderboard')}>
          <Trophy size={18} style={{ marginRight: '8px' }} />
          LEADERBOARDS
        </GelButton>
        <GelButton color="purple" onClick={() => setModal('shop')}>
          <ShoppingBag size={18} style={{ marginRight: '8px' }} />
          SKINS SHOP
        </GelButton>
      </div>

      {/* Coin Meter at Bottom */}
      <div className="hud-bubble" style={{ marginBottom: '16px', fontSize: '18px' }}>
        <span>🪙</span>
        <span>{coins}</span>
      </div>
    </div>
  );
};
