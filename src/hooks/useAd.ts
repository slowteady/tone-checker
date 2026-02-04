import { GoogleAdMob } from '@apps-in-toss/framework';
import { captureError } from 'lib/sentry';
import { useCallback, useState } from 'react';

export interface UseAdProps {
  adGroupId: string;
}

export const useAd = ({ adGroupId }: UseAdProps) => {
  const [loadStatus, setLoadStatus] = useState<'not_loaded' | 'loaded' | 'failed'>('not_loaded');

  const loadAd = useCallback(() => {
    if (GoogleAdMob.loadAppsInTossAdMob.isSupported() !== true) {
      setLoadStatus('failed');
      return;
    }

    const cleanup = GoogleAdMob.loadAppsInTossAdMob({
      options: { adGroupId },
      onEvent: (event) => {
        switch (event.type) {
          case 'loaded':
            setLoadStatus('loaded');
            cleanup();
            break;
        }
      },
      onError: (error) => {
        captureError(error, {
          location: 'useAd/loadAd',
          tags: { feature: 'ad' },
        });
        setLoadStatus('failed');
        cleanup?.();
      },
    });
  }, [adGroupId]);

  const showAd = useCallback(() => {
    if (GoogleAdMob.showAppsInTossAdMob.isSupported() !== true) {
      return;
    }

    GoogleAdMob.showAppsInTossAdMob({
      options: { adGroupId },
      onEvent: (event) => {
        switch (event.type) {
          case 'show':
            console.log('광고 컨텐츠 보여졌음');
            break;
          case 'requested':
            console.log('광고 보여주기 요청 완료');
            break;
          case 'impression':
            console.log('광고 노출');
            break;
          case 'clicked':
            console.log('광고 클릭');
            break;
          case 'userEarnedReward':
            console.log('광고 보상 획득 unitType:', event.data.unitType);
            console.log('광고 보상 획득 unitAmount:', event.data.unitAmount);
            break;
          case 'dismissed':
            console.log('광고 닫힘');
            break;
          case 'failedToShow':
            console.log('광고 보여주기 실패');
            break;
        }
      },
      onError: (error) => {
        captureError(error, {
          location: 'useAd/showAd',
          tags: { feature: 'ad' },
        });
      },
    });
  }, [adGroupId]);

  return { status: loadStatus, actions: { loadAd, showAd } };
};
