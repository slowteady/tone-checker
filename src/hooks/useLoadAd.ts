import { GoogleAdMob } from '@apps-in-toss/framework';
import { useFocusEffect } from '@granite-js/native/@react-navigation/native';
import { useNavigation } from '@granite-js/react-native';
import { useCallback, useState } from 'react';

export const useLoadAd = (adGroupId: string) => {
  const [adLoadStatus, setAdLoadStatus] = useState<'not_loaded' | 'loaded' | 'failed'>('not_loaded');
  const [isAdConsumed, setIsAdConsumed] = useState(false);
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
            console.log('✅ 광고 로드 완료');
            setAdLoadStatus('loaded');
            break;
        }
      },
      onError: (error) => {
        console.error('❌ 광고 로드 실패', error);
        setAdLoadStatus('failed');
      },
    });

    return cleanup;
  }, [navigation]);

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
            setIsAdConsumed(true);
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
          case 'userEarnedReward': // 보상형 광고만 사용 가능
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
        console.error('광고 보여주기 실패', error);
      },
    });
  }, []);

  useFocusEffect(preloadAd);

  return { state: { adLoadStatus }, actions: { showAd } };
};
