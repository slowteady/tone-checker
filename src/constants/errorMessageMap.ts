export const ERROR_MESSAGE_MAP = {
  METHOD_NOT_ALLOWED: '허용되지 않은 요청이에요.',
  INVALID_JSON: '요청 형식이 올바르지 않아요. 다시 시도해 주세요.',
  INVALID_INPUT: '입력값이 올바르지 않아요. 다시 확인해 주세요.',
  TEXT_TOO_SHORT: '문장을 20자 이상 입력해 주세요.',
  TEXT_TOO_LONG: '문장을 800자 이하로 줄여 주세요.',
  OPENAI_KEY_MISSING: '분석 설정이 준비되지 않았어요. 잠시 후 다시 시도해 주세요.',
  CONFIG_MISSING: '서버 설정 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
  ANALYSIS_FAILED: '분석에 실패했어요. 잠시 후 다시 시도해 주세요.',
  USAGE_DEDUCT_FAILED: '이용 가능 횟수 처리에 실패했어요. 잠시 후 다시 시도해 주세요.',
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGE_MAP;

export function getErrorMessage(code: string, fallback?: string) {
  return (
    (ERROR_MESSAGE_MAP as Record<string, string>)[code] ?? fallback ?? '오류가 발생했어요. 잠시 후 다시 시도해 주세요.'
  );
}
