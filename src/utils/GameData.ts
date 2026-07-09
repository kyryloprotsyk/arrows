/* GameData.ts — Persistent save/load wrapper using localStorage */

const KEY_PREFIX = 'arrow_buddies_';

export const GameData = {
  coins: {
    get: (): number => parseInt(localStorage.getItem(KEY_PREFIX + 'coins') ?? '120'),
    set: (v: number) => localStorage.setItem(KEY_PREFIX + 'coins', v.toString()),
    add: (v: number) => GameData.coins.set(GameData.coins.get() + v)
  },

  world: {
    get: (): number => parseInt(localStorage.getItem(KEY_PREFIX + 'world') ?? '1'),
    set: (v: number) => localStorage.setItem(KEY_PREFIX + 'world', v.toString())
  },

  level: {
    get: (): number => parseInt(localStorage.getItem(KEY_PREFIX + 'level') ?? '1'),
    set: (v: number) => localStorage.setItem(KEY_PREFIX + 'level', v.toString())
  },

  starsFor: (world: number, level: number): number => {
    return parseInt(localStorage.getItem(`${KEY_PREFIX}stars_w${world}_l${level}`) ?? '0');
  },

  setStarsFor: (world: number, level: number, stars: number) => {
    const key = `${KEY_PREFIX}stars_w${world}_l${level}`;
    const current = parseInt(localStorage.getItem(key) ?? '0');
    if (stars > current) localStorage.setItem(key, stars.toString());
  },

  totalStars: (): number => {
    let total = 0;
    for (let w = 1; w <= 6; w++) {
      for (let l = 1; l <= 5; l++) {
        total += GameData.starsFor(w, l);
      }
    }
    return total;
  },

  activeSkin: {
    get: (): string => localStorage.getItem(KEY_PREFIX + 'active_skin') ?? 'none',
    set: (id: string) => localStorage.setItem(KEY_PREFIX + 'active_skin', id)
  },

  unlockedSkins: {
    get: (): string[] => {
      try {
        return JSON.parse(localStorage.getItem(KEY_PREFIX + 'unlocked_skins') ?? '["none"]');
      } catch { return ['none']; }
    },
    add: (id: string) => {
      const list = GameData.unlockedSkins.get();
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem(KEY_PREFIX + 'unlocked_skins', JSON.stringify(list));
      }
    },
    has: (id: string): boolean => GameData.unlockedSkins.get().includes(id)
  },

  muted: {
    get: (): boolean => localStorage.getItem(KEY_PREFIX + 'muted') === 'true',
    set: (v: boolean) => localStorage.setItem(KEY_PREFIX + 'muted', v.toString()),
    toggle: (): boolean => {
      const next = !GameData.muted.get();
      GameData.muted.set(next);
      return next;
    }
  },

  dailyStreak: {
    get: (): number => parseInt(localStorage.getItem(KEY_PREFIX + 'daily_streak') ?? '1'),
    set: (v: number) => localStorage.setItem(KEY_PREFIX + 'daily_streak', v.toString()),
    lastPlayed: (): string => localStorage.getItem(KEY_PREFIX + 'last_daily_date') ?? '',
    setLastPlayed: (dateStr: string) => localStorage.setItem(KEY_PREFIX + 'last_daily_date', dateStr),
    checkAndIncrement: (): { streak: number; alreadyPlayedToday: boolean } => {
      const today = new Date().toISOString().slice(0, 10);
      const last = GameData.dailyStreak.lastPlayed();
      if (last === today) {
        return { streak: GameData.dailyStreak.get(), alreadyPlayedToday: true };
      }
      let currentStreak = GameData.dailyStreak.get();
      if (last) {
        const lastDate = new Date(last);
        const todayDate = new Date(today);
        const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          currentStreak = Math.min(currentStreak + 1, 7);
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      }
      GameData.dailyStreak.set(currentStreak);
      GameData.dailyStreak.setLastPlayed(today);
      return { streak: currentStreak, alreadyPlayedToday: false };
    }
  },

  // ── Player Profile & Exact Progress Formulas ────────────────────────────
  username: {
    get: (): string => localStorage.getItem(KEY_PREFIX + 'username') ?? 'AlexTheGreat',
    set: (name: string) => localStorage.setItem(KEY_PREFIX + 'username', name.trim() || 'Player')
  },

  avatar: {
    get: (): string => localStorage.getItem(KEY_PREFIX + 'avatar') ?? '🧙‍♂️',
    set: (emoji: string) => localStorage.setItem(KEY_PREFIX + 'avatar', emoji)
  },

  playerXP: {
    get: (): number => parseInt(localStorage.getItem(KEY_PREFIX + 'player_xp') ?? '0'),
    set: (v: number) => localStorage.setItem(KEY_PREFIX + 'player_xp', Math.max(0, v).toString()),
    add: (v: number): { oldLevel: number; newLevel: number; xpEarned: number } => {
      const oldXP = GameData.playerXP.get();
      const oldLevel = GameData.playerXP.getLevelFromXP(oldXP);
      const newXP = oldXP + Math.max(0, v);
      GameData.playerXP.set(newXP);
      const newLevel = GameData.playerXP.getLevelFromXP(newXP);
      return { oldLevel, newLevel, xpEarned: v };
    },
    getLevelFromXP: (xp: number): number => {
      if (xp <= 0) return 1;
      return Math.min(100, Math.floor(Math.pow(xp / 100, 1 / 1.4)) + 1);
    },
    getLevel: (): number => GameData.playerXP.getLevelFromXP(GameData.playerXP.get()),
    getXPForLevel: (lvl: number): number => {
      if (lvl <= 1) return 0;
      return Math.floor(100 * Math.pow(lvl - 1, 1.4));
    },
    getRankTitle: (): string => {
      const lvl = GameData.playerXP.getLevel();
      if (lvl >= 50) return 'Mythic Arrow God 🌌';
      if (lvl >= 35) return 'Grandmaster Slayer 👑';
      if (lvl >= 25) return 'Cube Whisperer ⚡';
      if (lvl >= 15) return 'Combo Master 🔥';
      if (lvl >= 8)  return 'Isometric Tactician 🎯';
      if (lvl >= 4)  return 'Puzzle Seeker 🔮';
      return 'Novice Archer 🏹';
    }
  },

  winStreak: {
    get: (): number => parseInt(localStorage.getItem(KEY_PREFIX + 'win_streak') ?? '0'),
    increment: (): number => {
      const next = GameData.winStreak.get() + 1;
      localStorage.setItem(KEY_PREFIX + 'win_streak', next.toString());
      return next;
    },
    reset: () => localStorage.setItem(KEY_PREFIX + 'win_streak', '0')
  },

  puzzlesSolved: {
    get: (): number => parseInt(localStorage.getItem(KEY_PREFIX + 'puzzles_solved') ?? '0'),
    increment: (): number => {
      const next = GameData.puzzlesSolved.get() + 1;
      localStorage.setItem(KEY_PREFIX + 'puzzles_solved', next.toString());
      return next;
    }
  },

  highScore: {
    get: (): number => parseInt(localStorage.getItem(KEY_PREFIX + 'high_score') ?? '0'),
    setIfHigher: (score: number) => {
      if (score > GameData.highScore.get()) {
        localStorage.setItem(KEY_PREFIX + 'high_score', Math.round(score).toString());
      }
    }
  }
};
