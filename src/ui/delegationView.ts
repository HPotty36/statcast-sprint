// 대표단 표시 방식: 팀별은 팀 코드, 국가별은 국가 코드 + 국기 + 이름.
// 엔진은 대표단 id(팀 약어 / 국가 이름)만 알고, 표시는 여기서 정한다.

import { createContext, useContext } from 'react';
import { TEAM_MODE, type ModeConfig } from '../engine/delegations.ts';
import type { Player } from '../engine/types.ts';
import type { Lang } from './i18n.tsx';
import { flagEmoji, nationInfo } from './nations.ts';

export interface DelegationView {
  mode: ModeConfig;
  /** 선수 → 대표단 id */
  idOf(p: Player): string;
  /** 배번·표에 쓰는 짧은 코드 (팀 약어 / IOC 코드) */
  code(id: string): string;
  /** 국기 이모지 (팀별은 빈 문자열) */
  flag(id: string): string;
  /** 사람이 읽는 이름 (팀별은 코드와 같다) */
  name(id: string, lang: Lang): string;
}

export function makeDelegationView(mode: ModeConfig): DelegationView {
  if (mode.id === 'team') {
    return { mode, idOf: mode.groupBy, code: (id) => id, flag: () => '', name: (id) => id };
  }
  return {
    mode,
    idOf: mode.groupBy,
    code: (id) => nationInfo(id).code,
    flag: (id) => flagEmoji(nationInfo(id).iso2),
    name: (id, lang) => nationInfo(id)[lang],
  };
}

export const DelegationContext = createContext<DelegationView>(makeDelegationView(TEAM_MODE));

export function useDelegation(): DelegationView {
  return useContext(DelegationContext);
}
