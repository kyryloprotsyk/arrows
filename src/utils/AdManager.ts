/* AdManager.ts — Multi-Platform Hybrid Monetization & Ad Abstraction Layer
 * Supports: CrazyGames SDK (Web), Poki SDK (Web), Capacitor AdMob (Mobile), and Local Mock/Demo Dialog.
 */

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: {
        ad: {
          requestAd: (type: 'rewarded' | 'midgame', callbacks: {
            adStarted?: () => void;
            adFinished?: () => void;
            adError?: (err: any) => void;
          }) => void;
        };
      };
    };
    PokiSDK?: {
      rewardedBreak: () => Promise<boolean>;
      commercialBreak: () => Promise<void>;
    };
    Capacitor?: {
      isNativePlatform: () => boolean;
      Plugins?: {
        AdMob?: any;
      };
    };
  }
}

export type AdType = '3x_coins' | 'free_spin' | 'hint' | 'extra_moves';

export class AdManagerClass {
  private isShowingAd = false;

  /**
   * Show a rewarded video ad.
   * Returns `true` if the player completed watching the ad and should receive the reward.
   */
  public async showRewardedAd(reason: AdType): Promise<boolean> {
    if (this.isShowingAd) return false;
    this.isShowingAd = true;

    try {
      // 1. Try CrazyGames SDK (Web)
      if (typeof window !== 'undefined' && window.CrazyGames?.SDK?.ad) {
        return await new Promise<boolean>((resolve) => {
          window.CrazyGames!.SDK!.ad.requestAd('rewarded', {
            adFinished: () => {
              this.isShowingAd = false;
              resolve(true);
            },
            adError: (err) => {
              console.warn('CrazyGames ad error, falling back:', err);
              this.isShowingAd = false;
              resolve(false);
            }
          });
        });
      }

      // 2. Try Poki SDK (Web)
      if (typeof window !== 'undefined' && window.PokiSDK) {
        const success = await window.PokiSDK.rewardedBreak();
        this.isShowingAd = false;
        return success;
      }

      // 3. Try Capacitor AdMob (Native Mobile Android/iOS)
      if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform() && window.Capacitor?.Plugins?.AdMob) {
        try {
          await window.Capacitor.Plugins.AdMob.showRewardVideoAd();
          this.isShowingAd = false;
          return true;
        } catch (err) {
          console.warn('AdMob error:', err);
          this.isShowingAd = false;
          return false;
        }
      }

      // 4. Fallback to Local Mock/Demo Ad Dialog (For fast testing & development)
      const mockSuccess = await this.showMockAdModal(reason);
      this.isShowingAd = false;
      return mockSuccess;

    } catch (e) {
      console.error('AdManager error:', e);
      this.isShowingAd = false;
      return false;
    }
  }

  /**
   * Show an interstitial ad between level transitions.
   */
  public async showInterstitialAd(): Promise<boolean> {
    if (this.isShowingAd) return false;
    this.isShowingAd = true;

    try {
      if (typeof window !== 'undefined' && window.CrazyGames?.SDK?.ad) {
        await new Promise<void>((resolve) => {
          window.CrazyGames!.SDK!.ad.requestAd('midgame', {
            adFinished: () => resolve(),
            adError: () => resolve()
          });
        });
      } else if (typeof window !== 'undefined' && window.PokiSDK) {
        await window.PokiSDK.commercialBreak();
      }
      this.isShowingAd = false;
      return true;
    } catch {
      this.isShowingAd = false;
      return true;
    }
  }

  /**
   * Renders a glowing HTML neon modal simulating an ad experience so developer & user can verify rewards locally.
   */
  private showMockAdModal(reason: AdType): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof document === 'undefined') {
        resolve(true);
        return;
      }

      const rewardTitle: Record<AdType, string> = {
        '3x_coins': '👑 3X Victory Bonus (+150 Coins!)',
        'free_spin': '🎩 Free Gacha Capsule Spin!',
        'hint': '💡 Instant Level Hint!',
        'extra_moves': '➕ +3 Extra Moves!'
      };

      const container = document.createElement('div');
      container.id = 'mock-ad-modal';
      container.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 999999;
        background: rgba(10, 0, 26, 0.94);
        backdrop-filter: blur(8px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: 'Fredoka', sans-serif;
        color: #fff;
        user-select: none;
        animation: fadeIn 0.25s ease-out;
      `;

      container.innerHTML = `
        <style>
          @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
          @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 25px rgba(255, 110, 180, 0.6); } 50% { box-shadow: 0 0 45px rgba(255, 0, 136, 0.9); } }
        </style>
        <div style="
          background: linear-gradient(135deg, #1c0936 0%, #0d011c 100%);
          border: 3px solid #ff6eb4;
          border-radius: 24px;
          padding: 32px 28px;
          max-width: 420px;
          width: 90%;
          text-align: center;
          animation: pulseGlow 2s infinite;
          box-shadow: 0 10px 40px rgba(0,0,0,0.8);
        ">
          <div style="font-size: 42px; margin-bottom: 12px;">🎬</div>
          <h2 style="font-size: 26px; color: #ffe45e; margin: 0 0 8px 0; text-shadow: 0 2px 10px rgba(255, 165, 0, 0.6);">
            Rewarded Video Ad
          </h2>
          <p style="font-size: 15px; color: #ccbbed; margin: 0 0 20px 0; line-height: 1.4;">
            Simulating ad partner SDK break.<br>Reward: <strong style="color: #00ffcc;">${rewardTitle[reason]}</strong>
          </p>

          <div style="background: rgba(255,255,255,0.08); border-radius: 12px; height: 8px; width: 100%; margin-bottom: 24px; overflow: hidden;">
            <div id="mock-ad-bar" style="background: linear-gradient(90deg, #ff6eb4, #ffe45e); height: 100%; width: 0%; transition: width 0.1s linear;"></div>
          </div>

          <button id="mock-ad-claim" style="
            background: linear-gradient(180deg, #00ffcc 0%, #00aa88 100%);
            border: none;
            border-radius: 14px;
            color: #0a001a;
            font-family: 'Fredoka', sans-serif;
            font-size: 18px;
            font-weight: 700;
            padding: 14px 28px;
            width: 100%;
            cursor: pointer;
            box-shadow: 0 6px 0 #006655, 0 8px 20px rgba(0,255,204,0.4);
            transition: transform 0.1s;
          ">
            🎁 Claim Reward (Demo Mode)
          </button>

          <div id="mock-ad-close" style="
            margin-top: 16px;
            font-size: 14px;
            color: #8877aa;
            cursor: pointer;
            text-decoration: underline;
          ">
            Cancel & Close
          </div>
        </div>
      `;

      document.body.appendChild(container);

      const bar = container.querySelector('#mock-ad-bar') as HTMLElement;
      const claimBtn = container.querySelector('#mock-ad-claim') as HTMLButtonElement;
      const closeBtn = container.querySelector('#mock-ad-close') as HTMLElement;

      let progress = 0;
      const interval = setInterval(() => {
        progress += 8;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
        }
        if (bar) bar.style.width = progress + '%';
      }, 50);

      const cleanup = () => {
        clearInterval(interval);
        if (container.parentNode) container.parentNode.removeChild(container);
      };

      claimBtn.onclick = () => {
        cleanup();
        resolve(true);
      };

      closeBtn.onclick = () => {
        cleanup();
        resolve(false);
      };
    });
  }
}

export const AdManager = new AdManagerClass();
