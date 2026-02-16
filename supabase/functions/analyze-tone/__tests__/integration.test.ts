/**
 * analyze-tone Edge Function 통합 테스트
 *
 * 실행 방법:
 * 1. Supabase 로컬 실행: supabase start
 * 2. Edge Function 실행: supabase functions serve analyze-tone --env-file supabase/.env.local
 * 3. 테스트 실행: deno test --allow-net supabase/functions/analyze-tone/__tests__/integration.test.ts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { callAnalyzeAPI, generateDeviceId } from './helpers.ts';

/**
 * 정상 케이스 테스트
 */
Deno.test('정상 케이스 - 비즈니스 관계, 중립 상황', async () => {
  const { status, data } = await callAnalyzeAPI({
    text: '내일 회의 참석 부탁드립니다. 중요한 안건이 있습니다.',
    device_id: generateDeviceId(),
    relationship: 'business',
    situation: 'neutral',
  });

  assertEquals(status, 200);
  assertEquals(data.ok, true);
  assertExists(data.data);

  // overall_score 검증
  assertEquals(typeof data.data.overall_score, 'number');
  assertEquals(data.data.overall_score >= 0 && data.data.overall_score <= 100, true);

  // summary 검증
  assertEquals(typeof data.data.summary, 'string');
  assertEquals(data.data.summary.length <= 50, true);

  // category_scores 검증
  assertExists(data.data.category_scores);
  assertExists(data.data.category_scores.emotion_attitude);
  assertExists(data.data.category_scores.politeness_respect);
  assertExists(data.data.category_scores.conflict_safety);
  assertExists(data.data.category_scores.clarity_delivery);
  assertExists(data.data.category_scores.context_fit);

  // suggestions 검증
  assertEquals(Array.isArray(data.data.suggestions), true);
  assertEquals(data.data.suggestions.length, 3);

  // 사용량 정보 검증
  assertExists(data.data.usage);
  assertEquals(typeof data.data.usage.remaining_total, 'number');
});

Deno.test('정상 케이스 - 개인 관계, 편안한 상황', async () => {
  const { status, data } = await callAnalyzeAPI({
    text: '오늘 저녁에 같이 저녁 먹을래? 맛있는 집 찾았어',
    device_id: generateDeviceId(),
    relationship: 'personal',
    situation: 'casual',
  });

  assertEquals(status, 200);
  assertEquals(data.ok, true);
  assertExists(data.data);
});

/**
 * 입력 검증 에러 테스트
 */
Deno.test('에러 케이스 - 20자 미만 텍스트', async () => {
  const { status, data } = await callAnalyzeAPI({
    text: '안녕하세요',
    device_id: generateDeviceId(),
  });

  assertEquals(status, 400);
  assertEquals(data.ok, false);
  assertEquals(data.error.code, 'TEXT_TOO_SHORT');
});

Deno.test('에러 케이스 - 800자 초과 텍스트', async () => {
  const longText = 'a'.repeat(801);
  const { status, data } = await callAnalyzeAPI({
    text: longText,
    device_id: generateDeviceId(),
  });

  assertEquals(status, 400);
  assertEquals(data.ok, false);
  assertEquals(data.error.code, 'TEXT_TOO_LONG');
});

Deno.test('에러 케이스 - 빈 텍스트', async () => {
  const { status, data } = await callAnalyzeAPI({
    text: '',
    device_id: generateDeviceId(),
  });

  assertEquals(status, 400);
  assertEquals(data.ok, false);
  assertEquals(data.error.code, 'TEXT_TOO_SHORT');
});

Deno.test('에러 케이스 - device_id 누락', async () => {
  const response = await fetch('http://localhost:54321/functions/v1/analyze-tone', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    },
    body: JSON.stringify({
      text: '내일 회의 참석 부탁드립니다. 중요한 안건이 있습니다.',
      relationship: 'business',
      situation: 'neutral',
      platform: 'test',
      // device_id 의도적으로 누락
    }),
  });

  const data = await response.json();

  assertEquals(response.status, 400);
  assertEquals(data.ok, false);
  assertEquals(data.error.code, 'INVALID_INPUT');
});

/**
 * HTTP 메서드 검증
 */
Deno.test('에러 케이스 - GET 요청', async () => {
  const response = await fetch('http://localhost:54321/functions/v1/analyze-tone', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    },
  });

  const data = await response.json();

  assertEquals(response.status, 405);
  assertEquals(data.ok, false);
  assertEquals(data.error.code, 'METHOD_NOT_ALLOWED');
});

/**
 * v2 정상 동작 테스트
 */
Deno.test('v2 정상 케이스 - generate 모드', async () => {
  const { status, data } = await callAnalyzeAPI({
    mode: 'generate',
    text: '내일 연차 사용하고 싶어요',
    device_id: generateDeviceId(),
    scenario: 'boss',
    tone: 'soft',
    platform: 'test',
  });

  assertEquals(status, 200);
  assertEquals(data.ok, true);
  assertExists(data.data);

  // messages 필드 검증
  assertEquals(Array.isArray(data.data.messages), true);
  assertEquals(data.data.messages.length, 3);

  // 각 메시지 구조 검증
  const message = data.data.messages[0];
  assertExists(message.label);
  assertExists(message.text);
  assertEquals(typeof message.label, 'string');
  assertEquals(typeof message.text, 'string');
});

Deno.test('v2 정상 케이스 - correct 모드', async () => {
  const { status, data } = await callAnalyzeAPI({
    mode: 'correct',
    text: '내일 좀 쉬고 싶은데요 괜찮을까요? 업무가 좀 밀려서요.',
    device_id: generateDeviceId(),
    scenario: 'boss',
    tone: 'formal',
    platform: 'test',
  });

  assertEquals(status, 200);
  assertEquals(data.ok, true);
  assertExists(data.data);

  // diagnosis 필드 검증
  assertEquals(typeof data.data.diagnosis, 'string');

  // corrections 필드 검증
  assertEquals(Array.isArray(data.data.corrections), true);
  assertEquals(data.data.corrections.length, 3);

  // 각 교정 문장 구조 검증
  const correction = data.data.corrections[0];
  assertExists(correction.label);
  assertExists(correction.description);
  assertExists(correction.text);
  assertEquals(typeof correction.label, 'string');
  assertEquals(typeof correction.description, 'string');
  assertEquals(typeof correction.text, 'string');

  // 상세 분석 필드 검증 (v1 구조 유지)
  assertEquals(typeof data.data.overall_score, 'number');
  assertEquals(typeof data.data.summary, 'string');
  assertExists(data.data.category_scores);
  assertEquals(Array.isArray(data.data.signals), true);
});

/**
 * v2 파라미터 검증 테스트 (입력 validation만, OpenAI 호출 없음)
 */
Deno.test('v2 에러 케이스 - 잘못된 mode 값', async () => {
  const response = await fetch('http://localhost:54321/functions/v1/analyze-tone', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    },
    body: JSON.stringify({
      mode: 'invalid_mode',
      text: '내일 회의 참석 부탁드립니다. 중요한 안건이 있습니다.',
      device_id: generateDeviceId(),
      scenario: 'boss',
      tone: 'formal',
      platform: 'test',
    }),
  });

  const data = await response.json();

  assertEquals(response.status, 400);
  assertEquals(data.ok, false);
  assertEquals(data.error.code, 'INVALID_INPUT');
});

/**
 * 응답 스키마 검증
 */
Deno.test('응답 스키마 - suggestions 구조 검증', async () => {
  const { status, data } = await callAnalyzeAPI({
    text: '내일 회의 참석 부탁드립니다. 중요한 안건이 있습니다.',
    device_id: generateDeviceId(),
  });

  assertEquals(status, 200);

  const suggestion = data.data.suggestions[0];
  assertExists(suggestion.label);
  assertExists(suggestion.description);
  assertExists(suggestion.example);

  assertEquals(typeof suggestion.label, 'string');
  assertEquals(typeof suggestion.description, 'string');
  assertEquals(typeof suggestion.example, 'string');

  // 길이 제한 검증
  assertEquals(suggestion.label.length <= 20, true);
  assertEquals(suggestion.description.length <= 50, true);
  assertEquals(suggestion.example.length <= 1200, true);
});

Deno.test('응답 스키마 - signals 구조 검증', async () => {
  const { status, data } = await callAnalyzeAPI({
    text: '당장 처리하세요. 왜 아직도 안 했어요?',
    device_id: generateDeviceId(),
    relationship: 'business',
    situation: 'neutral',
  });

  assertEquals(status, 200);

  // signals가 있을 경우에만 검증
  if (data.data.signals.length > 0) {
    const signal = data.data.signals[0];
    assertExists(signal.category);
    assertExists(signal.level);
    assertExists(signal.reason);
    assertExists(signal.evidence);

    // level 값 검증
    assertEquals(['low', 'medium', 'high'].includes(signal.level), true);
  }
});
