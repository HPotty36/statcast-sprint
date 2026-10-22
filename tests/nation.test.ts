import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NATION_MODE, TEAM_MODE, buildDelegations, select100mEntries, selectRelaySquads } from '../src/engine/delegations.ts';
import { expectedRelayTime } from '../src/engine/relay.ts';
import { run100mEvent, runRelayEvent } from '../src/engine/tournament.ts';
import type { Player, PlayersFile } from '../src/engine/types.ts';
import { makePlayer } from './helpers.ts';

const sample = JSON.parse(
  readFileSync(new URL('../web/public/sample/players.sample.json', import.meta.url), 'utf-8'),
) as PlayersFile;

/** nations 개 나라, 나라마다 perNation 명. 나라 번호가 클수록 느리다 */
function world(nations: number, perNation: number): Player[] {
  return Array.from({ length: nations * perNation }, (_, i) => {
    const n = Math.floor(i / perNation);
    return makePlayer(1000 + i, { nation: `N${String(n).padStart(2, '0')}`, speedFtS: 30 - n * 0.1 - (i % perNation) * 0.02 });
  });
}

describe('국가별 모드: 100m', () => {
  it('국가당 최대 3명 (선수가 더 많은 나라도)', () => {
    const delegations = buildDelegations(sample.players, NATION_MODE);
    const entrants = select100mEntries(delegations, NATION_MODE);
    const perNation = new Map<string, number>();
    for (const p of entrants) perNation.set(p.nation, (perNation.get(p.nation) ?? 0) + 1);
    expect(Math.max(...perNation.values())).toBe(3);
    // 3명보다 적은 나라는 있는 만큼
    for (const d of delegations) expect(perNation.get(d.id)).toBe(Math.min(3, d.players.length));
  });

  it('수동 엔트리도 3명을 넘으면 에러', () => {
    const d = buildDelegations(sample.players, NATION_MODE).find((x) => x.players.length > 3)!;
    expect(() => select100mEntries([d], NATION_MODE, { [d.id]: d.players.slice(0, 4).map((p) => p.id) })).toThrow();
  });

  it('대표단은 소속팀이 아니라 국가로 묶인다', () => {
    const delegations = buildDelegations(sample.players, NATION_MODE);
    for (const d of delegations) expect(d.players.every((p) => p.nation === d.id)).toBe(true);
    expect(delegations.length).toBe(new Set(sample.players.map((p) => p.nation)).size);
  });
});

describe('국가별 모드: 계주 출전 자격', () => {
  it('주자 4명 미만 국가는 제외', () => {
    const players = [...world(5, 4), ...world(1, 3).map((p) => ({ ...p, id: p.id + 900, nation: 'TINY' }))];
    const squads = selectRelaySquads(buildDelegations(players, NATION_MODE), NATION_MODE);
    expect(squads.map((s) => s.teamId)).not.toContain('TINY');
    expect(squads).toHaveLength(5);
  });

  it('20개국 중 기대 팀 기록 상위 16개국만', () => {
    const delegations = buildDelegations(world(20, 5), NATION_MODE);
    const squads = selectRelaySquads(delegations, NATION_MODE);
    expect(squads).toHaveLength(16);
    // 선발된 나라의 기대 기록이 탈락한 어느 나라보다도 빠르다
    const picked = new Set(squads.map((s) => s.teamId));
    const all = selectRelaySquads(delegations, { ...NATION_MODE, relayMaxTeams: 'all' });
    const slowestPicked = Math.max(...all.filter((s) => picked.has(s.teamId)).map((s) => expectedRelayTime(s)));
    const fastestOut = Math.min(...all.filter((s) => !picked.has(s.teamId)).map((s) => expectedRelayTime(s)));
    expect(slowestPicked).toBeLessThan(fastestOut);
    expect([...picked].sort()).toEqual(Array.from({ length: 16 }, (_, i) => `N${String(i).padStart(2, '0')}`));
  });

  it('사용자가 편성한 팀의 기대 기록으로 자격을 판정한다', () => {
    const delegations = buildDelegations(world(17, 5), NATION_MODE);
    const n16 = delegations.find((d) => d.id === 'N16')!;
    // 가장 느린 나라라도 편성을 바꾸면 기대 기록이 달라진다 — 여기선 공격 터치로 빨라져 16위 안에 드는지만 본다
    const fast = selectRelaySquads(delegations, NATION_MODE, {
      N16: { teamId: 'N16', runners: n16.players.slice(0, 4), handoffs: ['aggressive', 'aggressive', 'aggressive'] },
    });
    expect(fast.map((s) => s.teamId)).toContain('N16');
  });

  it('16개국 → 예선 2개 조(조 3위 + 기록 2팀) → 결승 8팀', () => {
    const squads = selectRelaySquads(buildDelegations(world(20, 5), NATION_MODE), NATION_MODE);
    const ev = runRelayEvent(squads, NATION_MODE.formats.relay, 2026);
    expect(ev.rounds.map((r) => r.heats.length)).toEqual([2, 1]);
    const marks = ev.rounds[0]!.heats.flatMap((h) => Object.values(h.marks));
    const dnf = ev.rounds[0]!.heats.flatMap((h) => h.result.teams.filter((t) => t.status !== 'OK')).length;
    expect(marks.filter((m) => m === 'Q').length).toBeLessThanOrEqual(6);
    expect(marks).toHaveLength(Math.min(8, 16 - dnf));
    if (dnf === 0) expect(marks.filter((m) => m === 'Q')).toHaveLength(6);
  });
});

describe('모드 전환: 같은 엔진', () => {
  it('같은 선수·시드로 팀별과 국가별 모두 결승까지 돈다', () => {
    for (const mode of [TEAM_MODE, NATION_MODE]) {
      const d = buildDelegations(sample.players, mode);
      const ev = run100mEvent(select100mEntries(d, mode), mode.formats.m100, 7);
      expect(ev.podium).toHaveLength(3);
      const relay = runRelayEvent(selectRelaySquads(d, mode), mode.formats.relay, 7);
      expect(relay.rounds.at(-1)!.heats).toHaveLength(1);
      expect(run100mEvent(select100mEntries(d, mode), mode.formats.m100, 7)).toEqual(ev);
    }
  });
});
