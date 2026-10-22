// 100m 한 조 레이스 (PLAN.md 5.2)

import { DEFAULT_CONFIG, type EngineConfig } from './config.ts';
import { distanceAt, sampleTrajectory, timeToDistance, type TrajectoryPoint } from './kinematics.ts';
import { fork, type Rng } from './rng.ts';
import type { Player } from './types.ts';

/** 데이터 영역: players.json 에서 온 값 */
export interface RacerBase {
  vmax: number;
  tau: number;
  sigmaScale: number;
}

/** 게임 영역: 레이스마다 게임 규칙으로 샘플링한 값 */
export interface RacerDraw {
  /** 출발 반응 시간 [s] */
  rt: number;
  /** 이번 레이스의 vmax = base.vmax + N(0, SIGMA_VMAX × sigmaScale) */
  vmax: number;
  /** 이번 레이스의 τ = base.tau + N(0, SIGMA_TAU) */
  tau: number;
}

export interface RaceEntrant {
  player: Player;
  lane: number;
}

export interface Race100Runner {
  playerId: number;
  lane: number;
  base: RacerBase;
  draw: RacerDraw;
  status: 'OK' | 'DQ';
  /** 공식 기록 (반응 시간 포함) [s]. DQ 면 null */
  time: number | null;
  /** 거리[m] → 통과 시각 (반응 시간 포함) [s] */
  splits: Record<number, number> | null;
  trajectory: TrajectoryPoint[];
  /** 1부터. DQ 면 null */
  place: number | null;
}

export interface Race100Result {
  key: string;
  /** 조 전체에 같은 값 [m/s], + 가 뒷바람 */
  wind: number;
  /** false 면 풍속 초과 — 게임 내 기록으로 인정하지 않음 */
  windLegal: boolean;
  /** 순위 순, DQ 는 레인 순으로 맨 뒤 */
  runners: Race100Runner[];
}

export function racerBase(p: Player): RacerBase {
  return { vmax: p.vmax, tau: p.tau, sigmaScale: p.sigmaScale };
}

/** 선수 한 명의 레이스 기복과 반응 시간 샘플링 (계주에서도 사용) */
export function drawRacer(base: RacerBase, rng: Rng, cfg: EngineConfig): RacerDraw {
  const vmax = base.vmax + rng.normal(0, cfg.SIGMA_VMAX * base.sigmaScale);
  const tau = Math.max(cfg.TAU_RACE_MIN, base.tau + rng.normal(0, cfg.SIGMA_TAU));
  const rt = Math.max(cfg.RT_MIN, rng.normal(cfg.RT_MEAN, cfg.RT_SD));
  return { rt, vmax, tau };
}

export function isFalseStart(rt: number, cfg: EngineConfig): boolean {
  return rt < cfg.FALSE_START_RT;
}

export function drawWind(rng: Rng, cfg: EngineConfig): number {
  const w = rng.normal(cfg.WIND_MEAN, cfg.WIND_SD);
  return Math.min(cfg.WIND_MAX, Math.max(cfg.WIND_MIN, w));
}

/** 기대 기록: 평균 반응 시간 + 기복·바람 없는 100m (조 편성·엔트리 선발용) */
export function expectedTime100(p: Player, cfg: EngineConfig = DEFAULT_CONFIG): number {
  return cfg.RT_MEAN + timeToDistance(cfg.RACE_DISTANCE_M, { vmax: p.vmax, tau: p.tau }, cfg.TIME_TOLERANCE);
}

/** 표시용 기록 문자열. 실제 육상처럼 표시 단위로 올림 (11.861 → "11.87") */
export function formatTime(t: number, cfg: EngineConfig = DEFAULT_CONFIG): string {
  const r = cfg.DISPLAY_RESOLUTION;
  const digits = Math.max(0, Math.round(-Math.log10(r)));
  return (Math.ceil(t / r - 1e-9) * r).toFixed(digits);
}

/**
 * 기록 순 정렬 → 순위. RANK_RESOLUTION 단위로 같으면 rng 로 결정.
 * 반환: items 와 같은 길이의 순위 배열 (time 이 null 이면 null).
 */
export function rankByTime<T>(
  items: readonly T[],
  timeOf: (item: T) => number | null,
  rng: Rng,
  cfg: EngineConfig,
): (number | null)[] {
  const keyed = items.map((item, i) => {
    const t = timeOf(item);
    return { i, t: t === null ? null : Math.round(t / cfg.RANK_RESOLUTION), tie: rng.next() };
  });
  const finished = keyed.filter((k) => k.t !== null) as { i: number; t: number; tie: number }[];
  finished.sort((a, b) => a.t - b.t || a.tie - b.tie);
  const places: (number | null)[] = items.map(() => null);
  finished.forEach((k, rank) => (places[k.i] = rank + 1));
  return places;
}

/**
 * 100m 한 조.
 * 난수 스트림: 바람 = fork(seed, `${key}/wind`), 선수 = fork(seed, `${key}/p${id}`),
 * 동률 = fork(seed, `${key}/tiebreak`). 선수별 기록은 같은 조의 다른 선수나 레인 순서와 무관하다
 * (0.001초 동률 판정만 입력 순서의 영향을 받는다).
 */
export function runRace100(
  entrants: readonly RaceEntrant[],
  seed: number,
  key: string,
  cfg: EngineConfig = DEFAULT_CONFIG,
): Race100Result {
  const wind = drawWind(fork(seed, `${key}/wind`), cfg);
  const windFactor = 1 - cfg.WIND_K * wind; // 주행 시간 배수 (반응 시간에는 적용하지 않음)
  const D = cfg.RACE_DISTANCE_M;

  const runners: Race100Runner[] = entrants.map(({ player, lane }) => {
    const base = racerBase(player);
    const draw = drawRacer(base, fork(seed, `${key}/p${player.id}`), cfg);
    if (isFalseStart(draw.rt, cfg)) {
      return { playerId: player.id, lane, base, draw, status: 'DQ', time: null, splits: null, trajectory: [], place: null };
    }
    const params = { vmax: draw.vmax, tau: draw.tau };
    const at = (d: number) => draw.rt + timeToDistance(d, params, cfg.TIME_TOLERANCE) * windFactor;
    const time = at(D);
    const splits: Record<number, number> = {};
    for (const d of cfg.SPLIT_DISTANCES_M) if (d < D) splits[d] = at(d);
    const xAt = (t: number) => (t <= draw.rt ? 0 : distanceAt((t - draw.rt) / windFactor, params));
    const trajectory = sampleTrajectory(xAt, time, D, cfg.TRAJECTORY_DT);
    return { playerId: player.id, lane, base, draw, status: 'OK', time, splits, trajectory, place: null };
  });

  const places = rankByTime(runners, (r) => r.time, fork(seed, `${key}/tiebreak`), cfg);
  runners.forEach((r, i) => (r.place = places[i] ?? null));
  runners.sort((a, b) => (a.place ?? Infinity) - (b.place ?? Infinity) || a.lane - b.lane);

  return { key, wind, windLegal: wind <= cfg.WIND_LEGAL_MAX, runners };
}
