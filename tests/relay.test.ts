import { describe, expect, it } from 'vitest';
import { withConfig } from '../src/engine/config.ts';
import { defaultRelayOrder, runRelay, type Handoff, type RelayTeamEntry } from '../src/engine/relay.ts';
import { makePlayer } from './helpers.ts';

const NO_NOISE = withConfig({ SIGMA_VMAX: 0, SIGMA_TAU: 0, RT_SD: 0, FAIL_SAFE: 0, FAIL_AGGR: 0 });

function team(id: string, lane: number, firstId: number, handoffs: Handoff[] = ['safe', 'safe', 'safe'], speedFtS = 28): RelayTeamEntry {
  return {
    teamId: id,
    lane,
    runners: [0, 1, 2, 3].map((i) => makePlayer(firstId + i, { speedFtS: speedFtS + i * 0.3 })),
    handoffs,
  };
}

const field = () => Array.from({ length: 8 }, (_, i) => team(`T${i + 1}`, i + 1, 100 + i * 10, ['safe', 'safe', 'safe'], 26 + i * 0.4));

describe('runRelay', () => {
  it('참고 수치: 30.5 ft/s × 4, τ 1.1, 진입 0.85×vmax → 약 44.8초', () => {
    const t = team('USA', 4, 1, ['safe', 'safe', 'safe'], 30.5);
    t.runners.forEach((p) => Object.assign(p, { vmax: 30.5 * 0.3048, tau: 1.1 }));
    const res = runRelay([t], 1, 'F', withConfig({ ...NO_NOISE, ENTRY_SAFE: 0.85 }));
    expect(Math.abs(res.teams[0]!.time! - 44.8)).toBeLessThan(0.05);
  });

  it('구간 기록 합 = 팀 기록, 마지막 누적 = 팀 기록', () => {
    for (let seed = 0; seed < 50; seed++) {
      for (const t of runRelay(field(), seed, 'H').teams) {
        if (t.status !== 'OK') continue;
        const sum = t.legs.reduce((s, l) => s + l.legTime!, 0);
        expect(t.time).toBe(sum);
        expect(t.legs.at(-1)!.cumulative).toBeCloseTo(t.time!, 12);
        expect(t.trajectory.at(-1)).toEqual({ t: t.time, x: 400 });
      }
    }
  });

  it('바통 실패 → DNF, 이후 구간 기록 없음', () => {
    const res = runRelay([team('A', 1, 1)], 1, 'H', withConfig({ FAIL_SAFE: 1, RT_SD: 0 }));
    const t = res.teams[0]!;
    expect(t.status).toBe('DNF');
    expect(t.failedExchange).toBe(1);
    expect(t.time).toBeNull();
    expect(t.place).toBeNull();
    expect(t.legs[0]!.legTime).not.toBeNull();
    expect(t.legs.slice(1).every((l) => l.legTime === null)).toBe(true);
    expect(t.trajectory.at(-1)!.x).toBe(100);
  });

  it('aggressive 만 실패하는 설정이면 safe 팀은 완주', () => {
    const cfg = withConfig({ FAIL_SAFE: 0, FAIL_AGGR: 1 });
    const res = runRelay([team('S', 1, 1), team('G', 2, 11, ['safe', 'safe', 'aggressive'])], 1, 'H', cfg);
    expect(res.teams.find((t) => t.teamId === 'S')!.status).toBe('OK');
    const g = res.teams.find((t) => t.teamId === 'G')!;
    expect(g.status).toBe('DNF');
    expect(g.failedExchange).toBe(3);
  });

  it('1번 주자 부정출발 → DQ', () => {
    const res = runRelay([team('A', 1, 1)], 1, 'H', withConfig({ RT_MEAN: 0.09, RT_SD: 0 }));
    expect(res.teams[0]!.status).toBe('DQ');
    expect(res.teams[0]!.time).toBeNull();
  });

  it('aggressive 터치는 (실패하지 않으면) safe 보다 빠르다', () => {
    const safe = runRelay([team('A', 1, 1)], 3, 'H', NO_NOISE).teams[0]!.time!;
    const aggr = runRelay([team('A', 1, 1, ['aggressive', 'aggressive', 'aggressive'])], 3, 'H', NO_NOISE).teams[0]!.time!;
    expect(aggr).toBeLessThan(safe);
  });

  it('같은 시드 → 같은 결과, 다른 시드 → 다른 결과', () => {
    expect(runRelay(field(), 9, 'H')).toEqual(runRelay(field(), 9, 'H'));
    const a = runRelay(field(), 9, 'H').teams.map((t) => t.time);
    const b = runRelay(field(), 10, 'H').teams.map((t) => t.time);
    expect(b).not.toEqual(a);
  });

  it('주자·바통 터치 개수가 틀리면 에러', () => {
    const bad = { ...team('A', 1, 1), handoffs: ['safe'] as Handoff[] };
    expect(() => runRelay([bad], 1, 'H')).toThrow();
  });
});

describe('defaultRelayOrder', () => {
  it('1번 = τ 최소, 4번 = vmax 최대, 나머지 vmax 순', () => {
    const ps = [
      makePlayer(1, { speedFtS: 29, tau: 1.15 }),
      makePlayer(2, { speedFtS: 28, tau: 0.95 }),
      makePlayer(3, { speedFtS: 30, tau: 1.1 }),
      makePlayer(4, { speedFtS: 28.5, tau: 1.2 }),
    ];
    expect(defaultRelayOrder(ps).map((p) => p.id)).toEqual([2, 1, 4, 3]);
  });
});
