// 계주 오더 편집 (순수 함수). 화면은 이 함수들의 결과만 그린다.

import type { Handoff, RelaySquad } from '../../engine/relay.ts';
import type { Player } from '../../engine/types.ts';

/** from 번째 주자를 to 자리로 옮긴다 (바통 터치 선택은 구간 위치에 남는다) */
export function moveRunner(s: RelaySquad, from: number, to: number): RelaySquad {
  const n = s.runners.length;
  if (from === to || from < 0 || to < 0 || from >= n || to >= n) return s;
  const runners = [...s.runners];
  const [p] = runners.splice(from, 1);
  runners.splice(to, 0, p!);
  return { ...s, runners };
}

/**
 * slot 번째 주자를 player 로 바꾼다. player 가 이미 다른 구간을 달리고 있으면 두 자리를 맞바꾼다
 * (같은 선수가 두 번 뛰지 않게).
 */
export function setRunner(s: RelaySquad, slot: number, player: Player): RelaySquad {
  const runners = [...s.runners];
  const existing = runners.findIndex((p) => p.id === player.id);
  if (existing === slot) return s;
  if (existing >= 0) runners[existing] = runners[slot]!;
  runners[slot] = player;
  return { ...s, runners };
}

/** exchange 번째 바통 터치 (0 = 1→2번) 방식 변경 */
export function setHandoff(s: RelaySquad, exchange: number, h: Handoff): RelaySquad {
  const handoffs = [...s.handoffs];
  handoffs[exchange] = h;
  return { ...s, handoffs };
}

/** 두 팀 편성이 같은지 (주자 순서와 바통 터치) */
export function sameSquad(a: RelaySquad, b: RelaySquad): boolean {
  return (
    a.runners.length === b.runners.length &&
    a.runners.every((p, i) => p.id === b.runners[i]!.id) &&
    a.handoffs.every((h, i) => h === b.handoffs[i])
  );
}
