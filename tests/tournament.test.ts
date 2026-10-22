import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RULES, withConfig } from '../src/engine/config.ts';
import { TEAM_MODE, buildDelegations, select100mEntries, selectRelaySquads } from '../src/engine/delegations.ts';
import { createRng } from '../src/engine/rng.ts';
import {
  drawLanes,
  heatCount,
  qualify,
  run100mEvent,
  runRelayEvent,
  serpentine,
  startRoundIndex,
  type HeatOutcome,
} from '../src/engine/tournament.ts';
import type { PlayersFile } from '../src/engine/types.ts';
import { makePlayer } from './helpers.ts';

const sample = JSON.parse(
  readFileSync(new URL('../web/public/sample/players.sample.json', import.meta.url), 'utf-8'),
) as PlayersFile;
const M100 = RULES.TEAM_MODE.M100;
const RELAY = RULES.TEAM_MODE.RELAY;

/** speedFtS 를 0.05 씩 낮춘 n명 (id 1 이 가장 빠름) */
const field = (n: number) => Array.from({ length: n }, (_, i) => makePlayer(i + 1, { speedFtS: 30 - i * 0.05, team: `T${i % 30}` }));

describe('조 편성', () => {
  it('지그재그: 1→A 2→B 3→C 4→C 5→B 6→A 7→A …', () => {
    const heats = serpentine([1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
    expect(heats).toEqual([
      [1, 6, 7],
      [2, 5, 8],
      [3, 4, 9],
    ]);
  });

  it('조 수: 기본 ceil(n/8), 지정값 우선, 8명 초과 불가', () => {
    expect(heatCount({ name: '예선' }, 60)).toBe(8);
    expect(heatCount({ name: '예선' }, 8)).toBe(1);
    expect(heatCount({ name: '예선', heats: 4 }, 30)).toBe(4);
    expect(() => heatCount({ name: '예선', heats: 2 }, 17)).toThrow();
  });

  it('시작 라운드: 8명 이하 → 결승만, 24명 이하 → 준결승부터', () => {
    expect(M100.rounds[startRoundIndex(M100, 8)]!.name).toBe('결승');
    expect(M100.rounds[startRoundIndex(M100, 9)]!.name).toBe('준결승');
    expect(M100.rounds[startRoundIndex(M100, 24)]!.name).toBe('준결승');
    expect(M100.rounds[startRoundIndex(M100, 25)]!.name).toBe('예선');
  });

  it('레인: 정원 있는 라운드는 시드 1~4 → 3~6번, 5~6 → 7·8번, 7~8 → 1·2번', () => {
    for (let s = 0; s < 20; s++) {
      const lanes = drawLanes(8, true, createRng(s));
      expect([...lanes.slice(0, 4)].sort()).toEqual([3, 4, 5, 6]);
      expect([...lanes.slice(4, 6)].sort()).toEqual([7, 8]);
      expect([...lanes.slice(6)].sort()).toEqual([1, 2]);
    }
    const free = drawLanes(7, false, createRng(1));
    expect(new Set(free).size).toBe(7);
    expect(free.every((l) => l >= 1 && l <= 8)).toBe(true);
  });
});

describe('Q/q 진출 판정', () => {
  /** heats[h] = 각 조의 기록 (null = DQ). 순위는 기록 순 */
  const outcomes = (heats: (number | null)[][]): HeatOutcome[][] =>
    heats.map((times, h) => {
      const order = times.map((t, i) => ({ t, i })).filter((x) => x.t !== null).sort((a, b) => a.t! - b.t!);
      return times.map((t, i) => ({ id: `${h}-${i}`, time: t, place: t === null ? null : order.findIndex((o) => o.i === i) + 1 }));
    });

  it('기본: 조별 floor(N/H) 명 Q + 나머지는 기록 순 q', () => {
    // 3개 조 → 정원 8: Q = 2, q = 2
    const heats = outcomes([
      [10.0, 10.1, 10.2, 10.9],
      [10.5, 10.6, 10.65, 10.7],
      [10.3, 10.4, 10.45, 11.0],
    ]);
    const m = qualify(heats, 8, undefined, createRng(1));
    expect([...m.values()].filter((x) => x === 'Q')).toHaveLength(6);
    expect(m.get('0-2')).toBe('q'); // 10.2
    expect(m.get('2-2')).toBe('q'); // 10.45
    expect(m.get('1-2')).toBeUndefined(); // 10.65 는 탈락
    expect(m.size).toBe(8);
  });

  it('조별 통과 인원 지정이 우선 (조 3위 + 기록 2팀)', () => {
    const heats = outcomes([
      [10.0, 10.1, 10.2, 10.3, 10.31],
      [10.5, 10.6, 10.7, 10.8, 10.9],
    ]);
    const m = qualify(heats, 8, 3, createRng(1));
    expect([...m.entries()].filter(([, v]) => v === 'Q').map(([k]) => k).sort()).toEqual(['0-0', '0-1', '0-2', '1-0', '1-1', '1-2']);
    expect([...m.entries()].filter(([, v]) => v === 'q').map(([k]) => k).sort()).toEqual(['0-3', '0-4']);
  });

  it('DQ 는 Q·q 대상이 아니고, 그만큼 기록으로 채운다', () => {
    const heats = outcomes([
      [null, null, 10.2],
      [10.5, 10.6, 10.7],
    ]);
    const m = qualify(heats, 4, undefined, createRng(1));
    expect(m.get('0-0')).toBeUndefined();
    expect(m.get('0-2')).toBe('Q');
    expect(m.get('1-0')).toBe('Q');
    expect(m.get('1-1')).toBe('Q');
    expect(m.get('1-2')).toBe('q');
  });

  it('조별 통과 × 조 수가 정원보다 많으면 에러', () => {
    expect(() => qualify(outcomes([[1], [2], [3]]), 2, 1, createRng(1))).toThrow();
  });
});

describe('100m 대회 (팀별 모드)', () => {
  const delegations = buildDelegations(sample.players, TEAM_MODE);
  const entrants = select100mEntries(delegations, TEAM_MODE);

  it('팀당 최대 2명, 30팀 → 60명', () => {
    expect(delegations).toHaveLength(30);
    expect(entrants).toHaveLength(60);
    const perTeam = new Map<string, number>();
    for (const p of entrants) perTeam.set(p.team, (perTeam.get(p.team) ?? 0) + 1);
    expect(Math.max(...perTeam.values())).toBe(2);
  });

  it('수동 엔트리: 정원 초과·타 대표단 선수는 에러', () => {
    const d = delegations[0]!;
    const three = d.players.slice(0, 3).map((p) => p.id);
    expect(() => select100mEntries(delegations, TEAM_MODE, { [d.id]: three })).toThrow();
    expect(() => select100mEntries(delegations, TEAM_MODE, { [d.id]: [delegations[1]!.players[0]!.id] })).toThrow();
    const one = select100mEntries(delegations, TEAM_MODE, { [d.id]: [d.players[5]!.id] });
    expect(one).toHaveLength(59);
    expect(one).toContain(d.players[5]);
  });

  it('라운드별 인원: 예선 60명 8개 조 → 준결승 24명 3개 조 → 결승 8명', () => {
    const ev = run100mEvent(entrants, M100, 2026);
    expect(ev.rounds.map((r) => r.name)).toEqual(['예선', '준결승', '결승']);
    expect(ev.rounds.map((r) => r.heats.length)).toEqual([8, 3, 1]);
    expect(ev.rounds.map((r) => r.heats.reduce((s, h) => s + h.result.runners.length, 0))).toEqual([60, 24, 8]);
    expect(ev.rounds[0]!.advancing).toHaveLength(24);
    expect(ev.rounds[1]!.advancing).toHaveLength(8);
    // 예선: 조 3위까지 Q (3 × 8 = 24), q 없음 / 준결승: 조 2위 Q + 기록 2명 q
    const marks = (r: number) => ev.rounds[r]!.heats.flatMap((h) => Object.values(h.marks));
    expect(marks(0).filter((m) => m === 'Q')).toHaveLength(24);
    expect(marks(1).filter((m) => m === 'Q')).toHaveLength(6);
    expect(marks(1).filter((m) => m === 'q')).toHaveLength(2);
    expect(ev.podium).toHaveLength(3);
  });

  it('조 편성이 지그재그: 예선 1조에 기대 기록 1위, 2조에 2위 …', () => {
    const ev = run100mEvent(entrants, M100, 1);
    const heatOf = (id: number) => ev.rounds[0]!.heats.findIndex((h) => h.result.runners.some((r) => r.playerId === id));
    // 기대 기록 순 i 번째 선수는 지그재그 규칙의 조에 들어간다
    entrantsByExpected().forEach((p, i) => {
      const block = Math.floor(i / 8);
      const pos = i % 8;
      expect(heatOf(p.id)).toBe(block % 2 === 0 ? pos : 7 - pos);
    });
  });

  function entrantsByExpected() {
    // tournament 와 같은 정렬 기준 (기대 기록, 동률은 id 문자열)
    return [...entrants].sort((a, b) => {
      const ea = 0.17 + timeOf(a);
      const eb = 0.17 + timeOf(b);
      return ea - eb || String(a.id).localeCompare(String(b.id));
    });
  }
  function timeOf(p: { vmax: number; tau: number }) {
    // 정지 출발 100m (kinematics 와 독립적으로 고정점 반복)
    let t = 100 / p.vmax + p.tau;
    for (let i = 0; i < 200; i++) t = (100 + p.vmax * p.tau * (1 - Math.exp(-t / p.tau))) / p.vmax;
    return t;
  }

  it('같은 시드 → 같은 대회, 다른 시드 → 다른 결과', () => {
    expect(run100mEvent(entrants, M100, 7)).toEqual(run100mEvent(entrants, M100, 7));
    expect(run100mEvent(entrants, M100, 8).podium).not.toEqual(run100mEvent(entrants, M100, 7).podium);
  });

  it('출전 20명이면 준결승부터, 6명이면 결승만', () => {
    expect(run100mEvent(field(20), M100, 1).rounds.map((r) => r.name)).toEqual(['준결승', '결승']);
    expect(run100mEvent(field(6), M100, 1).rounds.map((r) => r.name)).toEqual(['결승']);
  });

  it('결승에서 DQ 가 나와도 메달은 완주자 순', () => {
    const cfg = withConfig({ RT_MEAN: 0.1, RT_SD: 0.02 }); // 부정출발 잦게
    const ev = run100mEvent(field(8), M100, 3, 'm100', cfg);
    const final = ev.rounds[0]!.heats[0]!.result;
    const ok = final.runners.filter((r) => r.status === 'OK').map((r) => String(r.playerId));
    expect(ev.podium).toEqual(ok.slice(0, 3));
  });
});

describe('계주 대회 (팀별 모드)', () => {
  const delegations = buildDelegations(sample.players, TEAM_MODE);
  const squads = selectRelaySquads(delegations, TEAM_MODE);

  it('30팀 전원 출전, 예선 4개 조 → 결승 8팀', () => {
    expect(squads).toHaveLength(30);
    const ev = runRelayEvent(squads, RELAY, 2026);
    expect(ev.rounds.map((r) => r.heats.length)).toEqual([4, 1]);
    expect(ev.rounds[0]!.heats.map((h) => h.result.teams.length).sort()).toEqual([7, 7, 8, 8]);
    expect(ev.rounds[0]!.advancing).toHaveLength(8);
    expect(ev.rounds[1]!.heats[0]!.result.teams).toHaveLength(8);
  });

  it('기본 팀: 주자 4명, 바통 터치 전부 safe, 대표단 소속', () => {
    for (const s of squads) {
      expect(s.runners).toHaveLength(4);
      expect(s.handoffs).toEqual(['safe', 'safe', 'safe']);
      expect(s.runners.every((p) => p.team === s.teamId)).toBe(true);
    }
  });

  it('주자 4명 미만 대표단은 제외, relayMaxTeams 상한 적용', () => {
    const few = [...sample.players.filter((p) => p.team !== 'ASO'), ...sample.players.filter((p) => p.team === 'ASO').slice(0, 3)];
    expect(selectRelaySquads(buildDelegations(few, TEAM_MODE), TEAM_MODE).map((s) => s.teamId)).not.toContain('ASO');
    const capped = selectRelaySquads(delegations, { ...TEAM_MODE, relayMaxTeams: 16 });
    expect(capped).toHaveLength(16);
  });
});
