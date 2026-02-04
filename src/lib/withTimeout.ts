export function withTimeout<T>(p: Promise<T>, ms: number): Promise<{ ok: true; value: T } | { ok: false }> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve({ ok: false }), ms);
    p.then((value) => {
      clearTimeout(t);
      resolve({ ok: true, value });
    }).catch(() => {
      clearTimeout(t);
      resolve({ ok: false });
    });
  });
}
