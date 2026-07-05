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
    for (let w = 1; w <= 3; w++) {
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
  }
};
