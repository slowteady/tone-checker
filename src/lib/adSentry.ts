// lib/adSentry.ts
import { addBreadcrumb, captureError, captureMessage } from 'lib/sentry';

type AdKind = 'interstitial' | 'rewarded';

type AdFlowLoggerParams = {
  kind: AdKind;
  screen: string;
  placement: string;
  deviceId?: string;
  adGroupId?: string;
  extraBase?: Record<string, unknown>;
};

export function createAdFlowLogger(params: AdFlowLoggerParams) {
  const flowId = `${params.screen}:${params.placement}:${Date.now()}:${Math.random().toString(16).slice(2)}`;

  const baseTags = {
    feature: 'ad',
    ad_kind: params.kind,
    screen: params.screen,
    placement: params.placement,
  };

  const baseExtras = {
    flowId,
    deviceId: params.deviceId,
    adGroupId: params.adGroupId,
    ...params.extraBase,
  };

  const step = (name: string, data?: Record<string, unknown>) => {
    addBreadcrumb({
      category: 'ad.flow',
      message: name,
      level: 'info',
      data: { ...baseExtras, ...data },
    });
  };

  const error = (err: unknown, where: string, data?: Record<string, unknown>) => {
    captureError(err, {
      location: `ad/${params.screen}/${params.placement}/${where}`,
      tags: baseTags,
      extras: { ...baseExtras, ...data },
      user: params.deviceId ? { deviceId: params.deviceId } : undefined,
    });
  };

  const finish = (reason: string, data?: Record<string, unknown>) => {
    step(`finish.${reason}`, data);

    const level = reason === 'success' || reason === 'rewarded_and_charged' ? 'info' : 'warning';

    captureMessage(`ad.flow.${reason}`, level, {
      location: `ad/${params.screen}/${params.placement}`,
      tags: { ...baseTags, flow_result: reason },
      extras: { ...baseExtras, ...data },
      user: params.deviceId ? { deviceId: params.deviceId } : undefined,
    });
  };

  return { flowId, step, error, finish };
}
