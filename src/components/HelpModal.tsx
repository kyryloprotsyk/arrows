import React from 'react';
import { useGameStore } from '../store';
import { X, HelpCircle } from 'lucide-react';
import { GelButton } from './GelButton';

export const HelpModal: React.FC = () => {
  const { setModal } = useGameStore();

  const rules = [
    { icon: '🟣', name: 'Normal Buddy', desc: 'Slides straight in the direction of its arrow.' },
    { icon: '🌈', name: 'Rainbow Buddy', desc: 'Can exit through any open, unobstructed side.' },
    { icon: '💣', name: 'Bomb Buddy', desc: 'Explodes on tap, launching all adjacent blocks!' },
    { icon: '🔑', name: 'Key & Chest', desc: 'Collect the key to unlock the chest of the same color.' },
    { icon: '🔄', name: 'Rotator Buddy', desc: 'Rotates adjacent buddy directions by 90° when launched.' },
    { icon: '🌀', name: 'Portal Buddy', desc: 'Teleports buddies between matching portal colors.' }
  ];

  return (
    <div className="glass-modal">
      <div className="modal-content glass-panel" style={{ background: 'rgba(12, 10, 28, 0.94)', border: '2px solid rgba(255,255,255,0.1)' }}>
        <button className="close-btn" onClick={() => setModal(null)}>
          <X size={18} />
        </button>

        <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', fontSize: '22px', color: 'var(--color-cyan)', textShadow: '0 0 10px rgba(114, 192, 255, 0.4)' }}>
          <HelpCircle size={24} />
          HOW TO PLAY
        </h2>

        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, marginBottom: '18px', textAlign: 'center' }}>
          Tap on cute blocks to help them slide and escape. A block will only fly if there are no other blocks in its path. Clear the board in fewer moves to earn 3 stars!
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxHeight: '35vh',
          overflowY: 'auto',
          paddingRight: '4px',
          marginBottom: '20px',
          textAlign: 'left'
        }}>
          {rules.map((r, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '10px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <span style={{ fontSize: '24px', lineHeight: 1 }}>{r.icon}</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{r.name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <GelButton color="pink" onClick={() => setModal(null)}>
          GOT IT!
        </GelButton>
      </div>
    </div>
  );
};
