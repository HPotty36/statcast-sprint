// 운동 모델 (PLAN.md 5.1). pipeline/model.py 와 같은 식.
//   정지 출발  (v0 = 0): v(t) = vmax(1 − e^(−t/τ)),            d(t) = vmax(t − τ(1 − e^(−t/τ)))
//   플라잉 출발 (v0 > 0): v(t) = vmax − (vmax − v0)e^(−t/τ),   d(t) = vmax·t − (vmax − v0)τ(1 − e^(−t/τ))

import { DEFAULT_CONFIG } from './config.ts';

export interface RunParams {
  /** 최고 속도 [m/s] */
  vmax: number;
  /** 가속 시간 상수 [s] */
  tau: number;
  /** 진입 속도 [m/s], 생략하면 정지 출발 */
  v0?: number;
}

export function velocityAt(t: number, p: RunParams): number {
  const v0 = p.v0 ?? 0;
  return p.vmax - (p.vmax - v0) * Math.exp(-t / p.tau);
}

export function distanceAt(t: number, p: RunParams): number {
  const v0 = p.v0 ?? 0;
  return p.vmax * t - (p.vmax - v0) * p.tau * -Math.expm1(-t / p.tau);
}

export interface TrajectoryPoint {
  /** 출발 신호부터의 시간 [s] */
  t: number;
  /** 위치 [m] */
  x: number;
}

/** 애니메이션용 궤적: 0 부터 dt 간격으로 xAt(t) 를 찍고, 마지막에 (endTime, endX) 를 정확히 넣는다. */
export function sampleTrajectory(
  xAt: (t: number) => number,
  endTime: number,
  endX: number,
  dt: number,
): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  const steps = Math.ceil(endTime / dt - 1e-9);
  for (let i = 0; i < steps; i++) {
    const t = i * dt;
    points.push({ t, x: Math.min(xAt(t), endX) });
  }
  points.push({ t: endTime, x: endX });
  return points;
}

/**
 * distanceAt(t) = distance 인 t (이분법).
 * v ≤ vmax 이므로 t ≥ d/vmax, d(t) ≥ vmax(t − τ) 이므로 t ≤ d/vmax + τ — 이 구간에서 시작한다.
 */
export function timeToDistance(distance: number, p: RunParams, tol = DEFAULT_CONFIG.TIME_TOLERANCE): number {
  if (distance <= 0) return 0;
  let lo = distance / p.vmax;
  let hi = distance / p.vmax + p.tau;
  while (hi - lo > tol) {
    const mid = (lo + hi) / 2;
    if (distanceAt(mid, p) < distance) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
