// 라운드 진행 (PLAN.md 6.2): 조 편성, 레인 배정, Q/q 진출, 결승 순위.
// 100m 와 계주가 같은 로직을 쓰도록 경쟁 단위(선수 / 계주 팀)에 대해 일반화했다.

import { DEFAULT_CONFIG, RULES, type EngineConfig, type EventFormat, type RoundFormat } from './config.ts';
import { expectedTime100, rankByTime, runRace100, type Race100Result } from './race100.ts';
import { expectedRelayTime, runRelay, type RelayResult, type RelaySquad } from './relay.ts';
import { fork, type Rng } from './rng.ts';
import type { Player } from './types.ts';

export type Mark = 'Q' | 'q';

/** 한 조 안에서 한 경쟁 단위의 결과 (DQ/DNF 는 place·time 이 null) */
export interface HeatOutcome {
  id: string;
  place: number | null;
  time: number | null;
}

export interface HeatResult<R> {
  index: number; // 1부터
  key: string;
  result: R;
  /** 다음 라운드 진출 표시 (결승은 비어 있음) */
  marks: Record<string, Mark>;
}

export interface RoundResult<R> {
  name: string;
  roundIndex: number; // format.rounds 의 인덱스
  heats: HeatResult<R>[];
  /** 다음 라운드 진출자 id (결승이면 빈 배열) */
  advancing: string[];
}

export interface EventResult<R> {
  rounds: RoundResult<R>[];
  /** 결승 1·2·3위 id (완주자가 적으면 더 짧다) */
  podium: string[];
}

/** 경쟁 단위에 대한 추상화: id, 기대 기록, 한 조 실행 */
export interface Competition<C, R> {
  idOf(c: C): string;
  expectedOf(c: C): number;
  runHeat(entries: { c: C; lane: number }[], heatKey: string): R;
  outcomesOf(result: R): HeatOutcome[];
}

/** 출전 인원이 적으면 정원이 인원 이상인 가장 늦은 라운드부터 (8명 이하 → 결승만, 24명 이하 → 준결승부터) */
export function startRoundIndex(format: EventFormat, n: number): number {
  for (let i = format.rounds.length - 1; i >= 0; i--) {
    const size = format.rounds[i]!.size;
    if (size !== undefined && size >= n) return i;
  }
  return 0;
}

export function heatCount(round: RoundFormat, n: number): number {
  const h = round.heats ?? Math.ceil(n / RULES.LANES);
  if (n > h * RULES.LANES) throw new Error(`${round.name}: ${n}명을 ${h}개 조(조당 ${RULES.LANES}명)에 넣을 수 없음`);
  return Math.min(h, n);
}

/** 기대 기록 순으로 정렬된 목록을 지그재그로 나눈다: 1→A, 2→B, 3→C, 4→C, 5→B, 6→A, … */
export function serpentine<T>(sorted: readonly T[], heats: number): T[][] {
  const out: T[][] = Array.from({ length: heats }, () => []);
  sorted.forEach((item, i) => {
    const block = Math.floor(i / heats);
    const pos = i % heats;
    out[block % 2 === 0 ? pos : heats - 1 - pos]!.push(item);
  });
  return out;
}

function shuffle<T>(xs: readonly T[], rng: Rng): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * 조 안의 시드 순서(0 = 최상위)대로 레인을 돌려준다 (표시용, 기록에는 영향 없음).
 * seeded: 시드 그룹별 추첨 (1~4 → 3~6번 …). 아니면 1~8번 무작위.
 */
export function drawLanes(count: number, seeded: boolean, rng: Rng): number[] {
  const all = Array.from({ length: RULES.LANES }, (_, i) => i + 1);
  const order = seeded ? RULES.SEEDED_LANE_GROUPS.flatMap((g) => shuffle(g, rng)) : shuffle(all, rng);
  return order.slice(0, count);
}

/**
 * 진출 판정. 조별 상위 Q명(기본 floor(N/H)) + 나머지 정원은 전체 기록 순(q).
 * 0.001초 동률은 rng 로 결정.
 */
export function qualify(
  heats: readonly (readonly HeatOutcome[])[],
  nextSize: number,
  qualifyPerHeat: number | undefined,
  rng: Rng,
  cfg: EngineConfig = DEFAULT_CONFIG,
): Map<string, Mark> {
  const Q = qualifyPerHeat ?? Math.floor(nextSize / heats.length);
  if (Q * heats.length > nextSize) throw new Error(`조별 통과 ${Q}명 × ${heats.length}개 조 > 정원 ${nextSize}`);
  const marks = new Map<string, Mark>();
  for (const heat of heats) {
    const finishers = heat.filter((o) => o.place !== null).sort((a, b) => a.place! - b.place!);
    for (const o of finishers.slice(0, Q)) marks.set(o.id, 'Q');
  }
  const rest = heats.flat().filter((o) => o.time !== null && !marks.has(o.id));
  const places = rankByTime(rest, (o) => o.time, rng, cfg);
  const byTime = rest.map((o, i) => ({ o, p: places[i]! })).sort((a, b) => a.p - b.p);
  for (const { o } of byTime.slice(0, Math.max(0, nextSize - marks.size))) marks.set(o.id, 'q');
  return marks;
}

/** 한 라운드 실행. participants 는 이 라운드 출전자 전체 */
export function runRound<C, R>(
  comp: Competition<C, R>,
  participants: readonly C[],
  format: EventFormat,
  roundIndex: number,
  seed: number,
  key: string,
  cfg: EngineConfig = DEFAULT_CONFIG,
): RoundResult<R> {
  const round = format.rounds[roundIndex]!;
  const next = format.rounds[roundIndex + 1];
  const roundKey = `${key}/r${roundIndex}`;
  const sorted = [...participants].sort(
    (a, b) => comp.expectedOf(a) - comp.expectedOf(b) || comp.idOf(a).localeCompare(comp.idOf(b)),
  );
  const groups = serpentine(sorted, heatCount(round, sorted.length));
  const laneRng = fork(seed, `${roundKey}/lanes`);
  const seeded = round.size !== undefined;

  const ran = groups.map((group, h) => {
    const lanes = drawLanes(group.length, seeded, laneRng);
    const heatKey = `${roundKey}/h${h + 1}`;
    const result = comp.runHeat(group.map((c, i) => ({ c, lane: lanes[i]! })), heatKey);
    return { heatKey, result, outcomes: comp.outcomesOf(result) };
  });

  let marks = new Map<string, Mark>();
  if (next) {
    if (next.size === undefined) throw new Error(`${next.name}: 결승 쪽 라운드에는 정원(size)이 필요함`);
    marks = qualify(ran.map((r) => r.outcomes), next.size, round.qualifyPerHeat, fork(seed, `${roundKey}/q`), cfg);
  }
  const heats: HeatResult<R>[] = ran.map((r, h) => ({
    index: h + 1,
    key: r.heatKey,
    result: r.result,
    marks: Object.fromEntries(r.outcomes.filter((o) => marks.has(o.id)).map((o) => [o.id, marks.get(o.id)!])),
  }));
  const advancing = sorted.map(comp.idOf).filter((id) => marks.has(id));
  return { name: round.name, roundIndex, heats, advancing };
}

/** 첫 라운드부터 결승까지 한 번에 */
export function runEvent<C, R>(
  comp: Competition<C, R>,
  entrants: readonly C[],
  format: EventFormat,
  seed: number,
  key: string,
  cfg: EngineConfig = DEFAULT_CONFIG,
): EventResult<R> {
  const rounds: RoundResult<R>[] = [];
  let participants = [...entrants];
  for (let r = startRoundIndex(format, entrants.length); r < format.rounds.length; r++) {
    const res = runRound(comp, participants, format, r, seed, key, cfg);
    rounds.push(res);
    const adv = new Set(res.advancing);
    participants = participants.filter((c) => adv.has(comp.idOf(c)));
  }
  const final = rounds.at(-1)!;
  if (final.heats.length !== 1) throw new Error('결승은 한 조여야 함');
  return { rounds, podium: podiumOf(final.heats[0]!, comp) };
}

function podiumOf<C, R>(heat: HeatResult<R>, comp: Competition<C, R>): string[] {
  return comp
    .outcomesOf(heat.result)
    .filter((o) => o.place !== null)
    .sort((a, b) => a.place! - b.place!)
    .slice(0, RULES.MEDALS.length)
    .map((o) => o.id);
}

// --- 100m / 계주용 Competition --------------------------------------------------

export function race100Outcomes(r: Race100Result): HeatOutcome[] {
  return r.runners.map((x) => ({ id: String(x.playerId), place: x.place, time: x.time }));
}

export function relayOutcomes(r: RelayResult): HeatOutcome[] {
  return r.teams.map((t) => ({ id: t.teamId, place: t.place, time: t.time }));
}

export function competition100(seed: number, cfg: EngineConfig = DEFAULT_CONFIG): Competition<Player, Race100Result> {
  return {
    idOf: (p) => String(p.id),
    expectedOf: (p) => expectedTime100(p, cfg),
    runHeat: (entries, heatKey) => runRace100(entries.map(({ c, lane }) => ({ player: c, lane })), seed, heatKey, cfg),
    outcomesOf: race100Outcomes,
  };
}

export function competitionRelay(seed: number, cfg: EngineConfig = DEFAULT_CONFIG): Competition<RelaySquad, RelayResult> {
  return {
    idOf: (s) => s.teamId,
    expectedOf: (s) => expectedRelayTime(s, cfg),
    runHeat: (entries, heatKey) => runRelay(entries.map(({ c, lane }) => ({ ...c, lane })), seed, heatKey, cfg),
    outcomesOf: relayOutcomes,
  };
}

export type Event100 = EventResult<Race100Result>;
export type EventRelay = EventResult<RelayResult>;

export function run100mEvent(
  entrants: readonly Player[],
  format: EventFormat,
  seed: number,
  key = 'm100',
  cfg: EngineConfig = DEFAULT_CONFIG,
): Event100 {
  return runEvent(competition100(seed, cfg), entrants, format, seed, key, cfg);
}

export function runRelayEvent(
  squads: readonly RelaySquad[],
  format: EventFormat,
  seed: number,
  key = 'relay',
  cfg: EngineConfig = DEFAULT_CONFIG,
): EventRelay {
  return runEvent(competitionRelay(seed, cfg), squads, format, seed, key, cfg);
}
