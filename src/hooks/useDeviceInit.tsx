// src/hooks/useDeviceInit.ts
import { useEffect, useRef } from 'react';
import { supabase } from 'lib/supabase';
import { getDeviceId } from '@apps-in-toss/framework';
import { captureError } from 'lib/sentry';
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

        if (error) {
          captureError(error, {
            location: 'useDeviceInit',
            tags: { feature: 'device-init' },
            extras: { deviceId, platform },
          });
        } else {
          initialized.current = true;
        }
      } catch (error) {
        captureError(error, {
          location: 'useDeviceInit/catch',
          tags: { feature: 'device-init' },
        });
      }
    }

    initDevice();
  }, []);
}
