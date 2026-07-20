import { create } from 'zustand';
import { levelGenerator } from './levelGenerator';
import type { BlockConfig } from './levelGenerator';
import { GameData } from './utils/GameData';
import { LeaderboardService } from './utils/LeaderboardService';
import { audio } from './audio';
import { SKIN_LIST } from './skins';

export interface BuddyBlock extends BlockConfig {
  state: 'idle' | 'bump' | 'escaping' | 'locked' | 'anticipation' | 'wiggle';
  animT: number;
  jellyScale: [number, number, number];
  jellyOffset: [number, number, number];
  blinkTimer: number;
  isBlinking: boolean;
  rainbowHue: number;
}

export type GameScreen = 'menu' | 'world_select' | 'level_select' | 'gameplay';

interface GameState {
  // --- Persistent State (from GameData) ---
  coins: number;
  currentWorldProgress: number; // max unlocked world
  currentLevelProgress: number; // max unlocked level
  activeSkin: string;
  unlockedSkins: string[];
  muted: boolean;
  username: string;
  avatar: string;
  playerXP: number;
  winStreak: number;
  puzzlesSolved: number;
  highScore: number;
  dailyStreak: number;

  // --- Session State ---
  currentScreen: GameScreen;
  selectedWorld: number;
  selectedLevel: number;
  isDaily: boolean;

  // --- Level / Board State ---
  movesLeft: number;
  movesTotal: number;
  parTotal: number;
  comboCount: number;
  lastEscapeTime: number;
  buddies: BuddyBlock[];
  rotState: number; // 0-3: 90 deg rotations
  levelGridCoords: { x: number; z: number }[];
  floorHeights: Record<string, number>; // key: "x,z" -> min Y

  // --- Modal & Overlay State ---
  activeModal: 'shop' | 'leaderboard' | 'profile' | 'daily' | 'help' | null;
  victoryData: {
    world: number;
    level: number;
    stars: number;
    reward: number;
    xpEarned: number;
    oldLevel: number;
    newLevel: number;
    userRank: number;
  } | null;
  defeatData: {
    world: number;
    level: number;
  } | null;

  // --- Global UI Messages ---
  toastMessage: string | null;

  // --- Actions ---
  setScreen: (screen: GameScreen) => void;
  selectWorld: (world: number) => void;
  selectLevel: (level: number, isDaily?: boolean) => void;
  setMuted: (v: boolean) => void;
  setModal: (modal: 'shop' | 'leaderboard' | 'profile' | 'daily' | 'help' | null) => void;
  showToast: (msg: string) => void;

  // Profile actions
  updateProfile: (username: string, avatar: string) => void;

  // Gacha actions
  rollGacha: () => { success: boolean; skin?: any; message: string };
  equipSkin: (id: string) => void;

  // Gameplay actions
  initLevel: () => void;
  resetLevel: () => void;
  rotateView: (dir: number) => void;
  tapBlock: (id: string) => void;
  addExtraMoves: (count: number) => void;
  triggerNextLevel: () => void;
  triggerDefeatRetry: () => void;
  applyGravity: () => void;
  checkEndConditions: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initialize persistent states from localStorage
  coins: GameData.coins.get(),
  currentWorldProgress: GameData.world.get(),
  currentLevelProgress: GameData.level.get(),
  activeSkin: GameData.activeSkin.get(),
  unlockedSkins: GameData.unlockedSkins.get(),
  muted: GameData.muted.get(),
  username: GameData.username.get(),
  avatar: GameData.avatar.get(),
  playerXP: GameData.playerXP.get(),
  winStreak: GameData.winStreak.get(),
  puzzlesSolved: GameData.puzzlesSolved.get(),
  highScore: GameData.highScore.get(),
  dailyStreak: GameData.dailyStreak.get(),

  // Session states
  currentScreen: 'menu',
  selectedWorld: 1,
  selectedLevel: 1,
  isDaily: false,

  // Level Board States
  movesLeft: 0,
  movesTotal: 0,
  parTotal: 0,
  comboCount: 0,
  lastEscapeTime: 0,
  buddies: [],
  rotState: 0,
  levelGridCoords: [],
  floorHeights: {},

  // Overlays
  activeModal: null,
  victoryData: null,
  defeatData: null,
  toastMessage: null,

  // --- ACTIONS ---
  setScreen: (screen) => {
    // Music crossfades based on target screen
    const store = get();
    if (!store.muted) {
      if (screen === 'menu') {
        audio.playBGM(0); // Menu theme
      } else if (screen === 'world_select' || screen === 'level_select') {
        audio.playBGM(0);
      } else if (screen === 'gameplay') {
        audio.playBGM(store.selectedWorld);
      }
    } else {
      audio.stopBGM();
    }
    set({ currentScreen: screen, victoryData: null, defeatData: null });
  },

  selectWorld: (world) => {
    set({ selectedWorld: world, currentScreen: 'level_select' });
  },

  selectLevel: (level, isDaily = false) => {
    set({ selectedLevel: level, isDaily, currentScreen: 'gameplay' }, false);
    get().initLevel();
  },

  setMuted: (v) => {
    GameData.muted.set(v);
    if (v) {
      audio.stopBGM();
    } else {
      const store = get();
      if (store.currentScreen === 'gameplay') {
        audio.playBGM(store.selectedWorld);
      } else {
        audio.playBGM(0);
      }
    }
    set({ muted: v });
  },

  setModal: (modal) => {
    set({ activeModal: modal });
  },

  showToast: (msg) => {
    set({ toastMessage: msg });
    setTimeout(() => {
      if (get().toastMessage === msg) {
        set({ toastMessage: null });
      }
    }, 2000);
  },

  updateProfile: (username, avatar) => {
    GameData.username.set(username);
    GameData.avatar.set(avatar);
    set({ username, avatar });
    get().showToast('Profile updated! 🌟');
  },

  rollGacha: () => {
    const currentCoins = get().coins;
    if (currentCoins < 50) {
      return { success: false, message: 'Not enough coins! Need 50 🪙' };
    }

    // Spend coins
    GameData.coins.set(currentCoins - 50);
    const newCoins = GameData.coins.get();

    // Find locked skins
    const unlocked = get().unlockedSkins;
    const lockedSkins = SKIN_LIST.filter(s => !unlocked.includes(s.id));

    if (lockedSkins.length === 0) {
      set({ coins: newCoins });
      return { success: false, message: 'You already unlocked all skins! 👑' };
    }

    // Roll gacha based on weight/rarity
    // common: 60%, rare: 30%, epic: 8%, legendary: 2%
    const rand = Math.random() * 100;
    let rollRarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common';
    if (rand < 2) rollRarity = 'legendary';
    else if (rand < 10) rollRarity = 'epic';
    else if (rand < 40) rollRarity = 'rare';

    // Filter available locked skins in the selected rarity group, fallback to any locked skin
    let candidates = lockedSkins.filter(s => s.rarity === rollRarity);
    if (candidates.length === 0) candidates = lockedSkins;

    const rolledSkin = candidates[Math.floor(Math.random() * candidates.length)];
    GameData.unlockedSkins.add(rolledSkin.id);

    audio.playKeyCollect(); // play unlock SFX

    set({
      coins: newCoins,
      unlockedSkins: GameData.unlockedSkins.get()
    });

    return { success: true, skin: rolledSkin, message: `Unlocked ${rolledSkin.name}! ${rolledSkin.emoji}` };
  },

  equipSkin: (id) => {
    GameData.activeSkin.set(id);
    set({ activeSkin: id });
    audio.playKeyCollect();
    get().showToast('Skin equipped! 👕');
  },

  initLevel: () => {
    const store = get();
    const world = store.selectedWorld;
    const level = store.selectedLevel;

    const levelData = levelGenerator.generateLevel(world, level);
    
    // Grid footprint coords
    const levelGridCoords: { x: number; z: number }[] = [];
    for (const b of levelData.blocks) {
      if (!levelGridCoords.some(c => c.x === b.x && c.z === b.z)) {
        levelGridCoords.push({ x: b.x, z: b.z });
      }
    }

    // Floor heights for gravity
    const floorHeights: Record<string, number> = {};
    for (const b of levelData.blocks) {
      const key = `${b.x},${b.z}`;
      const current = floorHeights[key] ?? Infinity;
      if (b.y < current) {
        floorHeights[key] = b.y;
      }
    }

    // Map blocks to React state BuddyBlock objects
    const buddies: BuddyBlock[] = levelData.blocks.map(cfg => {
      return {
        ...cfg,
        state: cfg.type === 'chest' ? 'locked' : 'idle',
        animT: 0,
        jellyScale: [1, 1, 1],
        jellyOffset: [0, 0, 0],
        blinkTimer: 1.5 + Math.random() * 3,
        isBlinking: false,
        rainbowHue: Math.random()
      };
    });

    set({
      movesLeft: levelData.moveLimit,
      movesTotal: levelData.moveLimit,
      parTotal: levelData.par,
      comboCount: 0,
      lastEscapeTime: 0,
      buddies,
      rotState: 0,
      levelGridCoords,
      floorHeights,
      victoryData: null,
      defeatData: null
    });

    if (!get().muted) {
      audio.playLevelStart();
      audio.playBGM(world);
    }
  },

  resetLevel: () => {
    audio.playTap();
    get().initLevel();
  },

  rotateView: (dir) => {
    audio.playTap();
    set(state => ({
      rotState: (((state.rotState + dir) % 4) + 4) % 4
    }));
  },

  addExtraMoves: (count) => {
    set(state => ({
      movesLeft: state.movesLeft + count,
      movesTotal: state.movesTotal + count,
      defeatData: null
    }));
    get().showToast(`+${count} moves added! ⚡`);
  },

  triggerNextLevel: () => {
    const level = get().selectedLevel;
    if (level < 5) {
      get().selectLevel(level + 1, false);
    } else {
      set({ currentScreen: 'world_select' });
    }
  },

  triggerDefeatRetry: () => {
    set({ defeatData: null });
    get().initLevel();
  },

  tapBlock: (id) => {
    const store = get();
    if (store.victoryData || store.defeatData) return;
    if (store.movesLeft <= 0) {
      get().showToast('Out of moves! 🔄');
      return;
    }

    const buddies = [...store.buddies];
    const buddyIndex = buddies.findIndex(b => b.id === id);
    if (buddyIndex === -1) return;

    const buddy = buddies[buddyIndex];

    // Locked chest: bump wiggling
    if (buddy.state === 'locked') {
      audio.playMaterialBump(store.selectedWorld);
      get().showToast('🔒 Chest is locked! Find the key first.');
      
      // Update state for wiggle animation
      buddies[buddyIndex] = {
        ...buddy,
        state: 'bump',
        animT: 0,
        jellyScale: [1.2, 0.8, 1.2],
        jellyOffset: [0, 0.1, 0]
      };
      set({ buddies });
      
      setTimeout(() => {
        const currentBuddies = [...get().buddies];
        const idx = currentBuddies.findIndex(b => b.id === id);
        if (idx !== -1 && currentBuddies[idx].state === 'bump') {
          currentBuddies[idx] = {
            ...currentBuddies[idx],
            state: 'idle',
            jellyScale: [1, 1, 1],
            jellyOffset: [0, 0, 0]
          };
          set({ buddies: currentBuddies });
        }
      }, 300);
      return;
    }

    if (buddy.state !== 'idle') return;

    // Use a move
    const newMovesLeft = store.movesLeft - 1;
    set({ movesLeft: newMovesLeft });

    // Bomb Block Explosion
    if (buddy.type === 'bomb') {
      audio.playExplosion();
      
      // Explode animation on target
      buddies[buddyIndex] = {
        ...buddy,
        state: 'escaping',
        animT: 999
      };
      set({ buddies });

      // Trigger adjacent block escapes
      const range = 1.5;
      const affected = buddies.filter(b => b.id !== buddy.id && b.state !== 'escaping' && Math.hypot(b.x - buddy.x, b.y - buddy.y, b.z - buddy.z) <= range);
      
      affected.forEach((b, i) => {
        setTimeout(() => {
          const currentBuddies = [...get().buddies];
          const idx = currentBuddies.findIndex(x => x.id === b.id);
          if (idx !== -1 && (currentBuddies[idx].state === 'idle' || currentBuddies[idx].state === 'locked')) {
            // Force escape
            currentBuddies[idx] = {
              ...currentBuddies[idx],
              state: 'escaping',
              animT: 999
            };
            audio.playMaterialLaunch(store.selectedWorld);
            
            // If key, unlock target chest
            if (b.type === 'key' && b.targetChestId) {
              const chestIdx = currentBuddies.findIndex(c => c.id === b.targetChestId);
              if (chestIdx !== -1) {
                currentBuddies[chestIdx].state = 'idle';
              }
            }
            
            set({ buddies: currentBuddies });
            get().applyGravity();
            get().checkEndConditions();
          }
        }, 100 + i * 80);
      });

      setTimeout(() => {
        set(state => ({
          buddies: state.buddies.filter(b => b.id !== id && !affected.some(a => a.id === b.id))
        }));
        get().applyGravity();
        get().checkEndConditions();
      }, 500);
      return;
    }

    // Portal Info Bump
    if (buddy.type === 'portal') {
      audio.playTap();
      buddies[buddyIndex] = {
        ...buddy,
        state: 'bump',
        animT: 0,
        jellyScale: [0.9, 1.2, 0.9],
        jellyOffset: [0, 0.15, 0]
      };
      set({ buddies });
      get().showToast('🌀 Portal teleports blocks of matching color!');
      
      setTimeout(() => {
        const currentBuddies = [...get().buddies];
        const idx = currentBuddies.findIndex(b => b.id === id);
        if (idx !== -1 && currentBuddies[idx].state === 'bump') {
          currentBuddies[idx] = {
            ...currentBuddies[idx],
            state: 'idle',
            jellyScale: [1, 1, 1],
            jellyOffset: [0, 0, 0]
          };
          set({ buddies: currentBuddies });
        }
      }, 400);
      return;
    }

    // Standard / Rainbow block launch logic
    let escDir = { ...buddy.dir };

    // Rainbow block finds any free escape path
    if (buddy.type === 'rainbow') {
      const dirs = [
        { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
        { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
      ].sort(() => Math.random() - 0.5);

      const freeDir = dirs.find(d => {
        const path = checkEscapePathHelper(get().buddies, buddy, d);
        return !path.blocked;
      });

      if (!freeDir) {
        // Blocked bump
        audio.playMaterialBump(store.selectedWorld);
        buddies[buddyIndex] = {
          ...buddy,
          state: 'bump',
          animT: 0,
          jellyScale: [0.85, 1.15, 0.85]
        };
        set({ buddies });
        setTimeout(() => {
          const currentBuddies = [...get().buddies];
          const idx = currentBuddies.findIndex(b => b.id === id);
          if (idx !== -1) {
            currentBuddies[idx].state = 'idle';
            currentBuddies[idx].jellyScale = [1, 1, 1];
            set({ buddies: currentBuddies });
          }
        }, 300);
        return;
      }
      escDir = freeDir;
    } else {
      // Normal direction block path check
      const path = checkEscapePathHelper(get().buddies, buddy, escDir);
      if (path.blocked) {
        audio.playMaterialBump(store.selectedWorld);
        
        // Bump displacement wiggle
        buddies[buddyIndex] = {
          ...buddy,
          state: 'bump',
          animT: 0,
          jellyScale: [0.85, 1.15, 0.85]
        };
        set({ buddies });
        setTimeout(() => {
          const currentBuddies = [...get().buddies];
          const idx = currentBuddies.findIndex(b => b.id === id);
          if (idx !== -1) {
            currentBuddies[idx].state = 'idle';
            currentBuddies[idx].jellyScale = [1, 1, 1];
            set({ buddies: currentBuddies });
          }
        }, 300);
        return;
      }
    }

    // SOLVED - Escape path is clear!
    // Start anticipation/squash animation
    buddies[buddyIndex] = {
      ...buddy,
      state: 'anticipation',
      animT: 0,
      jellyScale: [0.7, 1.3, 0.7],
      jellyOffset: [escDir.x * -0.15, escDir.y * -0.15, escDir.z * -0.15]
    };
    set({ buddies });

    // Handle Combo
    const now = Date.now();
    let nextCombo = 1;
    if (now - store.lastEscapeTime < 1800) {
      nextCombo = store.comboCount + 1;
      set({ coins: store.coins + 1 });
      GameData.coins.add(1);
    }
    set({ comboCount: nextCombo, lastEscapeTime: now });

    // If block is a key, unlock its target chest
    if (buddy.type === 'key' && buddy.targetChestId) {
      const chestIdx = buddies.findIndex(c => c.id === buddy.targetChestId);
      if (chestIdx !== -1) {
        setTimeout(() => {
          const currentBuddies = [...get().buddies];
          const cIdx = currentBuddies.findIndex(c => c.id === buddy.targetChestId);
          if (cIdx !== -1) {
            currentBuddies[cIdx].state = 'idle';
            set({ buddies: currentBuddies });
          }
          audio.playKeyCollect();
        }, 200);
      }
    }

    // Launch escape after anticipation delay
    setTimeout(() => {
      const currentBuddies = [...get().buddies];
      const idx = currentBuddies.findIndex(b => b.id === id);
      if (idx !== -1) {
        currentBuddies[idx] = {
          ...currentBuddies[idx],
          state: 'escaping',
          animT: 999
        };
        audio.playMaterialLaunch(store.selectedWorld);
        
        // Rotator effect
        if (buddy.type === 'rotator') {
          triggerRotatorEffectHelper(currentBuddies, buddy);
        }

        set({ buddies: currentBuddies });
      }

      // Remove after launch complete
      setTimeout(() => {
        set(state => ({
          buddies: state.buddies.filter(b => b.id !== id)
        }));
        get().applyGravity();
        get().checkEndConditions();
      }, 150);

    }, 150);
  },

  applyGravity: () => {
    let changed = true;
    let buddies = [...get().buddies];
    const floorHeights = get().floorHeights;

    while (changed) {
      changed = false;
      // Sort lowest Y to highest Y to fall from bottom-up
      buddies.sort((a, b) => a.y - b.y);

      for (let i = 0; i < buddies.length; i++) {
        const b = buddies[i];
        if (b.state === 'escaping') continue;

        const floorY = floorHeights[`${b.x},${b.z}`] ?? 0;
        if (b.y <= floorY) continue;

        // Check if block below is empty
        const below = buddies.find(other =>
          other !== b && other.x === b.x && other.y === b.y - 1 && other.z === b.z && other.state !== 'escaping'
        );

        if (!below) {
          buddies[i] = {
            ...b,
            y: b.y - 1,
            state: 'bump',
            animT: 0,
            jellyScale: [1.1, 0.9, 1.1],
            jellyOffset: [0, -0.1, 0]
          };
          changed = true;
          
          // bounce return to idle
          const fallingId = b.id;
          setTimeout(() => {
            const currentBuddies = [...get().buddies];
            const idx = currentBuddies.findIndex(x => x.id === fallingId);
            if (idx !== -1 && currentBuddies[idx].state === 'bump') {
              currentBuddies[idx] = {
                ...currentBuddies[idx],
                state: 'idle',
                jellyScale: [1, 1, 1],
                jellyOffset: [0, 0, 0]
              };
              set({ buddies: currentBuddies });
            }
          }, 300);
        }
      }
    }

    set({ buddies });
  },

  checkEndConditions: () => {
    const store = get();
    const remaining = store.buddies.filter(b => b.state !== 'escaping');
    
    // Victory check
    if (remaining.length === 0) {
      audio.stopBGM();
      audio.playVictory();
      
      const ratio = store.movesLeft / store.movesTotal;
      const stars = ratio >= 0.4 ? 3 : ratio >= 0.15 ? 2 : 1;

      setTimeout(() => {
        if (!get().muted) audio.playStarEarn(stars as any);
      }, 320);

      let reward = 15 + store.movesLeft * 2;
      
      if (store.isDaily) {
        const res = GameData.dailyStreak.checkAndIncrement();
        reward += 150;
        if (res.streak >= 7 && !GameData.unlockedSkins.has('dragon')) {
          GameData.unlockedSkins.add('dragon');
        } else if (res.streak >= 5 && !GameData.unlockedSkins.has('golden_crown')) {
          GameData.unlockedSkins.add('golden_crown');
        }
      } else {
        GameData.setStarsFor(store.selectedWorld, store.selectedLevel, stars);
        localStorage.setItem(`arrow_buddies_w${store.selectedWorld}_level`, Math.min(store.selectedLevel + 1, 5).toString());
      }
      GameData.coins.add(reward);

      // XP progressions
      const xpGain = 60 + stars * 35 + (store.comboCount || 1) * 15 + Math.max(0, store.movesLeft) * 6;
      const xpRes = GameData.playerXP.add(xpGain);
      GameData.puzzlesSolved.increment();
      GameData.winStreak.increment();
      const scoreTotal = GameData.coins.get() * 10 + GameData.playerXP.get() + GameData.totalStars() * 150;
      GameData.highScore.setIfHigher(scoreTotal);

      // Leaderboard
      const ldbRes = LeaderboardService.syncAndGetLeaderboard();

      set({
        coins: GameData.coins.get(),
        playerXP: GameData.playerXP.get(),
        winStreak: GameData.winStreak.get(),
        puzzlesSolved: GameData.puzzlesSolved.get(),
        highScore: GameData.highScore.get(),
        unlockedSkins: GameData.unlockedSkins.get(),
        victoryData: {
          world: store.selectedWorld,
          level: store.selectedLevel,
          stars,
          reward,
          xpEarned: xpGain,
          oldLevel: xpRes.oldLevel,
          newLevel: xpRes.newLevel,
          userRank: ldbRes.userRank
        }
      });
      return;
    }

    // Defeat check: no moves left
    if (store.movesLeft <= 0) {
      setTimeout(() => {
        // Double check in case moves were added in between
        if (get().movesLeft <= 0 && get().buddies.filter(b => b.state !== 'escaping').length > 0) {
          audio.stopBGM();
          audio.playDefeat();
          GameData.winStreak.reset();
          set({
            winStreak: 0,
            defeatData: {
              world: store.selectedWorld,
              level: store.selectedLevel
            }
          });
        }
      }, 1000);
    }
  }
}));

// --- Pure Helper functions (no state mutations directly) ---

function findFirstBlockAlongRayHelper(buddies: BuddyBlock[], pos: { x: number, y: number, z: number }, dir: { x: number, y: number, z: number }, ignoreId?: string): BuddyBlock | null {
  let closestBlock: BuddyBlock | null = null;
  let closestDist = Infinity;

  for (const other of buddies) {
    if (other.id === ignoreId || other.state === 'escaping') continue;
    
    const diff = { x: other.x - pos.x, y: other.y - pos.y, z: other.z - pos.z };
    const dot = diff.x * dir.x + diff.y * dir.y + diff.z * dir.z;
    
    if (dot > 0.05) { // in front
      const proj = { x: dir.x * dot, y: dir.y * dot, z: dir.z * dot };
      const rem  = { x: diff.x - proj.x, y: diff.y - proj.y, z: diff.z - proj.z };
      
      if (Math.abs(rem.x) < 0.1 && Math.abs(rem.y) < 0.1 && Math.abs(rem.z) < 0.1) {
        if (dot < closestDist) {
          closestDist = dot;
          closestBlock = other;
        }
      }
    }
  }
  return closestBlock;
}

function checkEscapePathHelper(buddies: BuddyBlock[], buddy: BuddyBlock, dir: { x: number, y: number, z: number }): { blocked: boolean; portalsTransited: BuddyBlock[] } {
  let currentPos = { x: buddy.x, y: buddy.y, z: buddy.z };
  let currentDir = { ...dir };
  let ignoreId = buddy.id;
  const portalsTransited: BuddyBlock[] = [];
  const visitedPortals = new Set<string>();

  while (true) {
    const hit = findFirstBlockAlongRayHelper(buddies, currentPos, currentDir, ignoreId);
    if (!hit) {
      return { blocked: false, portalsTransited };
    }

    if (hit.type === 'rotator' && hit.state === 'escaping') {
      return { blocked: false, portalsTransited };
    }

    // Teleportation logic
    if (hit.type === 'portal') {
      if (visitedPortals.has(hit.id)) {
        return { blocked: true, portalsTransited }; // loop detected
      }
      visitedPortals.add(hit.id);

      const partner = buddies.find(b => b.type === 'portal' && b.id !== hit.id && b.targetChestId === hit.targetChestId);
      if (partner) {
        portalsTransited.push(hit);
        portalsTransited.push(partner);
        currentPos = { x: partner.x, y: partner.y, z: partner.z };
        ignoreId = partner.id;
        continue;
      }
    }

    return { blocked: true, portalsTransited };
  }
}

function triggerRotatorEffectHelper(buddies: BuddyBlock[], rotator: BuddyBlock) {
  audio.playRotator();

  const rotate90 = (dir: { x: number, y: number, z: number }): { x: number, y: number, z: number } => {
    if (dir.y !== 0) {
      return { x: dir.y, y: 0, z: 0 };
    }
    return { x: -dir.z, y: 0, z: dir.x };
  };

  buddies.forEach((b) => {
    if (b.id === rotator.id || b.state === 'escaping') return;
    const dist = Math.hypot(b.x - rotator.x, b.y - rotator.y, b.z - rotator.z);
    if (dist <= 1.25 && b.type !== 'chest') {
      b.dir = rotate90(b.dir);
      b.state = 'bump';
      b.jellyScale = [1.15, 0.85, 1.15];
      
      setTimeout(() => {
        const current = useGameStore.getState().buddies;
        const idx = current.findIndex(x => x.id === b.id);
        if (idx !== -1 && current[idx].state === 'bump') {
          const buddiesClone = [...current];
          buddiesClone[idx].state = 'idle';
          buddiesClone[idx].jellyScale = [1, 1, 1];
          useGameStore.setState({ buddies: buddiesClone });
        }
      }, 300);
    }
  });
}
