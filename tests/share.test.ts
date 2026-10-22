import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MODES, buildDelegations, defaultRelaySquad, select100mEntries, selectRelaySquads } from '../src/engine/delegations.ts';
import type { RelaySquad } from '../src/engine/relay.ts';
import { seedFromString } from '../src/engine/rng.ts';
import { run100mEvent, runRelayEvent } from '../src/engine/tournament.ts';
import type { PlayersFile } from '../src/engine/types.ts';
import { decodeEntryOverrides, decodeRelayOverrides, encodeEntryOverrides, encodeRelayOverrides } from '../src/ui/share.ts';

const sample = JSON.parse(
  readFileSync(new URL('../web/public/sample/players.sample.json', import.meta.url), 'utf-8'),
) as PlayersFile;

/** 브라우저 주소창을 한 번 거친 것처럼 (공백·기호 인코딩 포함) */
const viaUrl = (e: string, r: string) => {
  const q = new URLSearchParams(new URLSearchParams({ e, r }).toString());
  return { e: q.get('e'), r: q.get('r') };
};

for (const id of ['team', 'nation'] as const) {
  const mode = MODES[id];
  const delegations = buildDelegations(sample.players, mode);
  // 편집 예: 첫 대표단은 느린 선수들로 엔트리, 계주는 순서를 뒤집고 공격 터치 하나
  const d0 = delegations.find((d) => d.players.length > mode.max100mEntries)!;
  const d1 = delegations.find((d) => d.id !== d0.id)!;
  const entry = { [d0.id]: d0.players.slice(-mode.max100mEntries).map((p) => p.id), [d1.id]: [] };
  const base = defaultRelaySquad(d0, mode)!;
  const relay: Record<string, RelaySquad> = {
    [d0.id]: { ...base, runners: [...base.runners].reverse(), handoffs: ['safe', 'aggressive', 'safe'] },
  };

  describe(`URL 공유 (${id})`, () => {
    it('엔트리·오더 편집이 주소창을 거쳐도 그대로 돌아온다', () => {
      const u = viaUrl(encodeEntryOverrides(entry), encodeRelayOverrides(relay));
      expect(decodeEntryOverrides(u.e, delegations, mode)).toEqual(entry);
      expect(decodeRelayOverrides(u.r, delegations, mode)).toEqual(relay);
    });

    it('같은 편집은 같은 문자열 (대표단 순서 무관)', () => {
      const reversed = Object.fromEntries(Object.entries(entry).reverse());
      expect(encodeEntryOverrides(reversed)).toBe(encodeEntryOverrides(entry));
    });

    it('같은 URL 이면 대회 결과가 같다', () => {
      const u = viaUrl(encodeEntryOverrides(entry), encodeRelayOverrides(relay));
      const run = (e: string | null, r: string | null) => {
        const seed = seedFromString('share-test');
        const m100 = run100mEvent(select100mEntries(delegations, mode, decodeEntryOverrides(e, delegations, mode)), mode.formats.m100, seed);
        const squads = selectRelaySquads(delegations, mode, decodeRelayOverrides(r, delegations, mode));
        return { podium: m100.podium, relay: runRelayEvent(squads, mode.formats.relay, seed).podium };
      };
      const a = run(u.e, u.r);
      expect(run(u.e, u.r)).toEqual(a);
      // 편집이 실제로 결과에 들어갔는지: 편집 없는 대회와 엔트리가 다르다
      const plain = select100mEntries(delegations, mode).map((p) => p.id);
      const edited = select100mEntries(delegations, mode, decodeEntryOverrides(u.e, delegations, mode)).map((p) => p.id);
      expect(edited).not.toEqual(plain);
    });
  });
}

describe('URL 공유: 맞지 않는 링크', () => {
  const mode = MODES.team;
  const delegations = buildDelegations(sample.players, mode);
  const [a, b] = delegations;

  it('없는 대표단·남의 선수·정원 초과·중복 id 는 그 대표단만 버린다', () => {
    const ok = `${a!.id}:${a!.players[0]!.id}`;
    const text = [
      ok,
      `ZZZ:${a!.players[1]!.id}`,
      `${b!.id}:${a!.players[1]!.id}`,
      `${b!.id}:${b!.players.slice(0, 3).map((p) => p.id).join('.')}`,
      `${b!.id}:${b!.players[0]!.id}.${b!.players[0]!.id}`,
      'garbage',
    ].join(';');
    expect(decodeEntryOverrides(text, delegations, mode)).toEqual({ [a!.id]: [a!.players[0]!.id] });
  });

  it('계주: 주자 수·바통 표기가 틀리면 기본 오더', () => {
    const ids = a!.players.slice(0, 4).map((p) => p.id).join('.');
    const three = a!.players.slice(0, 3).map((p) => p.id).join('.');
    expect(decodeRelayOverrides(`${a!.id}:${three}:ss`, delegations, mode)).toEqual({});
    expect(decodeRelayOverrides(`${a!.id}:${ids}:sx s`, delegations, mode)).toEqual({});
    expect(decodeRelayOverrides(`${a!.id}:${ids}:ss`, delegations, mode)).toEqual({});
    expect(Object.keys(decodeRelayOverrides(`${a!.id}:${ids}:asa`, delegations, mode))).toEqual([a!.id]);
  });

  it('비어 있거나 없는 값은 편집 없음', () => {
    expect(decodeEntryOverrides(null, delegations, mode)).toEqual({});
    expect(decodeRelayOverrides('', delegations, mode)).toEqual({});
  });
});
