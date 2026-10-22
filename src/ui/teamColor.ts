// 팀 색: 실제 MLB 팀 색을 쓰지 않고 팀 코드에서 결정적으로 만든다 (비공식 프로젝트, 가상 팀과도 호환).
// 배번표 상단 띠에만 쓰이므로 흰 바탕 위에서 구분되도록 채도·명도를 좁은 범위로 고정한다.

import { hashSeed } from '../engine/rng.ts';

export function teamColor(team: string): string {
  const h = hashSeed(7, team) % 360;
  return `oklch(0.58 0.16 ${h})`;
}

/** 표시용 성 (배번표 이름) */
export function bibName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const suffix = /^(jr\.?|sr\.?|ii|iii|iv)$/i;
  let last = parts.at(-1) ?? fullName;
  if (parts.length > 2 && suffix.test(last)) last = parts.at(-2)!;
  return last.toUpperCase();
}
