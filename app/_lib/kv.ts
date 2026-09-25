/**
 * Upstash Redis over REST — the ONE place the social system talks to Redis.
 *
 * Uses the same env vars the Jobber token storage already uses
 * (KV_REST_API_URL / KV_REST_API_TOKEN, or the UPSTASH_* names), so nothing
 * new is needed in Vercel for storage.
 *
 * When those vars are missing (local dev, tests) it falls back to an
 * in-memory store so every flow can be exercised without a database. In
 * production a missing Redis is reported loudly by `kvStatus()` and the
 * Social tab shows it — it never silently loses data.
 */

type Cmd = (string | number)[];

function creds(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

export function kvConfigured(): boolean {
  return !!creds();
}

/* ---------------- in-memory fallback (dev/tests only) ---------------- */

type Mem = {
  str: Map<string, { v: string; exp: number | null }>;
  z: Map<string, Map<string, number>>;
};
const g = globalThis as unknown as { __usMem?: Mem };
const mem: Mem = g.__usMem ?? (g.__usMem = { str: new Map(), z: new Map() });

function memAlive(key: string) {
  const e = mem.str.get(key);
  if (!e) return null;
  if (e.exp !== null && e.exp < Date.now()) {
    mem.str.delete(key);
    return null;
  }
  return e;
}

function memRun(c: Cmd): unknown {
  const [op, ...a] = c.map(String);
  switch (op.toUpperCase()) {
    case 'GET':
      return memAlive(a[0])?.v ?? null;
    case 'SET': {
      const [k, v, ...opts] = a;
      const up = opts.map((o) => o.toUpperCase());
      if (up.includes('NX') && memAlive(k)) return null;
      const exIdx = up.indexOf('EX');
      const exp = exIdx >= 0 ? Date.now() + Number(opts[exIdx + 1]) * 1000 : null;
      mem.str.set(k, { v, exp });
      return 'OK';
    }
    case 'DEL':
      a.forEach((k) => {
        mem.str.delete(k);
        mem.z.delete(k);
      });
      return a.length;
    case 'MGET':
      return a.map((k) => memAlive(k)?.v ?? null);
    case 'INCR': {
      const cur = Number(memAlive(a[0])?.v ?? 0) + 1;
      const e = memAlive(a[0]);
      mem.str.set(a[0], { v: String(cur), exp: e?.exp ?? null });
      return cur;
    }
    case 'EXPIRE': {
      const e = memAlive(a[0]);
      if (e) e.exp = Date.now() + Number(a[1]) * 1000;
      return e ? 1 : 0;
    }
    case 'ZADD': {
      const z = mem.z.get(a[0]) ?? new Map();
      z.set(a[2], Number(a[1]));
      mem.z.set(a[0], z);
      return 1;
    }
    case 'ZREM': {
      const z = mem.z.get(a[0]);
      return z?.delete(a[1]) ? 1 : 0;
    }
    case 'ZRANGEBYSCORE': {
      const z = mem.z.get(a[0]) ?? new Map<string, number>();
      const min = a[1] === '-inf' ? -Infinity : Number(a[1]);
      const max = a[2] === '+inf' ? Infinity : Number(a[2]);
      return Array.from(z.entries())
        .filter(([, s]) => s >= min && s <= max)
        .sort((x, y) => x[1] - y[1])
        .map(([m]) => m);
    }
    case 'ZREVRANGE': {
      const z = mem.z.get(a[0]) ?? new Map<string, number>();
      const sorted = Array.from(z.entries()).sort((x, y) => y[1] - x[1]).map(([m]) => m);
      return sorted.slice(Number(a[1]), Number(a[2]) + 1);
    }
    default:
      throw new Error(`memory kv: unsupported ${op}`);
  }
}

/* ---------------- commands ---------------- */

export async function kv<T = unknown>(c: Cmd): Promise<T> {
  const cr = creds();
  if (!cr) return memRun(c) as T;
  const res = await fetch(cr.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cr.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(c),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as { result?: T; error?: string };
  if (!res.ok || data.error) throw new Error(`Redis: ${data.error ?? res.status}`);
  return data.result as T;
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const v = await kv<string | null>(['GET', key]);
  if (v == null) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

export async function setJSON(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const c: Cmd = ['SET', key, JSON.stringify(value)];
  if (ttlSeconds) c.push('EX', ttlSeconds);
  await kv(c);
}

/** Set only if the key doesn't exist. Returns true if this call set it. Used for locks + "only once" guards. */
export async function setOnce(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const r = await kv<string | null>(['SET', key, value, 'NX', 'EX', ttlSeconds]);
  return r === 'OK';
}

export async function del(...keys: string[]): Promise<void> {
  if (keys.length) await kv(['DEL', ...keys]);
}

export async function mgetJSON<T>(keys: string[]): Promise<(T | null)[]> {
  if (!keys.length) return [];
  const vals = await kv<(string | null)[]>(['MGET', ...keys]);
  return vals.map((v) => {
    if (v == null) return null;
    try {
      return JSON.parse(v) as T;
    } catch {
      return null;
    }
  });
}

export async function zadd(key: string, score: number, member: string): Promise<void> {
  await kv(['ZADD', key, score, member]);
}
export async function zrem(key: string, member: string): Promise<void> {
  await kv(['ZREM', key, member]);
}
export async function zrangeByScore(key: string, min: number | '-inf', max: number | '+inf'): Promise<string[]> {
  return kv<string[]>(['ZRANGEBYSCORE', key, min, max]);
}
export async function zrevrange(key: string, start: number, stop: number): Promise<string[]> {
  return kv<string[]>(['ZREVRANGE', key, start, stop]);
}
