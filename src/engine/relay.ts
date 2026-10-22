// 4×100m 계주 한 조 (PLAN.md 5.3)
//   1번 주자: 100m 와 같은 정지 출발 (반응 시간, 부정출발 포함)
//   2~4번 주자: 플라잉 출발. 진입 속도 = ENTRY × (받는 주자의 레이스 vmax)
//   바통 터치(1→2, 2→3, 3→4)마다 safe / aggressive 선택, 실패하면 DNF
//   곡선 주로와 풍속은 모델링하지 않는다.

import { DEFAULT_CONFIG, type EngineConfig } from './config.ts';
import { distanceAt, sampleTrajectory, timeToDistance, type RunParams, type TrajectoryPoint } from './kinematics.ts';
import { drawRacer, isFalseStart, racerBase, rankByTime, type RacerBase, type RacerDraw } from './race100.ts';
import { fork } from './rng.ts';
import type { Player } from './types.ts';

export type Handoff = 'safe' | 'aggressive';

export interface RelayTeamEntry {
  teamId: string;
  lane: number;
  /** 주자 순서대로 RELAY_LEGS 명 */
  runners: readonly Player[];
  /** 바통 터치 RELAY_LEGS − 1 개. handoffs[i] = (i+1)번 → (i+2)번 주자 */
  handoffs: readonly Handoff[];
}

/** 레인이 정해지기 전의 계주 팀 (대표단의 주자 순서 + 바통 터치 선택) */
export type RelaySquad = Omit<RelayTeamEntry, 'lane'>;

export interface RelayLeg {
  leg: number; // 1부터
  playerId: number;
  base: RacerBase;
  /** 반응 시간(draw.rt)은 1구간에서만 쓴다 */
  draw: RacerDraw;
  /** 이 주자가 받은 바통 터치 방식 (1구간은 null) */
  handoffIn: Handoff | null;
  /** 구간 진입 속도 [m/s] (1구간은 0) */
  entrySpeed: number;
  /** 구간 기록 [s] (1구간은 반응 시간 포함). 달리지 못한 구간은 null */
  legTime: number | null;
  /** 이 구간 끝까지의 누적 기록 [s] */
  cumulative: number | null;
}

export interface RelayTeamResult {
  teamId: string;
  lane: number;
  status: 'OK' | 'DQ' | 'DNF';
  legs: RelayLeg[];
  /** 팀 기록 = 구간 기록의 합 [s] */
  time: number | null;
  /** 바통을 놓친 터치 번호 (1 = 1→2번). 없으면 null */
  failedExchange: number | null;
  /** 바통 위치 궤적 (0 ~ 400m, DNF 면 놓친 지점까지) */
  trajectory: TrajectoryPoint[];
  place: number | null;
}

export interface RelayResult {
  key: string;
  /** 순위 순, DQ/DNF 는 레인 순으로 맨 뒤 */
  teams: RelayTeamResult[];
}

function failProbability(h: Handoff, cfg: EngineConfig): number {
  return h === 'aggressive' ? cfg.FAIL_AGGR : cfg.FAIL_SAFE;
}

function entryRatio(h: Handoff, cfg: EngineConfig): number {
  return h === 'aggressive' ? cfg.ENTRY_AGGR : cfg.ENTRY_SAFE;
}

/** 기본 오더: 1번 = τ 최소(가속형), 4번 = vmax 최대, 나머지는 vmax 내림차순 (PLAN.md 6.1) */
export function defaultRelayOrder(players: readonly Player[]): Player[] {
  if (players.length < 2) return [...players];
  const first = players.reduce((a, b) => (b.tau < a.tau || (b.tau === a.tau && b.id < a.id) ? b : a));
  const rest = players.filter((p) => p !== first).sort((a, b) => b.vmax - a.vmax || a.id - b.id);
  const anchor = rest.shift()!;
  return [first, ...rest, anchor];
}

/** 기대 팀 기록: 기복·실패 없이, 1번 주자는 평균 반응 시간 (계주 출전 선발·조 편성용) */
export function expectedRelayTime(squad: RelaySquad, cfg: EngineConfig = DEFAULT_CONFIG): number {
  return squad.runners.reduce((sum, p, i) => {
    const handoff = i === 0 ? null : squad.handoffs[i - 1]!;
    const v0 = handoff === null ? 0 : entryRatio(handoff, cfg) * p.vmax;
    const delay = i === 0 ? cfg.RT_MEAN : 0;
    return sum + delay + timeToDistance(cfg.RELAY_LEG_M, { vmax: p.vmax, tau: p.tau, v0 }, cfg.TIME_TOLERANCE);
  }, 0);
}

function runTeam(entry: RelayTeamEntry, seed: number, key: string, cfg: EngineConfig): RelayTeamResult {
  const { teamId, lane, runners, handoffs } = entry;
  if (runners.length !== cfg.RELAY_LEGS || handoffs.length !== cfg.RELAY_LEGS - 1) {
    throw new Error(`${teamId}: 주자 ${cfg.RELAY_LEGS}명, 바통 터치 ${cfg.RELAY_LEGS - 1}개가 필요함`);
  }
  const L = cfg.RELAY_LEG_M;
  const legs: RelayLeg[] = [];
  const segments: { start: number; params: RunParams; offset: number }[] = [];
  let status: RelayTeamResult['status'] = 'OK';
  let failedExchange: number | null = null;
  let clock = 0;

  for (let i = 0; i < runners.length; i++) {
    const player = runners[i]!;
    const base = racerBase(player);
    const draw = drawRacer(base, fork(seed, `${key}/${teamId}/leg${i + 1}/p${player.id}`), cfg);
    const handoffIn = i === 0 ? null : handoffs[i - 1]!;
    const entrySpeed = handoffIn === null ? 0 : entryRatio(handoffIn, cfg) * draw.vmax;
    const leg: RelayLeg = { leg: i + 1, playerId: player.id, base, draw, handoffIn, entrySpeed, legTime: null, cumulative: null };
    legs.push(leg);
    if (status !== 'OK') continue;

    if (i === 0 && isFalseStart(draw.rt, cfg)) {
      status = 'DQ';
      continue;
    }
    if (handoffIn !== null && fork(seed, `${key}/${teamId}/x${i}`).next() < failProbability(handoffIn, cfg)) {
      status = 'DNF';
      failedExchange = i;
      continue;
    }
    const params: RunParams = { vmax: draw.vmax, tau: draw.tau, v0: entrySpeed };
    const delay = i === 0 ? draw.rt : 0;
    leg.legTime = delay + timeToDistance(L, params, cfg.TIME_TOLERANCE);
    segments.push({ start: clock + delay, params, offset: i * L });
    clock += leg.legTime;
    leg.cumulative = clock;
  }

  const time = status === 'OK' ? legs.reduce((s, l) => s + (l.legTime ?? 0), 0) : null;
  const endX = segments.length * L;
  const xAt = (t: number) => {
    for (let s = segments.length - 1; s >= 0; s--) {
      const seg = segments[s]!;
      if (t >= seg.start) return seg.offset + distanceAt(t - seg.start, seg.params);
    }
    return 0;
  };
  const trajectory = segments.length ? sampleTrajectory(xAt, clock, endX, cfg.TRAJECTORY_DT) : [];
  return { teamId, lane, status, legs, time, failedExchange, trajectory, place: null };
}

/**
 * 4×100m 한 조.
 * 난수 스트림: 주자 = fork(seed, `${key}/${teamId}/leg${n}/p${id}`), 바통 터치 = fork(seed, `${key}/${teamId}/x${n}`),
 * 동률 = fork(seed, `${key}/tiebreak`).
 */
export function runRelay(
  teams: readonly RelayTeamEntry[],
  seed: number,
  key: string,
  cfg: EngineConfig = DEFAULT_CONFIG,
): RelayResult {
  const results = teams.map((t) => runTeam(t, seed, key, cfg));
  const places = rankByTime(results, (r) => r.time, fork(seed, `${key}/tiebreak`), cfg);
  results.forEach((r, i) => (r.place = places[i] ?? null));
  results.sort((a, b) => (a.place ?? Infinity) - (b.place ?? Infinity) || a.lane - b.lane);
  return { key, teams: results };
}
