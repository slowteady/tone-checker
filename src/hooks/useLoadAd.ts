import { GoogleAdMob, type ShowAdMobEvent } from '@apps-in-toss/framework';
import { useFocusEffect } from '@granite-js/native/@react-navigation/native';
import { useNavigation } from '@granite-js/react-native';
import { captureError } from 'lib/sentry';
import { useCallback, useState } from 'react';

export interface UseLoadAdProps {
  adGroupId: string;
  onShowed?: () => void;
  onDismissed?: () => void;
}

type AdShowState = ShowAdMobEvent['type'] | 'idle';

export const useLoadAd = ({ adGroupId, onShowed, onDismissed }: UseLoadAdProps) => {
  const [adLoadStatus, setAdLoadStatus] = useState<'not_loaded' | 'loaded' | 'failed'>('not_loaded');
  const [isAdConsumed, setIsAdConsumed] = useState(false);
  const [adShowState, setAdShowState] = useState<AdShowState>('idle');

  const navigation = useNavigation();

  const preloadAd = useCallback(() => {
    if (GoogleAdMob.loadAppsInTossAdMob.isSupported() !== true) {
      return;
    }

    if (adLoadStatus === 'loaded' && !isAdConsumed) {
      return;
    }

    setAdLoadStatus('not_loaded');
    setIsAdConsumed(false);

    const cleanup = GoogleAdMob.loadAppsInTossAdMob({
      options: { adGroupId },
      onEvent: (event) => {
        switch (event.type) {
          case 'loaded':
            setAdLoadStatus('loaded');
            break;
        }
      },
      onError: (error) => {
        captureError(error, {
          location: 'useLoadAd/preloadAd/onError',
          tags: { feature: 'preload' },
        });
        setAdLoadStatus('failed');
      },
    });

    return cleanup;
  }, [navigation]);

  const showAd = useCallback(() => {
    if (GoogleAdMob.showAppsInTossAdMob.isSupported() !== true) {
      onDismissed?.();
      return;
    }

    setIsAdConsumed(true);
    setAdShowState('idle');

    GoogleAdMob.showAppsInTossAdMob({
      options: { adGroupId },
      onEvent: (event) => {
        setAdShowState(event.type);

        switch (event.type) {
          case 'show': // 광고 출력
            onShowed?.();
            break;
          case 'requested': // 광고 보여주기 요청 완료
            break;
          case 'impression': // 광고 노출
            break;
          case 'clicked': // 광고 클릭
            break;
          case 'userEarnedReward': // 보상형 광고 보상 획득
            break;
          case 'dismissed': // 광고 닫힘
            onDismissed?.();
            setAdShowState('idle');
            break;
          case 'failedToShow': // 광고 보여주기 실패
            onDismissed?.();
            setAdShowState('idle');
            break;
        }
      },
      onError: (error) => {
        captureError(error, {
          location: 'useLoadAd/showAd/onError',
          tags: { feature: 'ad' },
        });
        onDismissed?.();
      },
    });
  }, []);

  useFocusEffect(preloadAd);

  return { state: { adLoadStatus, adShowState }, actions: { showAd } };
};
