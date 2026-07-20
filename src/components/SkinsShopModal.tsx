import React, { useState } from 'react';
import { useGameStore } from '../store';
import { SKIN_LIST } from '../skins';
import { GelButton } from './GelButton';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export const SkinsShopModal: React.FC = () => {
  const {
    coins,
    activeSkin,
    unlockedSkins,
    setModal,
    rollGacha,
    equipSkin
  } = useGameStore();

  const [isShaking, setIsShaking] = useState(false);
  const [rolledSkinResult, setRolledSkinResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRollGacha = () => {
    if (coins < 50) {
      setErrorMessage('Not enough coins! Need 50 🪙');
      setTimeout(() => setErrorMessage(null), 2500);
      return;
    }

    setRolledSkinResult(null);
    setIsShaking(true);

    // Simulate gacha capsule shake
    setTimeout(() => {
      setIsShaking(false);
      const res = rollGacha();
      if (res.success && res.skin) {
        setRolledSkinResult(res.skin);
        // Explode confetti on roll!
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      } else {
        setErrorMessage(res.message);
        setTimeout(() => setErrorMessage(null), 2500);
      }
    }, 1200);
  };

  return (
    <div className="glass-modal">
      <div className="modal-content glass-panel" style={{ background: 'rgba(25, 12, 48, 0.88)' }}>
        <button className="close-btn" onClick={() => setModal(null)}>
          <X size={18} />
        </button>

        <h2 style={{ textAlign: 'center', marginBottom: '16px', fontSize: '24px', color: 'var(--color-purple)', textShadow: '0 0 10px rgba(177, 126, 255, 0.4)' }}>
          HATS SHOP
        </h2>

        {/* Coin Meter */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div className="hud-bubble">
            <span>🪙</span>
            <span>{coins}</span>
          </div>
        </div>

        {/* Gacha Machine Shake Demo */}
        <div style={{ position: 'relative', marginBottom: '24px', textAlign: 'center' }}>
          <div className={`gacha-animation ${isShaking ? 'shake-heavy' : ''}`} style={{ width: '90px', height: '90px', fontSize: '44px' }}>
            {isShaking ? '🌀' : '🔮'}
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: '6px' }}>
            Roll a random hat for 50 coins!
          </span>
        </div>

        {/* Gacha roll action */}
        <div style={{ marginBottom: '20px' }}>
          <GelButton color="purple" onClick={handleRollGacha} disabled={isShaking}>
            {isShaking ? 'ROLLING...' : 'ROLL GACHA 🪙 50'}
          </GelButton>
        </div>

        {/* Error/Warning message */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ color: '#ff5555', textAlign: 'center', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}
            >
              ⚠️ {errorMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skins Grid List */}
        <h3 style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>
          My Collection
        </h3>
        
        <div className="skin-grid">
          {SKIN_LIST.map((skin) => {
            const isUnlocked = unlockedSkins.includes(skin.id);
            const isActive = activeSkin === skin.id;

            return (
              <div
                key={skin.id}
                onClick={() => {
                  if (isUnlocked) {
                    equipSkin(skin.id);
                  }
                }}
                className={`skin-tile ${isActive ? 'active' : ''}`}
                style={{ opacity: isUnlocked ? 1 : 0.65 }}
              >
                <span className="skin-emoji">{skin.emoji}</span>
                <span className={`skin-name rarity-${skin.rarity}`}>
                  {skin.name}
                </span>

                {!isUnlocked && (
                  <div className="skin-locked-overlay">
                    <span>🔒</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Rolled Result popup */}
        <AnimatePresence>
          {rolledSkinResult && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              style={{
                position: 'absolute',
                inset: '16px',
                background: 'rgba(10, 4, 25, 0.96)',
                borderRadius: '24px',
                border: '2px solid var(--color-purple)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
            >
              <Sparkles size={40} style={{ color: 'var(--color-yellow)', marginBottom: '12px' }} />
              <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                YOU GOT A HAT!
              </h3>
              <div style={{ fontSize: '72px', margin: '14px 0', filter: 'drop-shadow(0 4px 10px rgba(177,126,255,0.6))' }}>
                {rolledSkinResult.emoji}
              </div>
              <span className={`rarity-${rolledSkinResult.rarity}`} style={{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                {rolledSkinResult.name}
              </span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px' }}>
                {rolledSkinResult.rarity}
              </span>
              
              <div style={{ width: '100%', maxWidth: '180px' }}>
                <GelButton color="pink" onClick={() => {
                  equipSkin(rolledSkinResult.id);
                  setRolledSkinResult(null);
                }}>
                  EQUIP HAT
                </GelButton>
              </div>
              
              <button 
                onClick={() => setRolledSkinResult(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', marginTop: '16px', textDecoration: 'underline', fontSize: '12px', cursor: 'pointer' }}
              >
                Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
