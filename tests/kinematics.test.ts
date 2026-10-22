import { describe, expect, it } from 'vitest';
import { distanceAt, sampleTrajectory, timeToDistance, velocityAt, type RunParams } from '../src/engine/kinematics.ts';

const FT = 0.3048;

/** v(t) 를 심프슨 공식으로 수치 적분 */
function integrate(p: RunParams, T: number, n = 4000): number {
  const h = T / n;
  let s = velocityAt(0, p) + velocityAt(T, p);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * velocityAt(i * h, p);
  return (s * h) / 3;
}

/** 뉴턴법으로 독립적으로 구한 역함수 (비교 기준) */
function newtonTime(d: number, p: RunParams): number {
  let t = d / p.vmax + p.tau / 2;
  for (let i = 0; i < 100; i++) t -= (distanceAt(t, p) - d) / velocityAt(t, p);
  return t;
}

describe('distanceAt (닫힌 해)', () => {
  const cases: [string, RunParams][] = [
    ['정지 출발', { vmax: 9.3, tau: 1.1 }],
    ['정지 출발, τ 큼', { vmax: 7.5, tau: 1.6 }],
    ['플라잉 출발', { vmax: 9.3, tau: 1.1, v0: 0.85 * 9.3 }],
    ['플라잉 출발, 낮은 진입', { vmax: 8.2, tau: 0.9, v0: 3 }],
  ];
  for (const [name, p] of cases) {
    it(`${name}: 수치 적분과 1e-6 이내로 일치`, () => {
      for (const T of [0.05, 0.5, 1.1, 3, 6, 12]) {
        expect(Math.abs(distanceAt(T, p) - integrate(p, T))).toBeLessThan(1e-6);
      }
    });
  }
});

describe('timeToDistance', () => {
  it('역산 오차 1e-6초 이하 (뉴턴법 기준값과 비교)', () => {
    for (const p of [{ vmax: 9.3, tau: 1.1 }, { vmax: 7.1, tau: 1.8 }, { vmax: 9.0, tau: 0.6, v0: 7.9 }]) {
      for (const d of [5, 27.432, 30, 60, 100]) {
        expect(Math.abs(timeToDistance(d, p) - newtonTime(d, p))).toBeLessThan(1e-6);
      }
    }
  });

  it('vmax 9.30, τ 1.1 → 100m 11.86초 ±0.01, 90ft 4.02초 ±0.01 (반응 제외)', () => {
    const p = { vmax: 9.3, tau: 1.1 };
    expect(Math.abs(timeToDistance(100, p) - 11.86)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(timeToDistance(90 * FT, p) - 4.02)).toBeLessThanOrEqual(0.01);
  });

  it('PLAN.md 4.4 참고 수치표와 ±0.01초 이내', () => {
    const table: [number, number, number | null, number][] = [
      // 스프린트 스피드 ft/s, 30m, 90ft, 100m
      [30.5, 4.31, 4.02, 11.86],
      [29.0, 4.48, null, 12.41],
      [27.0, 4.73, 4.41, 13.25],
      [25.0, 5.03, null, 14.22],
    ];
    for (const [ss, t30, t90, t100] of table) {
      const p = { vmax: ss * FT, tau: 1.1 };
      expect(Math.abs(timeToDistance(30, p) - t30)).toBeLessThanOrEqual(0.01);
      if (t90 !== null) expect(Math.abs(timeToDistance(90 * FT, p) - t90)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(timeToDistance(100, p) - t100)).toBeLessThanOrEqual(0.01);
    }
  });

  it('다른 조건이 같으면 vmax 가 높을수록 빠르다', () => {
    let prev = Infinity;
    for (let vmax = 6.5; vmax <= 9.6; vmax += 0.1) {
      const t = timeToDistance(100, { vmax, tau: 1.1 });
      expect(t).toBeLessThan(prev);
      prev = t;
    }
  });

  it('플라잉 출발은 정지 출발보다 빠르다', () => {
    expect(timeToDistance(100, { vmax: 9.3, tau: 1.1, v0: 7 })).toBeLessThan(timeToDistance(100, { vmax: 9.3, tau: 1.1 }));
  });
});

describe('sampleTrajectory', () => {
  it('dt 간격, 마지막 점은 정확히 (endTime, endX), 위치는 단조 증가', () => {
    const p = { vmax: 9.3, tau: 1.1 };
    const T = timeToDistance(100, p);
    const traj = sampleTrajectory((t) => distanceAt(t, p), T, 100, 0.05);
    expect(traj[1]!.t).toBeCloseTo(0.05, 12);
    expect(traj.at(-1)).toEqual({ t: T, x: 100 });
    for (let i = 1; i < traj.length; i++) expect(traj[i]!.x).toBeGreaterThanOrEqual(traj[i - 1]!.x);
    expect(traj.at(-1)!.t - traj.at(-2)!.t).toBeLessThanOrEqual(0.05 + 1e-9);
  });
});
