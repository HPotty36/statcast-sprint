import type { CSSProperties } from 'react';
import type { Mark as MarkKind } from '../../engine/tournament.ts';
import type { Player } from '../../engine/types.ts';
import { useDelegation } from '../delegationView.ts';
import { bibName, teamColor } from '../teamColor.ts';

/**
 * 배번 태그: 선수의 정체성. 레인·결과·카드 어디서나 같은 모양. 띠 색과 코드는 대표단(팀 / 국가).
 * inRow: 대표단 이름이 이미 줄 머리에 있는 목록 안 (엔트리 목록) — 코드·국기를 반복하지 않는다
 */
export function Bib({ p, struck = false, size = 'md', inRow = false }: { p: Player; struck?: boolean; size?: 'sm' | 'md' | 'lg'; inRow?: boolean }) {
  const dv = useDelegation();
  const id = dv.idOf(p);
  const code = dv.code(id);
  const flag = dv.flag(id);
  return (
    <span className={`bib bib--${size}${struck ? ' bib--struck' : ''}`} style={{ '--band': teamColor(code) } as CSSProperties} title={p.name}>
      <span className="bib__name">{bibName(p.name)}</span>
      {!inRow && (
        <span className="bib__team">
          {flag && <span className="bib__flag">{flag}</span>}
          <span className="bib__code">{code}</span>
        </span>
      )}
    </span>
  );
}

/** 대표단 배번 (계주 팀): 이름 자리에 코드, 국가별이면 국기 */
export function TeamBib({ team, struck = false }: { team: string; struck?: boolean }) {
  const dv = useDelegation();
  const code = dv.code(team);
  const flag = dv.flag(team);
  return (
    <span className={`bib bib--team${struck ? ' bib--struck' : ''}`} style={{ '--band': teamColor(code) } as CSSProperties} title={team}>
      {flag && <span className="bib__flag bib__flag--lead">{flag}</span>}
      <span className="bib__name">{code}</span>
    </span>
  );
}

/** 대표단 이름 표시: 국기 + 코드 (+ 국가별이면 이름) */
export function DelegationLabel({ id, lang, withName = true }: { id: string; lang: 'ko' | 'en'; withName?: boolean }) {
  const dv = useDelegation();
  const flag = dv.flag(id);
  const code = dv.code(id);
  const name = dv.name(id, lang);
  return (
    <span className="dlabel">
      {flag && <span className="dlabel__flag">{flag}</span>}
      <span className="dlabel__code">{code}</span>
      {withName && name !== code && <span className="dlabel__name">{name}</span>}
    </span>
  );
}

/** 진출 표시: Q 는 꽉 찬 태그, q 는 외곽선 태그 (색 없이도 구분) */
export function QualMark({ mark }: { mark: MarkKind | undefined }) {
  if (!mark) return null;
  return <span className={`qmark qmark--${mark === 'Q' ? 'place' : 'time'}`}>{mark}</span>;
}
