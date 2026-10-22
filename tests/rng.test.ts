import { describe, expect, it } from 'vitest';
import { createRng, fork, seedFromString } from '../src/engine/rng.ts';

const take = (n: number, f: () => number) => Array.from({ length: n }, f);

describe('rng', () => {
  it('같은 시드 → 같은 수열, 다른 시드 → 다른 수열', () => {
    const a = createRng(42);
    const b = createRng(42);
    const c = createRng(43);
    const sa = take(100, a.next);
    expect(take(100, b.next)).toEqual(sa);
    expect(take(100, c.next)).not.toEqual(sa);
  });

  it('next() 는 [0, 1)', () => {
    const r = createRng(1);
    for (const x of take(100_000, r.next)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('normal(): 평균·표준편차가 맞는다', () => {
    const r = createRng(7);
    const xs = take(200_000, () => r.normal(0.17, 0.022));
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length);
    expect(mean).toBeCloseTo(0.17, 3);
    expect(sd).toBeCloseTo(0.022, 3);
  });

  it('fork(key) 는 부모 스트림의 소비 상태와 무관하다', () => {
    const parent = createRng(99);
    const before = take(10, parent.fork('heat-1').next);
    take(1000, parent.next);
    expect(take(10, parent.fork('heat-1').next)).toEqual(before);
    expect(take(10, fork(99, 'heat-1').next)).toEqual(before);
    expect(take(10, fork(99, 'heat-2').next)).not.toEqual(before);
  });

  it('seedFromString: 숫자 문자열은 그 값, 그 외는 해시', () => {
    expect(seedFromString('12345')).toBe(12345);
    expect(seedFromString('hello')).toBe(seedFromString('hello'));
    expect(seedFromString('hello')).not.toBe(seedFromString('hellp'));
  });
});
