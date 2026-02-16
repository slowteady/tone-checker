/**
 * analyze-tone v2 단위 테스트
 *
 * TDD 사이클로 개발:
 * RED → GREEN → REFACTOR
 */

import { assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { isMode, isScenario, isTone, SCENARIO_LABEL, TONE_LABEL } from '../index.ts';

/**
 * 1단계: 타입 가드 함수 테스트
 */

// isMode() 테스트
Deno.test('isMode - valid generate 값 검증', () => {
  const result = isMode('generate');
  assertEquals(result, true);
});

Deno.test('isMode - valid correct 값 검증', () => {
  const result = isMode('correct');
  assertEquals(result, true);
});

Deno.test('isMode - invalid 값 거부', () => {
  const result = isMode('invalid');
  assertEquals(result, false);
});

Deno.test('isMode - null/undefined 거부', () => {
  assertEquals(isMode(null), false);
  assertEquals(isMode(undefined), false);
});

// isScenario() 테스트
Deno.test('isScenario - valid to_child 값 검증', () => {
  assertEquals(isScenario('to_child'), true);
});

Deno.test('isScenario - valid to_parent 값 검증', () => {
  assertEquals(isScenario('to_parent'), true);
});

Deno.test('isScenario - valid boss 값 검증', () => {
  assertEquals(isScenario('boss'), true);
});

Deno.test('isScenario - valid colleague 값 검증', () => {
  assertEquals(isScenario('colleague'), true);
});

Deno.test('isScenario - valid client 값 검증', () => {
  assertEquals(isScenario('client'), true);
});

Deno.test('isScenario - valid friend 값 검증', () => {
  assertEquals(isScenario('friend'), true);
});

Deno.test('isScenario - valid partner 값 검증', () => {
  assertEquals(isScenario('partner'), true);
});

Deno.test('isScenario - invalid 값 거부', () => {
  assertEquals(isScenario('invalid'), false);
});

Deno.test('isScenario - null/undefined 거부', () => {
  assertEquals(isScenario(null), false);
  assertEquals(isScenario(undefined), false);
});

// isTone() 테스트
Deno.test('isTone - valid soft 값 검증', () => {
  assertEquals(isTone('soft'), true);
});

Deno.test('isTone - valid firm 값 검증', () => {
  assertEquals(isTone('firm'), true);
});

Deno.test('isTone - valid formal 값 검증', () => {
  assertEquals(isTone('formal'), true);
});

Deno.test('isTone - valid casual 값 검증', () => {
  assertEquals(isTone('casual'), true);
});

Deno.test('isTone - invalid 값 거부', () => {
  assertEquals(isTone('invalid'), false);
});

Deno.test('isTone - null/undefined 거부', () => {
  assertEquals(isTone(null), false);
  assertEquals(isTone(undefined), false);
});

// SCENARIO_LABEL 테스트
Deno.test('SCENARIO_LABEL - 모든 Scenario 값에 대한 label 존재', () => {
  const scenarios: Array<keyof typeof SCENARIO_LABEL> = [
    'to_child',
    'to_parent',
    'boss',
    'colleague',
    'client',
    'friend',
    'partner',
  ];

  scenarios.forEach((scenario) => {
    assertEquals(typeof SCENARIO_LABEL[scenario], 'string');
    assertEquals(SCENARIO_LABEL[scenario].length > 0, true);
  });
});

// TONE_LABEL 테스트
Deno.test('TONE_LABEL - 모든 Tone 값에 대한 label 존재', () => {
  const tones: Array<keyof typeof TONE_LABEL> = ['soft', 'firm', 'formal', 'casual'];

  tones.forEach((tone) => {
    assertEquals(typeof TONE_LABEL[tone], 'string');
    assertEquals(TONE_LABEL[tone].length > 0, true);
  });
});

/**
 * 2단계: 시스템 프롬프트 테스트
 */

// systemGenerate 프롬프트 테스트
Deno.test('systemGenerate - 프롬프트가 존재하고 문자열임', async () => {
  const { SYSTEM_GENERATE } = await import('../lib/systemGenerate.ts');

  assertEquals(typeof SYSTEM_GENERATE, 'string');
  assertEquals(SYSTEM_GENERATE.length > 0, true);
});

Deno.test('systemGenerate - 생성 모드 키워드 포함', async () => {
  const { SYSTEM_GENERATE } = await import('../lib/systemGenerate.ts');

  // 생성 모드 프롬프트는 "메시지 3개" 키워드를 포함해야 함
  assertEquals(SYSTEM_GENERATE.includes('메시지 3개'), true);
});

// systemCorrect 프롬프트 테스트
Deno.test('systemCorrect - 프롬프트가 존재하고 문자열임', async () => {
  const { SYSTEM_CORRECT } = await import('../lib/systemCorrect.ts');

  assertEquals(typeof SYSTEM_CORRECT, 'string');
  assertEquals(SYSTEM_CORRECT.length > 0, true);
});

Deno.test('systemCorrect - 교정 모드 키워드 포함', async () => {
  const { SYSTEM_CORRECT } = await import('../lib/systemCorrect.ts');

  // 교정 모드 프롬프트는 "톤 분석" 또는 "점수" 키워드를 포함해야 함
  const hasAnalysisKeyword =
    SYSTEM_CORRECT.includes('톤') || SYSTEM_CORRECT.includes('점수') || SYSTEM_CORRECT.includes('분석');

  assertEquals(hasAnalysisKeyword, true);
});

/**
 * 3단계: JSON Schema 테스트
 */

// SCHEMA_GENERATE 테스트
Deno.test('SCHEMA_GENERATE - 스키마가 존재하고 객체임', async () => {
  const { SCHEMA_GENERATE } = await import('../lib/jsonSchemaGenerate.ts');

  assertEquals(typeof SCHEMA_GENERATE, 'object');
  assertEquals(SCHEMA_GENERATE !== null, true);
});

Deno.test('SCHEMA_GENERATE - messages 필드 정의 존재', async () => {
  const { SCHEMA_GENERATE } = await import('../lib/jsonSchemaGenerate.ts');

  // messages 필드가 properties에 정의되어 있어야 함
  assertEquals('properties' in SCHEMA_GENERATE, true);
  assertEquals('messages' in (SCHEMA_GENERATE as { properties: Record<string, unknown> }).properties, true);
});

// SCHEMA_CORRECT 테스트
Deno.test('SCHEMA_CORRECT - 스키마가 존재하고 객체임', async () => {
  const { SCHEMA_CORRECT } = await import('../lib/jsonSchemaCorrect.ts');

  assertEquals(typeof SCHEMA_CORRECT, 'object');
  assertEquals(SCHEMA_CORRECT !== null, true);
});

Deno.test('SCHEMA_CORRECT - diagnosis와 corrections 필드 정의 존재', async () => {
  const { SCHEMA_CORRECT } = await import('../lib/jsonSchemaCorrect.ts');

  // diagnosis, corrections 필드가 properties에 정의되어 있어야 함
  assertEquals('properties' in SCHEMA_CORRECT, true);
  const props = (SCHEMA_CORRECT as { properties: Record<string, unknown> }).properties;
  assertEquals('diagnosis' in props, true);
  assertEquals('corrections' in props, true);
});

/**
 * 4단계: Zod 스키마 테스트
 */

// GenerateResultZod 테스트
Deno.test('GenerateResultZod - 스키마가 존재하고 parse 함수 제공', async () => {
  const { GenerateResultZod } = await import('../lib/zodGenerate.ts');

  assertEquals(typeof GenerateResultZod, 'object');
  assertEquals(typeof GenerateResultZod.parse, 'function');
  assertEquals(typeof GenerateResultZod.safeParse, 'function');
});

Deno.test('GenerateResultZod - 올바른 데이터 검증 성공', async () => {
  const { GenerateResultZod } = await import('../lib/zodGenerate.ts');

  const validData = {
    messages: [
      { label: '부드러운 표현', text: '내일 연차 사용해도 괜찮을까요?' },
      { label: '격식 있는 표현', text: '내일 연차를 사용하고자 합니다.' },
      { label: '친근한 표현', text: '내일 쉬려고 하는데 괜찮을까요?' },
    ],
  };

  const result = GenerateResultZod.safeParse(validData);
  assertEquals(result.success, true);
});

Deno.test('GenerateResultZod - messages 개수 부족 시 검증 실패', async () => {
  const { GenerateResultZod } = await import('../lib/zodGenerate.ts');

  const invalidData = {
    messages: [{ label: '부드러운 표현', text: '내일 연차 사용해도 괜찮을까요?' }],
  };

  const result = GenerateResultZod.safeParse(invalidData);
  assertEquals(result.success, false);
});

// CorrectResultZod 테스트
Deno.test('CorrectResultZod - 스키마가 존재하고 parse 함수 제공', async () => {
  const { CorrectResultZod } = await import('../lib/zodCorrect.ts');

  assertEquals(typeof CorrectResultZod, 'object');
  assertEquals(typeof CorrectResultZod.parse, 'function');
  assertEquals(typeof CorrectResultZod.safeParse, 'function');
});

Deno.test('CorrectResultZod - diagnosis 필드 필수', async () => {
  const { CorrectResultZod } = await import('../lib/zodCorrect.ts');

  const invalidData = {
    // diagnosis 누락
    corrections: [
      { label: '부드러운 표현', description: '상대방의 감정을 배려하는 표현', text: '내일 연차 사용해도 괜찮을까요?' },
      { label: '격식 있는 표현', description: '격식을 갖춰 존중을 표현', text: '내일 연차를 사용하고자 합니다.' },
      { label: '친근한 표현', description: '부담 없이 편안하게 표현', text: '내일 쉬려고 하는데 괜찮을까요?' },
    ],
    overall_score: 75,
    summary: '전반적으로 적절한 표현이에요.',
    category_scores: {} as any,
    signals: [],
    warnings: [],
  };

  const result = CorrectResultZod.safeParse(invalidData);
  assertEquals(result.success, false);
});

/**
 * 7단계: OpenAI 호출 함수 테스트
 */

// analyzeGenerate() 함수 테스트
Deno.test('analyzeGenerate - 함수가 존재함', async () => {
  const { analyzeGenerate } = await import('../lib/openai.ts');

  assertEquals(typeof analyzeGenerate, 'function');
});

// analyzeCorrect() 함수 테스트
Deno.test('analyzeCorrect - 함수가 존재함', async () => {
  const { analyzeCorrect } = await import('../lib/openai.ts');

  assertEquals(typeof analyzeCorrect, 'function');
});
