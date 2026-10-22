// 시드 기반 RNG (핵심 규칙 4). 엔진의 모든 난수는 여기서만 나온다.
//
// fork(key) 는 "현재 상태"가 아니라 "시드 + key" 로 하위 스트림을 만든다.
// → 조·선수별 스트림이 다른 스트림의 소비 순서와 무관하게 항상 같다.

export interface Rng {
  readonly seed: number;
  /** [0, 1) 균등분포 */
  next(): number;
  /** N(mean, sd) — Box-Muller */
  normal(mean?: number, sd?: number): number;
  /** [0, n) 정수 */
  int(n: number): number;
  /** 시드와 key 로 결정되는 독립 하위 스트림 */
  fork(key: string | number): Rng;
}

/** 32비트 시드를 섞어서 만든다 (murmur3 fmix32 + FNV-1a 문자열 해시). */
export function hashSeed(seed: number, key: string | number): number {
  let h = (seed ^ 0x811c9dc5) >>> 0;
  const s = String(key);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** URL 등에서 받은 문자열 시드를 32비트 정수로. 숫자 문자열은 그 값을 그대로 쓴다. */
export function seedFromString(s: string): number {
  const t = s.trim();
  if (/^\d+$/.test(t)) return Number(BigInt(t) % 4294967296n);
  return hashSeed(0, t);
}

export function createRng(seed: number): Rng {
  const base = seed >>> 0;
  let state = base;
  let spare: number | null = null;

  // mulberry32
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const standardNormal = (): number => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let u = 0;
    while (u === 0) u = next(); // log(0) 방지
    const v = next();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };

  return {
    seed: base,
    next,
    normal: (mean = 0, sd = 1) => mean + sd * standardNormal(),
    int: (n) => Math.floor(next() * n),
    fork: (key) => createRng(hashSeed(base, key)),
  };
}

export function fork(seed: number, key: string | number): Rng {
  return createRng(hashSeed(seed, key));
}
