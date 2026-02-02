import { create } from 'zustand';
import { GoogleAdMob, type ShowAdMobEvent } from '@apps-in-toss/framework';
import { captureError } from 'lib/sentry';

type AdShowState = ShowAdMobEvent['type'] | 'idle';

type AdCallbacks = {
  onDismissed?: () => void;
  onUserEarnedReward?: () => void;
};

type AdStore = {
  adLoadStatus: 'not_loaded' | 'loaded' | 'failed';
  isAdConsumed: boolean;
  adShowState: AdShowState;
  currentAdGroupId: string | null;
  adCleanup: (() => void) | null;
  loadAd: (adGroupId: string) => void;
  showAd: (callbacks?: AdCallbacks) => void;
  cleanupAd: () => void;
  resetAd: () => void;
};

export const useAdStore = create<AdStore>((set, get) => ({
  // ========================================
  // 초기 State
  // ========================================
  adLoadStatus: 'not_loaded',
  isAdConsumed: false,
  adShowState: 'idle',
  currentAdGroupId: null,
  adCleanup: null,

  // ========================================
  // loadAd: 광고 preload
  // ========================================
  loadAd: (adGroupId: string) => {
    const state = get();

    // ✅ 이미 로드되고 아직 소비 안 했으면 스킵
    if (state.adLoadStatus === 'loaded' && !state.isAdConsumed && state.currentAdGroupId === adGroupId) {
      return;
    }

    // ✅ 1. 이전 광고 cleanup
    if (state.adCleanup) {
      state.adCleanup();
    }

    set({
      adLoadStatus: 'not_loaded',
      isAdConsumed: false,
      currentAdGroupId: adGroupId,
      adCleanup: null,
    });

    if (GoogleAdMob.loadAppsInTossAdMob.isSupported() !== true) {
      set({ adLoadStatus: 'failed' });
      return;
    }

    // ✅ 2. 새 광고 로드 및 cleanup 함수 저장
    const cleanup = GoogleAdMob.loadAppsInTossAdMob({
      options: { adGroupId },
      onEvent: (event) => {
        if (event.type === 'loaded') {
          set({ adLoadStatus: 'loaded' });
        }
      },
      onError: (error) => {
        captureError(error, {
          location: 'AdStore/loadAd',
          tags: { feature: 'ad' },
        });
        set({ adLoadStatus: 'failed', adCleanup: null });
      },
    });

    // ✅ 3. cleanup 함수 저장
    set({ adCleanup: cleanup });
  },

  // ========================================
  // showAd: 광고 표시
  // ========================================
  showAd: (callbacks?: AdCallbacks) => {
    const state = get();

    if (state.adShowState !== 'idle') {
      return;
    }

    if (state.adLoadStatus !== 'loaded') {
      callbacks?.onDismissed?.();
      return;
    }

    if (!state.currentAdGroupId) {
      callbacks?.onDismissed?.();
      return;
    }

    if (state.isAdConsumed) {
      callbacks?.onDismissed?.();
      return;
    }

    set({ isAdConsumed: true });

    if (GoogleAdMob.showAppsInTossAdMob.isSupported() !== true) {
      callbacks?.onDismissed?.();
      return;
    }

    GoogleAdMob.showAppsInTossAdMob({
      options: { adGroupId: state.currentAdGroupId },
      onEvent: (event) => {
        set({ adShowState: event.type });

        switch (event.type) {
          case 'dismissed':
            set({ adShowState: 'idle', adLoadStatus: 'not_loaded' });
            callbacks?.onDismissed?.();
            get().cleanupAd();
            break;

          case 'failedToShow':
            set({ adShowState: 'idle', adLoadStatus: 'not_loaded' });
            callbacks?.onDismissed?.();
            get().cleanupAd();
            break;

          case 'userEarnedReward':
            callbacks?.onUserEarnedReward?.();
            break;
        }
      },
      onError: (error) => {
        captureError(error, {
          location: 'AdStore/showAd',
          tags: { feature: 'ad' },
        });
        set({ adShowState: 'idle', adLoadStatus: 'not_loaded' });
        callbacks?.onDismissed?.();
        get().cleanupAd();
      },
    });
  },

  // ========================================
  // cleanupAd: 명시적 cleanup
  // ========================================
  cleanupAd: () => {
    const state = get();

    if (state.adCleanup) {
      state.adCleanup();
      set({ adCleanup: null });
    }
  },

  // ========================================
  // resetAd: 광고 상태 초기화 + cleanup
  // ========================================
  resetAd: () => {
    const state = get();

    if (state.adCleanup) {
      state.adCleanup();
    }

    set({
      adLoadStatus: 'not_loaded',
      isAdConsumed: false,
      adShowState: 'idle',
      currentAdGroupId: null,
      adCleanup: null,
    });
  },
}));
