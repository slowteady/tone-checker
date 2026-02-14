// src/hooks/useDeviceInit.ts
import { useEffect, useRef } from 'react';
import { supabase } from 'lib/supabase';
import { getDeviceId } from '@apps-in-toss/framework';
import { Platform } from 'react-native';

export function useDeviceInit() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    async function initDevice() {
      const deviceId = getDeviceId();

      if (!deviceId) {
        return;
      }

      try {
        const platform = Platform.OS;

        const { error } = await supabase.rpc('rpc_device_init', {
          p_device_id: deviceId,
          p_platform: platform,
        });

        if (!error) {
          initialized.current = true;
        }
      } catch (error) {
        // 디바이스 초기화 실패는 앱 작동에 영향 없으므로 에러 추적 제거
        console.error('Device init failed:', error);
      }
    }

    initDevice();
  }, []);
}
