const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_KEY = 5;

type Entry = { count: number; windowStart: number };

const store = new Map<string, Entry>();

export function checkForgotPasswordRateLimit(key: string): boolean {
  const k = key || "unknown";
  const now = Date.now();
  let e = store.get(k);
  if (!e || now - e.windowStart > WINDOW_MS) {
    store.set(k, { count: 1, windowStart: now });
    return true;
  }
  e.count += 1;
  return e.count <= MAX_PER_KEY;
}
