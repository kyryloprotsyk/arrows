import React, { useEffect } from 'react';
import { useGameStore } from '../store';
import { GelButton } from './GelButton';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { RefreshCw, Compass, ArrowRight, Play } from 'lucide-react';

export const GameOverlay: React.FC = () => {
  const {
    victoryData,
    defeatData,
    buddies,
    addExtraMoves,
    resetLevel,
    triggerNextLevel,
    triggerDefeatRetry,
    setScreen
  } = useGameStore();

  // Handle victory confetti triggers
  useEffect(() => {
    if (victoryData) {
      // Multiple bursts of confetti!
      const duration = 1.5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 25, spread: 360, ticks: 50, zIndex: 1000 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 40 * (timeLeft / duration);
        // since particles fall down, animate a bit higher than random
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [victoryData]);

  if (!victoryData && !defeatData) return null;

  return (
    <div className="glass-modal" style={{ zIndex: 100, background: 'rgba(5, 2, 15, 0.85)' }}>
      {/* ── VICTORY STATE ── */}
      {victoryData && (
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="modal-content glass-panel"
          style={{
            background: 'rgba(16, 8, 32, 0.94)',
            border: '2px solid var(--color-yellow)',
            boxShadow: '0 0 25px rgba(255, 228, 94, 0.25)',
            textAlign: 'center'
          }}
        >
          <h2 className="neon-text-cyan" style={{ fontSize: '32px', marginBottom: '16px' }}>
            VICTORY!
          </h2>

          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
            Level {victoryData.level} Cleared
          </div>

          {/* Stars Reveal */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '24px' }}>
            {Array.from({ length: 3 }).map((_, sIdx) => {
              const active = sIdx < victoryData.stars;
              return (
                <motion.div
                  key={sIdx}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: active ? 1.2 : 0.85, rotate: 0 }}
                  transition={{ delay: 0.2 + sIdx * 0.15, type: 'spring', stiffness: 300 }}
                  style={{
                    color: active ? 'var(--color-yellow)' : 'rgba(255,255,255,0.12)',
                    fontSize: '44px',
                    filter: active ? 'drop-shadow(0 0 10px rgba(255, 228, 94, 0.5))' : 'none'
                  }}
                >
                  ★
                </motion.div>
              );
            })}
          </div>

          {/* Level Up Banner */}
          {victoryData.newLevel > victoryData.oldLevel && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 1 }}
              style={{
                background: 'linear-gradient(90deg, #ff007f 0%, #7f00ff 100%)',
                color: '#fff',
                padding: '8px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                marginBottom: '16px',
                boxShadow: '0 4px 15px rgba(255, 0, 127, 0.4)'
              }}
            >
              🎉 LEVEL UP! NOW LEVEL {victoryData.newLevel} 🎉
            </motion.div>
          )}

          {/* Rewards Board */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '20px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '28px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Coins Earned:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-yellow)' }}>🪙 +{victoryData.reward}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>XP Gained:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-pink)' }}>🎖️ +{victoryData.xpEarned}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Global Ranking:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-cyan)', fontFamily: 'var(--font-tech)' }}>#{victoryData.userRank}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <GelButton color="green" onClick={triggerNextLevel}>
              <ArrowRight size={18} style={{ marginRight: '8px' }} />
              NEXT LEVEL
            </GelButton>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <GelButton color="purple" onClick={resetLevel} style={{ flex: 1 }}>
                <RefreshCw size={16} style={{ marginRight: '6px' }} />
                RETRY
              </GelButton>
              <GelButton color="orange" onClick={() => setScreen('world_select')} style={{ flex: 1 }}>
                <Compass size={16} style={{ marginRight: '6px' }} />
                WORLDS
              </GelButton>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── DEFEAT STATE ── */}
      {defeatData && (
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="modal-content glass-panel"
          style={{
            background: 'rgba(20, 4, 12, 0.94)',
            border: '2px solid var(--color-pink)',
            boxShadow: '0 0 25px rgba(255, 72, 142, 0.25)',
            textAlign: 'center'
          }}
        >
          <h2 className="neon-text-pink" style={{ fontSize: '32px', marginBottom: '16px' }}>
            OUT OF MOVES!
          </h2>

          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
            {buddies.length} buddies are left behind
          </div>

          <div style={{ fontSize: '48px', marginBottom: '24px' }}>
            😢
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Ad for extra moves */}
            <GelButton color="green" onClick={() => addExtraMoves(5)}>
              <Play size={18} style={{ marginRight: '8px' }} />
              WATCH AD (+5 MOVES)
            </GelButton>
            
            <GelButton color="pink" onClick={triggerDefeatRetry}>
              <RefreshCw size={18} style={{ marginRight: '8px' }} />
              RETRY LEVEL
            </GelButton>

            <GelButton color="purple" onClick={() => setScreen('world_select')}>
              <Compass size={18} style={{ marginRight: '8px' }} />
              WORLD SELECT
            </GelButton>
          </div>
        </motion.div>
      )}
    </div>
  );
};
