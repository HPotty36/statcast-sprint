// 대표단 추상화 (PLAN.md 6.1). 팀과 국가는 엔진 입장에서 같은 "대표단"이고,
// 묶는 기준(groupBy)과 정원·진행 방식만 모드 설정으로 다르다.

import { DEFAULT_CONFIG, RULES, type EngineConfig, type EventFormat } from './config.ts';
import { expectedTime100 } from './race100.ts';
import { defaultRelayOrder, expectedRelayTime, type Handoff, type RelaySquad } from './relay.ts';
import type { Player } from './types.ts';

export interface ModeConfig {
  id: 'team' | 'nation';
  groupBy: (p: Player) => string;
  /** 대표단당 100m 최대 출전 인원 */
  max100mEntries: number;
  relayMinRunners: number;
  /** 계주 출전 대표단 수 상한 */
  relayMaxTeams: number | 'all';
  formats: { m100: EventFormat; relay: EventFormat };
}

export const TEAM_MODE: ModeConfig = {
  id: 'team',
  groupBy: (p) => p.team,
  max100mEntries: RULES.TEAM_MODE.MAX_100M_ENTRIES,
  relayMinRunners: RULES.RELAY_MIN_RUNNERS,
  relayMaxTeams: RULES.TEAM_MODE.RELAY_MAX_TEAMS,
  formats: { m100: RULES.TEAM_MODE.M100, relay: RULES.TEAM_MODE.RELAY },
};

/** 국가별: 출생 국가(nation_overrides.csv 반영 후의 nation)로 묶는다 */
export const NATION_MODE: ModeConfig = {
  id: 'nation',
  groupBy: (p) => p.nation,
  max100mEntries: RULES.NATION_MODE.MAX_100M_ENTRIES,
  relayMinRunners: RULES.RELAY_MIN_RUNNERS,
  relayMaxTeams: RULES.NATION_MODE.RELAY_MAX_TEAMS,
  formats: { m100: RULES.NATION_MODE.M100, relay: RULES.NATION_MODE.RELAY },
};

export const MODES = { team: TEAM_MODE, nation: NATION_MODE } as const;

export interface Delegation {
  id: string;
  /** 기대 100m 기록 순 */
  players: Player[];
}

const byExpected = (cfg: EngineConfig) => (a: Player, b: Player) =>
  expectedTime100(a, cfg) - expectedTime100(b, cfg) || a.id - b.id;

/** 선수 → 대표단 (id 순) */
export function buildDelegations(players: readonly Player[], mode: ModeConfig, cfg: EngineConfig = DEFAULT_CONFIG): Delegation[] {
  const groups = new Map<string, Player[]>();
  for (const p of players) {
    const id = mode.groupBy(p);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(p);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, ps]) => ({ id, players: ps.sort(byExpected(cfg)) }));
}

/** 수동 선택: 대표단 id → 선수 id 목록 */
export type EntryOverrides = Record<string, readonly number[]>;

/**
 * 100m 출전 선수. 기본은 대표단마다 기대 기록 순 max100mEntries 명.
 * overrides 가 있는 대표단은 그 선수들 (정원 초과·다른 대표단 선수면 에러).
 */
export function select100mEntries(
  delegations: readonly Delegation[],
  mode: ModeConfig,
  overrides: EntryOverrides = {},
): Player[] {
  return delegations.flatMap((d) => {
    const picked = overrides[d.id];
    if (!picked) return d.players.slice(0, mode.max100mEntries);
    if (picked.length > mode.max100mEntries) {
      throw new Error(`${d.id}: 100m 정원 ${mode.max100mEntries}명 초과 (${picked.length}명)`);
    }
    return picked.map((id) => {
      const p = d.players.find((x) => x.id === id);
      if (!p) throw new Error(`${d.id}: 선수 ${id} 는 이 대표단 소속이 아님`);
      return p;
    });
  });
}

/** 기본 계주 팀: 기대 기록 상위 relayMinRunners 명 → 기본 오더, 바통 터치 전부 safe. 인원이 모자라면 null */
export function defaultRelaySquad(d: Delegation, mode: ModeConfig): RelaySquad | null {
  if (d.players.length < mode.relayMinRunners) return null;
  const runners = defaultRelayOrder(d.players.slice(0, mode.relayMinRunners));
  const handoffs: Handoff[] = Array.from({ length: runners.length - 1 }, () => 'safe');
  return { teamId: d.id, runners, handoffs };
}

/**
 * 계주 출전 팀. 주자 relayMinRunners 명 이상인 대표단만, relayMaxTeams 가 숫자면 기대 팀 기록 상위 N개.
 * overrides 는 사용자가 편성한 팀 (출전 자격 판정에도 그 팀의 기대 기록을 쓴다).
 */
export function selectRelaySquads(
  delegations: readonly Delegation[],
  mode: ModeConfig,
  overrides: Record<string, RelaySquad> = {},
  cfg: EngineConfig = DEFAULT_CONFIG,
): RelaySquad[] {
  const squads = delegations
    .map((d) => overrides[d.id] ?? defaultRelaySquad(d, mode))
    .filter((s): s is RelaySquad => s !== null);
  if (mode.relayMaxTeams === 'all') return squads;
  return squads
    .map((s) => ({ s, t: expectedRelayTime(s, cfg) }))
    .sort((a, b) => a.t - b.t || a.s.teamId.localeCompare(b.s.teamId))
    .slice(0, mode.relayMaxTeams)
    .map(({ s }) => s);
}
