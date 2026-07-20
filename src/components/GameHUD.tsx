import React from 'react';
import { useGameStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCw, RotateCcw, Home, HelpCircle, RefreshCw } from 'lucide-react';
import { WORLDS } from './WorldSelect';

export const GameHUD: React.FC = () => {
  const {
    coins,
    movesLeft,
    movesTotal,
    parTotal,
    selectedWorld,
    selectedLevel,
    isDaily,
    comboCount,
    setScreen,
    resetLevel,
    rotateView,
    setModal
  } = useGameStore();

  const worldInfo = WORLDS.find(w => w.id === selectedWorld) ?? WORLDS[0];



  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {/* Top HUD Row */}
      <div className="gameplay-hud" style={{ pointerEvents: 'auto' }}>
        {/* Left stack: Back Button + Level display */}
        <div className="hud-left">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setScreen('level_select')}
            className="hud-btn"
          >
            <ArrowLeft size={20} />
          </motion.button>
          
          <div className="hud-bubble" style={{ borderLeftWidth: '5px', borderLeftColor: `hsl(${worldInfo.hue}, 95%, 60%)` }}>
            <span style={{ fontSize: '12px', letterSpacing: '0.5px' }}>
              {isDaily ? 'DAILY' : `W${selectedWorld} · L${selectedLevel}`}
            </span>
          </div>
        </div>

        {/* Center: Moves / Stars Bubble */}
        <div className="hud-center-card">
          <div className="hud-moves-metric">
            <span className="hud-moves-val" style={{ color: movesLeft <= 3 ? 'var(--color-pink)' : 'var(--color-cyan)' }}>
              {movesLeft}
            </span>
            <span className="hud-moves-lbl">MOVES</span>
          </div>

          <div className="hud-divider" />

          <div className="hud-stars-metric">
            <span className="hud-stars-val">
              {Array.from({ length: 3 }).map((_, sIdx) => {
                const earned = movesLeft >= Math.max(1, Math.round(movesTotal * (sIdx === 2 ? 0.4 : sIdx === 1 ? 0.15 : 0)));
                return (
                  <span
                    key={sIdx}
                    style={{
                      opacity: earned ? 1 : 0.2,
                      textShadow: earned ? '0 0 5px #ffcc00' : 'none',
                      fontSize: '20px'
                    }}
                  >
                    ⭐
                  </span>
                );
              })}
            </span>
            <span className="hud-moves-lbl" style={{ color: 'var(--color-yellow)' }}>
              TARGET: {parTotal}
            </span>
          </div>
        </div>

        {/* Right Stack: Reset + Help + Coin meter */}
        <div className="hud-right">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => resetLevel()}
            className="hud-btn"
            title="Reset level"
          >
            <RefreshCw size={18} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setModal('help')}
            className="hud-btn"
          >
            <HelpCircle size={18} />
          </motion.button>

          <div className="hud-bubble">
            <span>🪙</span>
            <span>{coins}</span>
          </div>
        </div>
      </div>

      {/* Combo Banner Animation Overlay */}
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

      {/* Bottom Rotate Controls */}
      <div className="bottom-controls">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => rotateView(-1)}
          className="rotate-btn"
          title="Rotate Board Left"
        >
          <RotateCcw size={24} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setScreen('menu')}
          className="rotate-btn"
          style={{
            width: '52px',
            height: '52px',
            marginTop: '4px',
            background: 'linear-gradient(to bottom, hsl(335, 100%, 72%), hsl(335, 100%, 58%))',
            borderBottomColor: 'hsl(335, 100%, 35%)'
          }}
          title="Go to main menu"
        >
          <Home size={20} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => rotateView(1)}
          className="rotate-btn"
          title="Rotate Board Right"
        >
          <RotateCw size={24} />
        </motion.button>
      </div>
    </div>
  );
};
