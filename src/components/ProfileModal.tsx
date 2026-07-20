import React, { useState } from 'react';
import { useGameStore } from '../store';
import { GameData } from '../utils/GameData';
import { GelButton } from './GelButton';
import { X } from 'lucide-react';

const AVATAR_EMOJIS = ['🧙‍♂️', '🤠', '🐱', '🦊', '🐉', '👑', '🐻', '🦁', '🦖', '🤖', '👾', '🌈', '🍭', '🍕'];

export const ProfileModal: React.FC = () => {
  const {
    username,
    avatar,
    playerXP,
    winStreak,
    puzzlesSolved,
    updateProfile,
    setModal
  } = useGameStore();

  const [newName, setNewName] = useState(username);
  const [selectedAvatar, setSelectedAvatar] = useState(avatar);

  // Compute XP Progression details
  const level = GameData.playerXP.getLevel();
  const rankTitle = GameData.playerXP.getRankTitle();
  const xpCurrent = playerXP;
  
  const xpPrevLvlThreshold = GameData.playerXP.getXPForLevel(level);
  const xpNextLvlThreshold = GameData.playerXP.getXPForLevel(level + 1);
  const lvlXpMax = xpNextLvlThreshold - xpPrevLvlThreshold;
  const lvlXpCurrent = xpCurrent - xpPrevLvlThreshold;
  
  // Percentage in current level
  const xpPercent = Math.max(0, Math.min(100, (lvlXpCurrent / (lvlXpMax || 1)) * 100));
  
  const totalStars = GameData.totalStars();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(newName.slice(0, 16), selectedAvatar);
    setModal(null);
  };

  return (
    <div className="glass-modal">
      <div className="modal-content glass-panel" style={{ background: 'rgba(16, 8, 30, 0.95)', border: '2px solid rgba(255,255,255,0.1)' }}>
        <button className="close-btn" onClick={() => setModal(null)}>
          <X size={18} />
        </button>

        <h2 style={{ textAlign: 'center', marginBottom: '16px', fontSize: '24px', color: 'var(--color-pink)', textShadow: '0 0 10px rgba(255, 72, 142, 0.4)' }}>
          PLAYER PROFILE
        </h2>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Avatar selector */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255, 72, 142, 0.15)',
              border: '3px dashed var(--color-pink)',
              display: 'flex',
              alignItems: 'center',
              fontSize: '44px',
              marginBottom: '10px',
              justifyContent: 'center'
            }}>
              {selectedAvatar}
            </div>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.2)',
              padding: '8px',
              borderRadius: '14px',
              maxWidth: '300px',
              maxHeight: '74px',
              overflowY: 'auto'
            }}>
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedAvatar(emoji)}
                  style={{
                    background: selectedAvatar === emoji ? 'var(--color-pink)' : 'none',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '18px',
                    cursor: 'pointer',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
              Archer Username
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter name"
              maxLength={16}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '10px 14px',
                color: 'white',
                fontFamily: 'var(--font-bubbly)',
                fontSize: '16px',
                outline: 'none',
                textAlign: 'center'
              }}
            />
          </div>

          {/* XP Progress Section */}
          <div className="xp-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
              <span style={{ color: 'var(--color-pink)' }}>LVL {level}</span>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                {lvlXpCurrent}/{lvlXpMax} XP
              </span>
            </div>
            <div className="xp-track">
              <div className="xp-fill" style={{ width: `${xpPercent}%` }} />
            </div>
            <span style={{
              display: 'block',
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--color-yellow)',
              marginTop: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              🎖️ {rankTitle}
            </span>
          </div>

          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            background: 'rgba(0,0,0,0.2)',
            padding: '12px',
            borderRadius: '16px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '18px' }}>🔥</div>
              <div style={{ fontFamily: 'var(--font-tech)', fontSize: '15px', fontWeight: 900 }}>{winStreak}</div>
              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Streak</div>
            </div>
            <div>
              <div style={{ fontSize: '18px' }}>✅</div>
              <div style={{ fontFamily: 'var(--font-tech)', fontSize: '15px', fontWeight: 900 }}>{puzzlesSolved}</div>
              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Solved</div>
            </div>
            <div>
              <div style={{ fontSize: '18px' }}>⭐</div>
              <div style={{ fontFamily: 'var(--font-tech)', fontSize: '15px', fontWeight: 900 }}>{totalStars}</div>
              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Stars</div>
            </div>
          </div>

          <GelButton color="pink" type="submit">
            SAVE CHANGES
          </GelButton>
        </form>
      </div>
    </div>
  );
};
