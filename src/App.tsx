import React from 'react';
import { useGameStore } from './store';
import { MainMenu } from './components/MainMenu';
import { WorldSelect } from './components/WorldSelect';
import { LevelSelect } from './components/LevelSelect';
import { GameHUD } from './components/GameHUD';
import { GameOverlay } from './components/GameOverlay';
import { Game3DScene } from './components/Game3DScene';
import { SkinsShopModal } from './components/SkinsShopModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { ProfileModal } from './components/ProfileModal';
import { DailyChallenge } from './components/DailyChallenge';
import { HelpModal } from './components/HelpModal';
import { Canvas } from '@react-three/fiber';
import { Environment, Float } from '@react-three/drei';
import { Buddy3DBlock } from './components/Buddy3DBlock';
import { motion, AnimatePresence } from 'framer-motion';

// --- Simplified Canvas for Single Floating Buddy in Main Menu ---
const Menu3DCharacter: React.FC = () => {

  // Create a mock BuddyBlock config to pass to Buddy3DBlock
  const mockBuddy = {
    id: 'menu_buddy',
    x: 0,
    y: 0,
    z: 0,
    dir: { x: 0, y: 0, z: 1 },
    type: 'normal' as const,
    state: 'idle' as const,
    animT: 0,
    jellyScale: [1.6, 1.6, 1.6] as [number, number, number], // larger menu scale
    jellyOffset: [0, 0, 0] as [number, number, number],
    blinkTimer: 2,
    isBlinking: false,
    rainbowHue: 0
  };

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '52%', pointerEvents: 'auto', zIndex: 2 }}>
      <Canvas camera={{ position: [0, 0.8, 3.2], fov: 40 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 6, 2]} intensity={1.5} />
        <Environment preset="sunset" />
        
        <Float speed={2.5} rotationIntensity={0.2} floatIntensity={0.4}>
          <group rotation={[0, -0.4, 0]}>
            <Buddy3DBlock buddy={mockBuddy} />
          </group>
        </Float>
      </Canvas>
    </div>
  );
};

export const App: React.FC = () => {
  const { currentScreen, activeModal, toastMessage } = useGameStore();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'world_select':
        return <WorldSelect />;
      case 'level_select':
        return <LevelSelect />;
      case 'gameplay':
        return (
          <>
            <Game3DScene />
            <GameHUD />
            <GameOverlay />
          </>
        );
      default:
        return (
          <>
            <Menu3DCharacter />
            <MainMenu />
          </>
        );
    }
  };

  const renderModal = () => {
    switch (activeModal) {
      case 'shop':
        return <SkinsShopModal />;
      case 'leaderboard':
        return <LeaderboardModal />;
      case 'profile':
        return <ProfileModal />;
      case 'daily':
        return <DailyChallenge />;
      case 'help':
        return <HelpModal />;
      default:
        return null;
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Active Screen */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{ width: '100%', height: '100%', position: 'relative' }}
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>

      {/* Overlays / Modals */}
      <AnimatePresence>
        {renderModal()}
      </AnimatePresence>

      {/* Global Toast Messages */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="toast-msg"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default App;
