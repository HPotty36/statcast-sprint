// URL 공유 (PLAN.md 8 Phase 7): mode / season / seed + 사용자가 바꾼 엔트리·계주 오더.
//   같은 URL = 같은 입력 = 같은 결과 (난수는 전부 시드에서 나온다).
//   형식은 짧고 사람이 읽을 수 있게, 대표단 id 순으로 정렬해 같은 편집은 같은 문자열이 된다.
//     e = NYY:900012.900031;LAD:      100m 엔트리 (대표단:선수id.선수id, 빈 목록 = 아무도 안 냄)
//     r = NYY:900012.900031.900007.900044:sas    계주 오더 (주자 id 순서 : 바통 s=안전 a=공격)
// DOM 에 의존하지 않는다 (Node 테스트에서 그대로 돌린다).

import type { Delegation, EntryOverrides, ModeConfig } from '../engine/delegations.ts';
import type { Handoff, RelaySquad } from '../engine/relay.ts';

const HANDOFF_CODE: Record<Handoff, string> = { safe: 's', aggressive: 'a' };
const CODE_HANDOFF: Record<string, Handoff> = { s: 'safe', a: 'aggressive' };

const sortedKeys = (o: object) => Object.keys(o).sort();

export function encodeEntryOverrides(o: EntryOverrides): string {
  return sortedKeys(o)
    .map((id) => `${id}:${o[id]!.join('.')}`)
    .join(';');
}

export function encodeRelayOverrides(o: Record<string, RelaySquad>): string {
  return sortedKeys(o)
    .map((id) => {
      const s = o[id]!;
      return `${id}:${s.runners.map((p) => p.id).join('.')}:${s.handoffs.map((h) => HANDOFF_CODE[h]).join('')}`;
    })
    .join(';');
}

function parseIds(text: string): number[] | null {
  if (text === '') return [];
  const ids = text.split('.').map(Number);
  return ids.every((n) => Number.isInteger(n) && n > 0) && new Set(ids).size === ids.length ? ids : null;
}

/**
 * 링크의 엔트리 편집을 되살린다. 지금 데이터에 맞지 않는 항목(없는 대표단, 그 대표단 선수가 아님,
 * 정원 초과)은 통째로 버린다 → 그 대표단은 자동 선발로 뛴다.
 */
export function decodeEntryOverrides(text: string | null, delegations: readonly Delegation[], mode: ModeConfig): EntryOverrides {
  const out: Record<string, number[]> = {};
  if (!text) return out;
  const byId = new Map(delegations.map((d) => [d.id, d]));
  for (const part of text.split(';')) {
    const at = part.lastIndexOf(':');
    if (at < 0) continue;
    const d = byId.get(part.slice(0, at));
    const ids = parseIds(part.slice(at + 1));
    if (!d || !ids || ids.length > mode.max100mEntries) continue;
    const own = new Set(d.players.map((p) => p.id));
    if (ids.every((x) => own.has(x))) out[d.id] = ids;
  }
  return out;
}

/** 링크의 계주 오더를 되살린다. 주자 수·소속·바통 표기가 맞지 않으면 그 대표단은 기본 오더 */
export function decodeRelayOverrides(text: string | null, delegations: readonly Delegation[], mode: ModeConfig): Record<string, RelaySquad> {
  const out: Record<string, RelaySquad> = {};
  if (!text) return out;
  const byId = new Map(delegations.map((d) => [d.id, d]));
  const legs = mode.relayMinRunners;
  for (const part of text.split(';')) {
    // 대표단 id(국가 이름)에는 ':' 가 없으므로 뒤에서 두 개를 끊는다
    const m = /^(.*):([\d.]*):([a-z]*)$/.exec(part);
    if (!m) continue;
    const d = byId.get(m[1]!);
    const ids = parseIds(m[2]!);
    const codes = [...m[3]!];
    if (!d || !ids || ids.length !== legs || codes.length !== legs - 1 || !codes.every((c) => c in CODE_HANDOFF)) continue;
    const players = new Map(d.players.map((p) => [p.id, p]));
    if (!ids.every((x) => players.has(x))) continue;
    out[d.id] = { teamId: d.id, runners: ids.map((x) => players.get(x)!), handoffs: codes.map((c) => CODE_HANDOFF[c]!) };
  }
  return out;
}
