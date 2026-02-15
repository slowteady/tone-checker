/**
 * 테스트 헬퍼 함수
 */

const BASE_URL = 'http://localhost:54321/functions/v1/analyze-tone';

export interface AnalyzeRequest {
  text: string;
  device_id: string;
  relationship: 'business' | 'personal';
  situation: 'neutral' | 'sensitive' | 'casual';
  platform: string;
}

/**
 * analyze-tone API 호출 헬퍼
 */
export async function callAnalyzeAPI(body: Partial<AnalyzeRequest>) {
  const defaultBody: AnalyzeRequest = {
    text: '내일 회의 참석 부탁드립니다',
    device_id: 'test-device-123',
    relationship: 'business',
    situation: 'neutral',
    platform: 'test',
    ...body,
  };

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(defaultBody),
  });

  const data = await response.json();

  return {
    status: response.status,
    data,
  };
}

/**
 * 랜덤 디바이스 ID 생성
 */
export function generateDeviceId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
