import { describe, expect, it } from 'vitest';
import { medalTable, podiumAwards, type MedalAward } from '../src/engine/medals.ts';

const award = (delegationId: string, medal: MedalAward['medal'], event = 'e'): MedalAward => ({
  event,
  delegationId,
  medal,
  winnerId: delegationId,
});

describe('medalTable', () => {
  it('금 → 은 → 동 개수 순, 모두 같으면 같은 순위', () => {
    const rows = medalTable([
      award('A', 'silver'),
      award('A', 'silver'),
      award('B', 'gold'),
      award('C', 'bronze'),
      award('D', 'bronze'),
      award('E', 'gold'),
      award('E', 'bronze'),
    ]);
    expect(rows.map((r) => [r.delegationId, r.rank])).toEqual([
      ['E', 1],
      ['B', 2],
      ['A', 3],
      ['C', 4],
      ['D', 4],
    ]);
    expect(rows[0]).toMatchObject({ gold: 1, silver: 0, bronze: 1, total: 2 });
  });

  it('podiumAwards: 1·2·3위 → 금·은·동', () => {
    const a = podiumAwards('m100', ['11', '22', '33'], (id) => `T${id}`);
    expect(a.map((x) => [x.delegationId, x.medal])).toEqual([
      ['T11', 'gold'],
      ['T22', 'silver'],
      ['T33', 'bronze'],
    ]);
    expect(podiumAwards('m100', ['1', '2'], (id) => id)).toHaveLength(2);
  });
});
