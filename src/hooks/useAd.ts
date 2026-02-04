import { GoogleAdMob, type ShowAdMobEvent } from '@apps-in-toss/framework';
import { captureError } from 'lib/sentry';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseAdProps {
  adGroupId: string;
}

type AdShowState = ShowAdMobEvent['type'] | 'idle';
type AdLoadStatus = 'not_loaded' | 'loaded' | 'failed';

type ShowCallbacks = {
  onShow?: () => void;
  onDismissed?: () => void;
  onReward?: () => void;
};

export const useAd = ({ adGroupId }: UseAdProps) => {
  const [adLoadStatus, setAdLoadStatus] = useState<AdLoadStatus>('not_loaded');
  const [adShowState, setAdShowState] = useState<AdShowState>('idle');
  const [isAdConsumed, setIsAdConsumed] = useState(false);

  const cleanupRef = useRef<null | (() => void)>(null);

  const cleanup = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const loadAd = useCallback(async () => {
    if (GoogleAdMob.loadAppsInTossAdMob.isSupported() !== true) {
      setAdLoadStatus('failed');
      return 'failed' as const;
    }

    if (adLoadStatus === 'loaded' && !isAdConsumed) {
      return 'loaded' as const;
    }

    cleanup();
    setAdLoadStatus('not_loaded');
    setIsAdConsumed(false);

    return await new Promise<'loaded' | 'failed'>((resolve) => {
      const c = GoogleAdMob.loadAppsInTossAdMob({
        options: { adGroupId },
        onEvent: (event) => {
          if (event.type === 'loaded') {
            setAdLoadStatus('loaded');
            resolve('loaded');
          }
        },
        onError: (error) => {
          captureError(error, { location: 'useAd/loadAd', tags: { feature: 'ad' } });
          setAdLoadStatus('failed');
          resolve('failed');
        },
      });

      cleanupRef.current = c;
    });
  }, [adGroupId, adLoadStatus, isAdConsumed, cleanup]);

  const showAd = useCallback(
    (cb?: ShowCallbacks) => {
      if (GoogleAdMob.showAppsInTossAdMob.isSupported() !== true) {
        cb?.onDismissed?.();
        return;
      }

      setIsAdConsumed(true);
      setAdShowState('idle');

      GoogleAdMob.showAppsInTossAdMob({
        options: { adGroupId },
        onEvent: (event) => {
          setAdShowState(event.type);

          switch (event.type) {
            case 'show':
              cb?.onShow?.();
              break;
            case 'userEarnedReward':
              cb?.onReward?.();
              break;
            case 'dismissed':
            case 'failedToShow':
              cb?.onDismissed?.();
              setAdShowState('idle');
              break;
            default:
              break;
          }
        },
        onError: (error) => {
          captureError(error, { location: 'useAd/showAd', tags: { feature: 'ad' } });
          cb?.onDismissed?.();
        },
      });
    },
    [adGroupId]
  );

  return {
    state: { adLoadStatus, adShowState, isAdConsumed },
    actions: { loadAd, showAd, cleanup },
  };
};
