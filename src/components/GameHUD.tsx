import React from 'react';
import { useGameStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, RotateCw, Home, HelpCircle, RefreshCw } from 'lucide-react';

export const GameHUD: React.FC = () => {
  const {
    movesLeft,
    movesTotal,
    levelName,
    levelNumberText,
    comboCount,
    setScreen,
    resetLevel,
    rotateView,
    setModal
  } = useGameStore();

  const ratio = movesLeft / movesTotal;
  const starsEarned = ratio >= 0.4 ? 3 : ratio >= 0.15 ? 2 : 1;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {/* Top HUD Containers */}
      <div className="hud-top-container">
        {/* Left: MOVES Capsule */}
        <div className="moves-capsule">
          <span className="moves-title">Moves</span>
          <div className="moves-value-container">
            <span className="moves-star-icon">⭐</span>
            <span className="moves-value">{movesLeft}</span>
            <span className="moves-total">/{movesTotal}</span>
          </div>
        </div>

        {/* Center: Title Capsule + Stars Pill */}
        <div className="center-hud-group">
          <div className="level-title-capsule">
            <span className="level-title-text">
              {levelNumberText}: {levelName}
            </span>
          </div>
          
          <div className="star-slots-pill">
            <span className="star-slot-icon" style={{ opacity: starsEarned >= 1 ? 1 : 0.25 }}>⭐</span>
            <span className="star-slot-icon" style={{ opacity: starsEarned >= 2 ? 1 : 0.25 }}>⭐</span>
            <span className="star-slot-icon" style={{ opacity: starsEarned >= 3 ? 1 : 0.25 }}>⭐</span>
          </div>
        </div>

        {/* Right: STARS Capsule */}
        <div className="stars-capsule">
          <span className="stars-title">Stars:</span>
          <div className="stars-value-container">
            <span className="moves-star-icon">⭐</span>
            <span className="stars-value">{starsEarned}</span>
            <span className="stars-total">/3</span>
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

      {/* Bottom control capsule panel */}
      <div className="bottom-hud-bar">
        {/* Rotate Left Button */}
        <div className="control-btn-wrapper">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => rotateView(-1)}
            className="btn-gel-control"
            title="Rotate Left"
          >
            <RotateCcw size={22} />
          </motion.button>
          <span className="control-btn-label">Rotate Left</span>
        </div>

        {/* Rotate Right Button */}
        <div className="control-btn-wrapper">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => rotateView(1)}
            className="btn-gel-control"
            title="Rotate Right"
          >
            <RotateCw size={22} />
          </motion.button>
          <span className="control-btn-label">Rotate Right</span>
        </div>

        {/* Home Button */}
        <div className="control-btn-wrapper">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setScreen('menu')}
            className="btn-gel-control"
            title="Home"
          >
            <Home size={22} />
          </motion.button>
          <span className="control-btn-label">Home</span>
        </div>

        {/* Reset Button (Pink variant) */}
        <div className="control-btn-wrapper">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => resetLevel()}
            className="btn-gel-control btn-gel-control-pink"
            title="Reset"
          >
            <RefreshCw size={22} />
          </motion.button>
          <span className="control-btn-label">Reset</span>
        </div>

        {/* Help Button */}
        <div className="control-btn-wrapper">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setModal('help')}
            className="btn-gel-control"
            title="Help"
          >
            <HelpCircle size={22} />
          </motion.button>
          <span className="control-btn-label">Help</span>
        </div>
      </div>
    </div>
  );
};
