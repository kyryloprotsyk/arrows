import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { LeaderboardService } from '../utils/LeaderboardService';
import type { LeaderboardEntry } from '../utils/LeaderboardService';
import { X } from 'lucide-react';

export const LeaderboardModal: React.FC = () => {
  const { setModal } = useGameStore();
  const [filter, setFilter] = useState<'stars' | 'streak' | 'solved' | 'level'>('stars');
  const [boardData, setBoardData] = useState<{
    entries: LeaderboardEntry[];
    userRank: number;
    userEntry: LeaderboardEntry;
  } | null>(null);

  // Sync and load board data
  useEffect(() => {
    // Simulate live competitive updates
    LeaderboardService.simulateLiveActivity();
    
    const data = LeaderboardService.syncAndGetLeaderboard(filter);
    setBoardData(data);
  }, [filter]);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1: return <span style={{ fontSize: '18px' }}>🥇</span>;
      case 2: return <span style={{ fontSize: '18px' }}>🥈</span>;
      case 3: return <span style={{ fontSize: '18px' }}>🥉</span>;
      default: return <span style={{ fontFamily: 'var(--font-tech)', fontSize: '12px', opacity: 0.6 }}>{rank}</span>;
    }
  };

  return (
    <div className="glass-modal">
      <div className="modal-content glass-panel" style={{ background: 'rgba(15, 8, 35, 0.92)' }}>
        <button className="close-btn" onClick={() => setModal(null)}>
          <X size={18} />
        </button>

        <h2 style={{ textAlign: 'center', marginBottom: '16px', fontSize: '24px', color: 'var(--color-orange)', textShadow: '0 0 10px rgba(255, 162, 26, 0.4)' }}>
          LEADERBOARDS
        </h2>

        {/* Tab Filters */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '14px',
          padding: '4px',
          marginBottom: '16px',
          gap: '2px'
        }}>
          {(['stars', 'streak', 'solved', 'level'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                flex: 1,
                background: filter === t ? 'rgba(255, 255, 255, 0.12)' : 'none',
                border: 'none',
                color: filter === t ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                fontSize: '11px',
                fontWeight: 700,
                padding: '8px 0',
                borderRadius: '10px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.2s'
              }}
            >
              {t === 'stars' ? '⭐ Stars' : t === 'streak' ? '🔥 Streak' : t === 'solved' ? '✅ Solved' : '⚡ Lvl'}
            </button>
          ))}
        </div>

        {/* My Rank Summary */}
        {boardData && (
          <div style={{
            background: 'rgba(255, 162, 26, 0.12)',
            border: '1px solid rgba(255, 162, 26, 0.25)',
            borderRadius: '18px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>🏆</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>My Rank</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Ranked against top players</div>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-tech)', fontSize: '22px', fontWeight: 900, color: 'var(--color-orange)' }}>
              #{boardData.userRank}
            </div>
          </div>
        )}

        {/* Entries List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxHeight: '40vh',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {boardData?.entries.map((entry, index) => {
            const isMe = entry.id === 'current_user';
            const rank = index + 1;

            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: '16px',
                  background: isMe ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: isMe ? '1.5px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                  justifyContent: 'space-between'
                }}
              >
                {/* Left: Rank + Avatar + Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{ width: '24px', display: 'flex', justifyContent: 'center' }}>
                    {getRankBadge(rank)}
                  </div>
                  <span style={{ fontSize: '20px' }}>{entry.avatar}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: isMe ? 700 : 600,
                      color: isMe ? 'var(--color-orange)' : '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {entry.username}
                    </span>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>
                      LVL {entry.level}
                    </span>
                  </div>
                </div>

                {/* Right: Score Metric value */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-tech)', fontSize: '13px', fontWeight: 700 }}>
                  {filter === 'stars' && (
                    <>
                      <span style={{ color: 'var(--color-yellow)' }}>⭐</span>
                      <span>{entry.stars}</span>
                    </>
                  )}
                  {filter === 'streak' && (
                    <>
                      <span style={{ color: 'var(--color-pink)' }}>🔥</span>
                      <span>{entry.streak}</span>
                    </>
                  )}
                  {filter === 'solved' && (
                    <>
                      <span style={{ color: 'var(--color-green)' }}>✅</span>
                      <span>{entry.solved}</span>
                    </>
                  )}
                  {filter === 'level' && (
                    <>
                      <span style={{ color: 'var(--color-cyan)' }}>⚡</span>
                      <span>{entry.level}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
