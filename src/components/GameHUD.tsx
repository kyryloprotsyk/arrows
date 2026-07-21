import React from 'react';
import { useGameStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, HelpCircle, RefreshCw, Undo2, Settings } from 'lucide-react';

export const GameHUD: React.FC = () => {
  const {
    movesLeft,
    movesTotal,
    levelNumberText,
    comboCount,
    setScreen,
    resetLevel,
    undoMove,
    setModal
  } = useGameStore();

  const ratio = movesLeft / movesTotal;
  const starsEarned = ratio >= 0.4 ? 3 : ratio >= 0.15 ? 2 : 1;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {/* Top Floating Glassmorphism HUD Bar */}
      <div className="hud-top-floating-bar">
        {/* Left: Level Pill + Pause/Settings Cog */}
        <div className="hud-pill-container" style={{ pointerEvents: 'auto' }}>
          <div className="hud-floating-pill level-pill">
            <span className="hud-pill-label">{levelNumberText}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setModal('help')}
            className="hud-settings-btn"
            title="Settings"
          >
            <Settings size={18} strokeWidth={2.2} />
          </motion.button>
        </div>

        {/* Center: Moves Remaining */}
        <div className="hud-pill-container">
          <div className="hud-floating-pill moves-pill">
            <span className="moves-star-icon">⚡</span>
            <span className="hud-pill-label" style={{ fontWeight: 700 }}>
              {movesLeft} <span style={{ opacity: 0.6, fontWeight: 500 }}>/ {movesTotal}</span>
            </span>
          </div>
        </div>

        {/* Right: Stars Earned */}
        <div className="hud-pill-container">
          <div className="hud-floating-pill stars-pill">
            <div className="star-slots-mini">
              <span className="star-slot-mini-icon" style={{ opacity: starsEarned >= 1 ? 1 : 0.25 }}>⭐</span>
              <span className="star-slot-mini-icon" style={{ opacity: starsEarned >= 2 ? 1 : 0.25 }}>⭐</span>
              <span className="star-slot-mini-icon" style={{ opacity: starsEarned >= 3 ? 1 : 0.25 }}>⭐</span>
            </div>
          </div>
        </div>
      </div>

      {/* Combo Banner Overlay */}
      <AnimatePresence>
        {comboCount >= 2 && (
          <motion.div
            key={comboCount}
            initial={{ scale: 0.5, opacity: 0, y: 30 }}
            animate={{ scale: 1.1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -30 }}
            transition={{ type: 'spring', stiffness: 500, damping: 12 }}
            className="combo-banner"
          >
            COMBO x{comboCount}! 🔥
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Floating Utility Dock */}
      <div className="bottom-utility-dock" style={{ pointerEvents: 'auto' }}>
        <div className="utility-dock-inner">
          {/* Home */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setScreen('menu')}
            className="dock-icon-btn"
            title="Home"
          >
            <Home size={20} strokeWidth={2.0} />
          </motion.button>

          {/* Undo */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => undoMove()}
            className="dock-icon-btn"
            title="Undo Move"
          >
            <Undo2 size={20} strokeWidth={2.0} />
          </motion.button>

          {/* Reset */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => resetLevel()}
            className="dock-icon-btn dock-icon-btn--reset"
            title="Reset Level"
          >
            <RefreshCw size={20} strokeWidth={2.0} />
          </motion.button>

          {/* Help / Hint */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setModal('help')}
            className="dock-icon-btn"
            title="Help"
          >
            <HelpCircle size={20} strokeWidth={2.0} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};
