export const ERROR_MESSAGE_MAP = {
  METHOD_NOT_ALLOWED: '허용되지 않은 요청 방식이에요.',
  INVALID_JSON: '요청 형식이 올바르지 않아요. 다시 시도해 주세요.',
  INVALID_INPUT: '입력값이 올바르지 않아요. 다시 확인해 주세요.',
  TEXT_TOO_SHORT: '문장을 20자 이상 입력해 주세요.',
  TEXT_TOO_LONG: '문장을 800자 이하로 줄여 주세요.',
  CONFIG_MISSING: '서버 설정 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
  OPENAI_IMPORT_FAILED: '분석 설정이 준비되지 않았어요. 잠시 후 다시 시도해 주세요.',
  ANALYSIS_REFUSED: '민감한 내용은 분석할 수 없어요. 문장을 바꿔서 다시 시도해 주세요.',
  ANALYSIS_FAILED: '분석에 실패했어요. 잠시 후 다시 시도해 주세요.',
  USAGE_LIMIT_EXCEEDED: '오늘 사용 가능 횟수를 모두 사용했어요.',
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGE_MAP;

export function getErrorMessage(code: string, fallback?: string) {
  return (
    (ERROR_MESSAGE_MAP as Record<string, string>)[code] ?? fallback ?? '오류가 발생했어요. 잠시 후 다시 시도해 주세요.'
  );
}
