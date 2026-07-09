/* LeaderboardService.ts — Global Online Leaderboard & Player Profile Engine */
import { GameData } from './GameData';

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  stars: number;
  streak: number;
  solved: number;
  isCurrentUser?: boolean;
}

const GLOBAL_STORAGE_KEY = 'arrow_buddies_global_board_v1';

const SEED_PLAYERS: Omit<LeaderboardEntry, 'isCurrentUser'>[] = [
  { id: 'p1', username: 'TokyoKing 🗼', avatar: '🐉', level: 48, xp: 84500, stars: 90, streak: 24, solved: 142 },
  { id: 'p2', username: 'Sarah_X ⚡', avatar: '👑', level: 45, xp: 76200, stars: 88, streak: 18, solved: 135 },
  { id: 'p3', username: 'QuantumCube 🌌', avatar: '🧙‍♂️', level: 42, xp: 69800, stars: 85, streak: 15, solved: 128 },
  { id: 'p4', username: 'NeoSlayer 🔥', avatar: '🤖', level: 39, xp: 61400, stars: 82, streak: 14, solved: 119 },
  { id: 'p5', username: 'ArrowMaster 🎯', avatar: '🦊', level: 36, xp: 54000, stars: 78, streak: 12, solved: 108 },
  { id: 'p6', username: 'CyberSamurai ⛩️', avatar: '💎', level: 34, xp: 48900, stars: 75, streak: 11, solved: 98 },
  { id: 'p7', username: 'ElsaFrost ❄️', avatar: '❄️', level: 31, xp: 43200, stars: 72, streak: 9, solved: 91 },
  { id: 'p8', username: 'MagmaLord 🌋', avatar: '🔥', level: 28, xp: 37800, stars: 68, streak: 8, solved: 84 },
  { id: 'p9', username: 'JellyBean 🍬', avatar: '🍭', level: 25, xp: 32500, stars: 64, streak: 7, solved: 76 },
  { id: 'p10', username: 'DinoRex 🦖', avatar: '🦖', level: 23, xp: 28400, stars: 60, streak: 6, solved: 69 },
  { id: 'p11', username: 'SkyWalker 🚀', avatar: '🚀', level: 21, xp: 24800, stars: 56, streak: 5, solved: 62 },
  { id: 'p12', username: 'CrystalGazer 🔮', avatar: '🔮', level: 19, xp: 21500, stars: 52, streak: 5, solved: 57 },
  { id: 'p13', username: 'BladeRunner ⚔️', avatar: '⚡', level: 17, xp: 18400, stars: 48, streak: 4, solved: 51 },
  { id: 'p14', username: 'PixelQueen 👾', avatar: '👾', level: 15, xp: 15600, stars: 44, streak: 4, solved: 46 },
  { id: 'p15', username: 'ShadowHunter 🌑', avatar: '🐺', level: 14, xp: 13800, stars: 41, streak: 3, solved: 41 },
  { id: 'p16', username: 'NeonRider 🏍️', avatar: '🌈', level: 12, xp: 11900, stars: 38, streak: 3, solved: 36 },
  { id: 'p17', username: 'IcePrincess 👑', avatar: '🧊', level: 11, xp: 10200, stars: 35, streak: 3, solved: 32 },
  { id: 'p18', username: 'LavaSurfer 🏄‍♂️', avatar: '🔥', level: 10, xp: 8800, stars: 32, streak: 2, solved: 28 },
  { id: 'p19', username: 'StarChaser ✨', avatar: '⭐', level: 8, xp: 6900, stars: 28, streak: 2, solved: 24 },
  { id: 'p20', username: 'CubeCrusher 📦', avatar: '💪', level: 7, xp: 5400, stars: 24, streak: 2, solved: 20 },
  { id: 'p21', username: 'GlitchMaster ⚡', avatar: '🤖', level: 6, xp: 4200, stars: 21, streak: 1, solved: 17 },
  { id: 'p22', username: 'RogueArcher 🏹', avatar: '🏹', level: 5, xp: 3200, stars: 18, streak: 1, solved: 14 },
  { id: 'p23', username: 'PocketWizard 🧙', avatar: '🧙‍♂️', level: 4, xp: 2300, stars: 15, streak: 1, solved: 11 },
  { id: 'p24', username: 'LuckyCharm 🍀', avatar: '🍀', level: 3, xp: 1500, stars: 12, streak: 1, solved: 8 },
  { id: 'p25', username: 'NoobSlayer99 🎮', avatar: '🎯', level: 2, xp: 800, stars: 8, streak: 0, solved: 5 }
];

export class LeaderboardService {
  private static loadGlobalEntries(): LeaderboardEntry[] {
    try {
      const stored = localStorage.getItem(GLOBAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load global leaderboard, seeding new database...');
    }
    const initial = [...SEED_PLAYERS];
    localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  private static saveGlobalEntries(entries: LeaderboardEntry[]) {
    try {
      localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to save global leaderboard:', e);
    }
  }

  /** Sync current user progress into global database and return up-to-date entries. */
  public static syncAndGetLeaderboard(sortBy: 'stars' | 'streak' | 'solved' | 'level' = 'stars'): {
    entries: LeaderboardEntry[];
    userRank: number;
    userEntry: LeaderboardEntry;
  } {
    const entries = this.loadGlobalEntries().filter(e => e.id !== 'current_user');

    const userEntry: LeaderboardEntry = {
      id: 'current_user',
      username: GameData.username.get(),
      avatar: GameData.avatar.get(),
      level: GameData.playerXP.getLevel(),
      xp: GameData.playerXP.get(),
      stars: GameData.totalStars(),
      streak: GameData.winStreak.get(),
      solved: GameData.puzzlesSolved.get(),
      isCurrentUser: true
    };

    entries.push(userEntry);

    // Sort descending by exact metric
    entries.sort((a, b) => {
      if (sortBy === 'stars') {
        if (b.stars !== a.stars) return b.stars - a.stars;
        return b.xp - a.xp;
      } else if (sortBy === 'streak') {
        if (b.streak !== a.streak) return b.streak - a.streak;
        return b.stars - a.stars;
      } else if (sortBy === 'solved') {
        if (b.solved !== a.solved) return b.solved - a.solved;
        return b.stars - a.stars;
      } else {
        if (b.level !== a.level) return b.level - a.level;
        return b.xp - a.xp;
      }
    });

    const userRank = entries.findIndex(e => e.id === 'current_user') + 1;
    this.saveGlobalEntries(entries);

    return {
      entries,
      userRank,
      userEntry
    };
  }

  /** Simulate live online competitive activity by randomly nudging top player scores */
  public static simulateLiveActivity() {
    const entries = this.loadGlobalEntries();
    let mutated = false;
    entries.forEach(e => {
      if (e.id !== 'current_user' && Math.random() < 0.15) {
        if (Math.random() < 0.5) {
          e.xp += Math.round(Math.random() * 80 + 20);
          e.solved += 1;
        } else if (Math.random() < 0.3) {
          e.streak = Math.min(e.streak + 1, 30);
        }
        mutated = true;
      }
    });
    if (mutated) {
      this.saveGlobalEntries(entries);
    }
  }
}
