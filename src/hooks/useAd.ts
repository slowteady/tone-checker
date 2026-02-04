import { GoogleAdMob, type ShowAdMobEvent } from '@apps-in-toss/framework';
import { captureError } from 'lib/sentry';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseAdProps {
  adGroupId: string;
}

type AdShowState = ShowAdMobEvent['type'] | 'idle';
type AdLoadStatus = 'not_loaded' | 'loaded' | 'failed';

export const useAd = ({ adGroupId }: UseAdProps) => {
  const [adLoadStatus, setAdLoadStatus] = useState<AdLoadStatus>('not_loaded');
  const [isAdConsumed, setIsAdConsumed] = useState(false);
  const [adShowState, setAdShowState] = useState<AdShowState>('idle');

  const cleanupRef = useRef<null | (() => void)>(null);

  const cleanup = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const loadAd = useCallback(() => {
    if (GoogleAdMob.loadAppsInTossAdMob.isSupported() !== true) {
      setAdLoadStatus('failed');
      return Promise.resolve('failed');
    }

    if (adLoadStatus === 'loaded' && !isAdConsumed) {
      return Promise.resolve('loaded');
    }

    cleanup();

    setAdLoadStatus('not_loaded');
    setIsAdConsumed(false);

    return new Promise((resolve) => {
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

  const showAd = useCallback((): Promise<'dismissed' | 'failedToShow' | 'not_supported'> => {
    if (GoogleAdMob.showAppsInTossAdMob.isSupported() !== true) {
      return Promise.resolve('not_supported');
    }

    setIsAdConsumed(true);
    setAdShowState('idle');

    return new Promise((resolve) => {
      GoogleAdMob.showAppsInTossAdMob({
        options: { adGroupId },
        onEvent: (event) => {
          setAdShowState(event.type);

          switch (event.type) {
            case 'dismissed': // 광고 닫힘
              resolve('dismissed');
              break;
            case 'failedToShow': // 광고 보여주기 실패
              resolve('failedToShow');
              break;
            default:
              break;
          }
        },
        onError: (error) => {
          captureError(error, { location: 'useAd/showAd', tags: { feature: 'ad' } });
          resolve('failedToShow');
        },
      });
    });
  }, [adGroupId]);

  return { state: { adLoadStatus, adShowState, isAdConsumed }, actions: { loadAd, showAd, cleanup } };
};

// switch (event.type) {
//   case 'show': // 광고 출력
//     onShowed?.();
//     break;
//   case 'requested': // 광고 보여주기 요청 완료
//     break;
//   case 'impression': // 광고 노출
//     break;
//   case 'clicked': // 광고 클릭
//     break;
//   case 'userEarnedReward': // 보상형 광고 보상 획득
//     break;
//   case 'dismissed': // 광고 닫힘
//     onDismissed?.();
//     setAdShowState('idle');
//     break;
//   case 'failedToShow': // 광고 보여주기 실패
//     onDismissed?.();
//     setAdShowState('idle');
//     break;
// }
