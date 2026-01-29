import { useCallback, useRef } from 'react';
import { setClipboardText, SetClipboardTextPermissionError } from '@apps-in-toss/framework';

type ClipboardPermission = 'allowed' | 'denied' | 'notDetermined';

export function useClipboardCopy() {
  const permissionRef = useRef<ClipboardPermission | null>(null);
  const inFlightRef = useRef(false);

  const ensurePermission = useCallback(async () => {
    if (permissionRef.current === 'allowed') return true;

    // 1) 현재 상태 조회 (여기서도 에러가 날 수 있으니 방어)
    if (permissionRef.current == null) {
      try {
        permissionRef.current = await setClipboardText.getPermission();
      } catch {
        permissionRef.current = 'denied';
      }
    }

    // 2) allowed 아니면 다이얼로그로 재요청
    if (permissionRef.current !== 'allowed') {
      try {
        const result = await setClipboardText.openPermissionDialog();
        permissionRef.current = result;
      } catch {
        permissionRef.current = 'denied';
      }
    }

    return permissionRef.current === 'allowed';
  }, []);

  const copy = useCallback(
    async (text: string) => {
      if (inFlightRef.current) return false;
      inFlightRef.current = true;

      try {
        const ok = await ensurePermission();
        if (!ok) return false;

        await setClipboardText(text);
        return true;
      } catch (e) {
        if (e instanceof SetClipboardTextPermissionError) {
          permissionRef.current = 'denied';
          return false;
        }
        throw e;
      } finally {
        inFlightRef.current = false;
      }
    },
    [ensurePermission]
  );

  return { copy };
}
