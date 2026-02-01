import * as Sentry from '@sentry/react-native';

/**
 * 에러 심각도 레벨
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'log';

/**
 * 에러 컨텍스트 정보
 */
export interface ErrorContext {
  location?: string;
  extras?: Record<string, unknown>;
  user?: {
    id?: string;
    deviceId?: string;
  };
  tags?: Record<string, string>;
}

/**
 * Sentry에 에러를 캡쳐하고 로그를 남깁니다.
 */
export function captureError(error: unknown, context?: ErrorContext, severity: ErrorSeverity = 'error'): void {
  if (__DEV__) {
    console.error(`[${severity.toUpperCase()}]`, context?.location || 'Unknown', error);
    if (context?.extras) {
      console.error('Context:', context.extras);
    }
    return;
  }

  Sentry.withScope((scope) => {
    scope.setLevel(severity);

    if (context?.location) {
      scope.setTag('location', context.location);
    }

    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.user) {
      scope.setUser(context.user);
    }

    if (context?.extras) {
      scope.setExtras(context.extras);
    }

    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(String(error), severity);
    }
  });
}

/**
 * 메시지를 Sentry에 기록합니다.
 */
export function captureMessage(message: string, severity: ErrorSeverity = 'info', context?: ErrorContext): void {
  if (__DEV__) {
    console.log(`[${severity.toUpperCase()}]`, message);
    return;
  }

  Sentry.withScope((scope) => {
    scope.setLevel(severity);

    if (context?.location) {
      scope.setTag('location', context.location);
    }

    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.extras) {
      scope.setExtras(context.extras);
    }

    Sentry.captureMessage(message, severity);
  });
}

/**
 * Breadcrumb를 추가합니다.
 */
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: ErrorSeverity;
  data?: Record<string, unknown>;
}): void {
  if (__DEV__) {
    console.log('[BREADCRUMB]', breadcrumb.message, breadcrumb.data);
    return;
  }

  Sentry.addBreadcrumb({
    message: breadcrumb.message,
    category: breadcrumb.category || 'custom',
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
  });
}

/**
 * 사용자 정보를 설정합니다.
 */
export function setUser(user: { id?: string; deviceId?: string; [key: string]: unknown }): void {
  if (__DEV__) return;
  Sentry.setUser(user);
}

/**
 * 사용자 정보를 초기화합니다.
 */
export function clearUser(): void {
  if (__DEV__) return;
  Sentry.setUser(null);
}
