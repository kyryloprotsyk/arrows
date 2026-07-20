import React from 'react';
import { useGameStore } from '../store';
import { GelButton } from './GelButton';
import { motion } from 'framer-motion';
import { User, VolumeX, Volume2 } from 'lucide-react';
import { Menu3DCharacter } from '../App';

export const MainMenu: React.FC = () => {
  const {
    coins,
    muted,
    setMuted,
    setScreen,
    setModal
  } = useGameStore();

  return (
    <div className="screen-container menu-screen">
      {/* Top HUD Row */}
      <div className="menu-top-row">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setModal('profile')}
          className="menu-icon-btn menu-icon-btn--profile"
        >
          <User size={24} strokeWidth={1.8} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setMuted(!muted)}
          className="menu-icon-btn menu-icon-btn--sound"
        >
          {muted ? <VolumeX size={22} strokeWidth={1.8} /> : <Volume2 size={22} strokeWidth={1.8} />}
        </motion.button>
      </div>

      {/* Game Title */}
      <div className="menu-title-block">
        <h1 className="menu-title-line1">ARROW</h1>
        <h2 className="menu-title-line2">BUDDIES 3D</h2>
      </div>

      {/* 3D Floating Buddy — inline in flex flow */}
      <Menu3DCharacter />

      {/* Action Buttons Stack */}
      <div className="menu-buttons-stack">
        <GelButton color="pink" onClick={() => setScreen('world_select')}>
          PLAY GAME
        </GelButton>
        <GelButton color="green" onClick={() => setModal('daily')}>
          DAILY CHALLENGE
        </GelButton>
        <GelButton color="orange" onClick={() => setModal('leaderboard')}>
          LEADERBOARDS
        </GelButton>
        <GelButton color="purple" onClick={() => setModal('shop')}>
          SKINS SHOP
        </GelButton>
      </div>

      {/* Coin Display at Bottom */}
      <div className="menu-coin-row">
        <span className="menu-coin-icon">🪙</span>
        <span className="menu-coin-count">{coins} Coins</span>
      </div>
    </div>
  );
};
