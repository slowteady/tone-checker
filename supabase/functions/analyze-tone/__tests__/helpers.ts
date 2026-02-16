/**
 * 테스트 헬퍼 함수
 */

const BASE_URL = 'http://localhost:54321/functions/v1/analyze-tone';

export interface AnalyzeRequest {
  text: string;
  device_id: string;
  // v1 (optional for backward compatibility)
  relationship?: 'business' | 'personal';
  situation?: 'neutral' | 'sensitive' | 'casual';
  // v2
  mode?: 'generate' | 'correct';
  scenario?: 'to_child' | 'to_parent' | 'boss' | 'colleague' | 'client' | 'friend' | 'partner';
  tone?: 'soft' | 'firm' | 'formal' | 'casual';
  platform: string;
}

/**
 * analyze-tone API 호출 헬퍼
 */
export async function callAnalyzeAPI(body: Partial<AnalyzeRequest>) {
  const defaultBody: AnalyzeRequest = {
    text: '내일 회의 참석 부탁드립니다. 중요한 안건이 있습니다.',
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
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
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
