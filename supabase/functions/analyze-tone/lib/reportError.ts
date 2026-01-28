export type ReportErrorExtra = Record<string, unknown>;

function toErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  try {
    return typeof err === 'string' ? err : JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * Error handling hub for Edge Function.
 * - Centralizes logging shape
 * - Future-proof spot for Sentry/Datadog integrations
 */
export function reportError(code: string, err?: unknown, extra?: ReportErrorExtra) {
  const payload = {
    code,
    message: err === undefined ? undefined : toErrorMessage(err),
    extra,
  };

  // Future: Sentry.captureException(err) or Sentry.captureMessage(...)
  console.error('[error]', payload);
}
