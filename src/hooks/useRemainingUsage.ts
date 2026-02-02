import { getRemainingUsage } from '../api/usage';
import { ENDPOINT } from 'constants/endpoint';

/**
 * 남은 사용 횟수를 조회
 */
export const useRemainingUsage = (deviceId: string) => ({
  queryKey: [ENDPOINT.RPC_GET_TODAY_STATUS, deviceId],
  queryFn: () => getRemainingUsage(deviceId),
  enabled: !!deviceId,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 1,
  staleTime: 0,
  gcTime: 0,
});
