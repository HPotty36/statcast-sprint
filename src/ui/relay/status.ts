import type { RelayTeamResult } from '../../engine/relay.ts';
import type { useI18n } from '../i18n.tsx';

/** 완주하지 못한 팀의 사유 문구 (완주했으면 null) */
export function statusReason(team: RelayTeamResult, t: ReturnType<typeof useI18n>['t']): string | null {
  if (team.status === 'DNF') return t.batonDrop(team.failedExchange!, team.failedExchange! + 1);
  if (team.status === 'DQ') return t.relayDq;
  return null;
}
