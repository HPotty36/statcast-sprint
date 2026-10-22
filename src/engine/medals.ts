// 메달 테이블 (PLAN.md 6.2): 금 → 은 → 동 개수 순

import { RULES, type Medal } from './config.ts';

export interface MedalAward {
  event: string;
  delegationId: string;
  medal: Medal;
  /** 100m 는 선수 id, 계주는 대표단 id */
  winnerId: string;
}

export interface MedalRow {
  /** 금·은·동 개수가 같으면 같은 순위 */
  rank: number;
  delegationId: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}

/** 결승 1·2·3위 id → 메달 */
export function podiumAwards(event: string, podium: readonly string[], delegationOf: (id: string) => string): MedalAward[] {
  return podium.slice(0, RULES.MEDALS.length).map((winnerId, i) => ({
    event,
    winnerId,
    delegationId: delegationOf(winnerId),
    medal: RULES.MEDALS[i]!,
  }));
}

export function medalTable(awards: readonly MedalAward[]): MedalRow[] {
  const rows = new Map<string, MedalRow>();
  for (const a of awards) {
    const r = rows.get(a.delegationId) ?? { rank: 0, delegationId: a.delegationId, gold: 0, silver: 0, bronze: 0, total: 0 };
    r[a.medal] += 1;
    r.total += 1;
    rows.set(a.delegationId, r);
  }
  const sorted = [...rows.values()].sort(
    (a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || a.delegationId.localeCompare(b.delegationId),
  );
  sorted.forEach((r, i) => {
    const prev = sorted[i - 1];
    r.rank = prev && prev.gold === r.gold && prev.silver === r.silver && prev.bronze === r.bronze ? prev.rank : i + 1;
  });
  return sorted;
}
