const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 25;

type Entry = { count: number; windowStart: number };

const store = new Map<string, Entry>();

export function checkLoginRateLimit(clientKey: string): boolean {
  const key = clientKey || "unknown";
  const now = Date.now();
  let e = store.get(key);
  if (!e || now - e.windowStart > WINDOW_MS) {
    e = { count: 1, windowStart: now };
    store.set(key, e);
    return true;
  }
  e.count += 1;
  return e.count <= MAX_ATTEMPTS;
}
