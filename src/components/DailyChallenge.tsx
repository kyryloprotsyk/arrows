import React from 'react';
import { useGameStore } from '../store';
import { GameData } from '../utils/GameData';
import { GelButton } from './GelButton';
import { X, Calendar } from 'lucide-react';

export const DailyChallenge: React.FC = () => {
  const { setModal, selectLevel, dailyStreak } = useGameStore();

  const todayStr = new Date().toISOString().slice(0, 10);
  const lastPlayed = GameData.dailyStreak.lastPlayed();
  const completedToday = lastPlayed === todayStr;

  const handlePlay = () => {
    setModal(null);
    // For daily challenge, we load world 1, level 1, but set isDaily = true
    // LevelGenerator uses this to randomize block placements or generate unique combinations
    selectLevel(1, true);
  };

  return (
    <div className="glass-modal">
      <div className="modal-content glass-panel" style={{ background: 'rgba(10, 18, 30, 0.94)', border: '2px solid rgba(255,255,255,0.1)' }}>
        <button className="close-btn" onClick={() => setModal(null)}>
          <X size={18} />
        </button>

        <h2 style={{ textAlign: 'center', marginBottom: '16px', fontSize: '24px', color: 'var(--color-green)', textShadow: '0 0 10px rgba(70, 201, 58, 0.4)' }}>
          DAILY CHALLENGE
        </h2>

        <div style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '20px' }}>
          Solve the daily puzzle to maintain your streak and unlock rare legendary rewards!
        </div>

        {/* Streak Progress Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.2)',
          padding: '16px',
          borderRadius: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🔥</span>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontFamily: 'var(--font-tech)', fontSize: '20px', fontWeight: 900, color: 'var(--color-green)' }}>
                {dailyStreak} DAYS
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Current streak</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '9px', fontWeight: 700, gap: '4px', textTransform: 'uppercase' }}>
            <span style={{ color: dailyStreak >= 5 ? 'var(--color-yellow)' : 'rgba(255,255,255,0.4)' }}>
              👑 Day 5: Gold Crown {dailyStreak >= 5 ? '✅' : '🔒'}
            </span>
            <span style={{ color: dailyStreak >= 7 ? 'var(--color-pink)' : 'rgba(255,255,255,0.4)' }}>
              🐉 Day 7: Dragon Head {dailyStreak >= 7 ? '✅' : '🔒'}
            </span>
          </div>
        </div>

        {/* Calendar visual list */}
        <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>
          7-Day Challenge Calendar
        </h3>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '24px',
          gap: '4px'
        }}>
          {Array.from({ length: 7 }).map((_, idx) => {
            const dayNum = idx + 1;
            const isCompleted = dayNum < dailyStreak || (dayNum === dailyStreak && completedToday);
            const isCurrent = dayNum === dailyStreak && !completedToday;
            
            let borderStyle = '1px solid rgba(255,255,255,0.08)';
            let bg = 'rgba(255,255,255,0.03)';
            let textColor = 'rgba(255,255,255,0.3)';

            if (isCompleted) {
              bg = 'linear-gradient(to bottom, hsl(140, 75%, 35%), hsl(140, 75%, 20%))';
              borderStyle = '1.5px solid var(--color-green)';
              textColor = '#fff';
            } else if (isCurrent) {
              bg = 'rgba(255,255,255,0.1)';
              borderStyle = '2px dashed var(--color-green)';
              textColor = 'var(--color-green)';
            }

            return (
              <div
                key={dayNum}
                style={{
                  flex: 1,
                  aspectRatio: 0.8,
                  borderRadius: '12px',
                  background: bg,
                  border: borderStyle,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: textColor
                }}
              >
                <span>D{dayNum}</span>
                <span style={{ fontSize: '13px', marginTop: '4px' }}>
                  {isCompleted ? '⭐' : dayNum === 5 ? '👑' : dayNum === 7 ? '🐉' : '💎'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        {completedToday ? (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1.5px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '14px',
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 700,
            textAlign: 'center'
          }}>
            ✅ COMPLETED TODAY! COME BACK TOMORROW
          </div>
        ) : (
          <GelButton color="green" onClick={handlePlay}>
            <Calendar size={18} style={{ marginRight: '8px' }} />
            PLAY TODAY'S PUZZLE
          </GelButton>
        )}
      </div>
    </div>
  );
};
