import { describe, expect, it } from 'vitest';
import type { RelaySquad } from '../src/engine/relay.ts';
import { moveRunner, sameSquad, setHandoff, setRunner } from '../src/ui/relay/squadEdit.ts';
import { makePlayer } from './helpers.ts';

const p = [1, 2, 3, 4, 5].map((id) => makePlayer(id));
const squad: RelaySquad = { teamId: 'T', runners: p.slice(0, 4), handoffs: ['safe', 'safe', 'safe'] };
const ids = (s: RelaySquad) => s.runners.map((x) => x.id);

describe('계주 오더 편집', () => {
  it('moveRunner: 끌어서 놓은 자리로 이동, 나머지는 밀린다', () => {
    expect(ids(moveRunner(squad, 0, 3))).toEqual([2, 3, 4, 1]);
    expect(ids(moveRunner(squad, 3, 1))).toEqual([1, 4, 2, 3]);
    expect(moveRunner(squad, 2, 2)).toBe(squad);
    expect(moveRunner(squad, 0, 9)).toBe(squad);
  });

  it('바통 터치 선택은 구간 위치에 남는다', () => {
    const s = moveRunner(setHandoff(squad, 0, 'aggressive'), 0, 3);
    expect(s.handoffs).toEqual(['aggressive', 'safe', 'safe']);
  });

  it('setRunner: 후보 선수로 교체', () => {
    expect(ids(setRunner(squad, 2, p[4]!))).toEqual([1, 2, 5, 4]);
  });

  it('setRunner: 이미 뛰는 선수를 고르면 두 자리를 맞바꾼다 (중복 없음)', () => {
    const s = setRunner(squad, 0, p[3]!);
    expect(ids(s)).toEqual([4, 2, 3, 1]);
    expect(new Set(ids(s)).size).toBe(4);
  });

  it('원본은 바뀌지 않는다, sameSquad 비교', () => {
    const s = setHandoff(squad, 1, 'aggressive');
    expect(squad.handoffs[1]).toBe('safe');
    expect(sameSquad(squad, s)).toBe(false);
    expect(sameSquad(squad, { ...squad, runners: [...squad.runners] })).toBe(true);
  });
});
