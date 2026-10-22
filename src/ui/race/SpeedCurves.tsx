// 조 전체의 속도 곡선을 선수별 띠로 쌓아 그린다 (순위 순, 같은 시간축).
// 띠마다 배번 이름·팀 색 띠, 30m·60m 통과 표시, 결승 기록. 선택한 선수의 띠를 굵게.
// 곡선은 엔진 결과(레이스 vmax·τ·반응 시간·바람)에서 바로 계산한 것이며, 표시용이다.

import type { CSSProperties } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config.ts';
import { velocityAt } from '../../engine/kinematics.ts';
import { formatTime, type Race100Result } from '../../engine/race100.ts';
import type { Player } from '../../engine/types.ts';
import { useDelegation } from '../delegationView.ts';
import { useI18n } from '../i18n.tsx';
import { bibName, teamColor } from '../teamColor.ts';

/** 띠 SVG 의 좌표계: x 0~100 (시간), y 0~20 (속도, 아래가 0) */
const VB_W = 100;
const VB_H = 20;

export function SpeedCurves({
  race,
  players,
  selected,
}: {
  race: Race100Result;
  players: Map<number, Player>;
  selected: number | null;
}) {
  const { t } = useI18n();
  const dv = useDelegation();
  const ok = race.runners.filter((r) => r.status === 'OK' && r.time !== null);
  if (ok.length === 0) return null;
  const windFactor = 1 - DEFAULT_CONFIG.WIND_K * race.wind;
  const tMax = Math.ceil(Math.max(...ok.map((r) => r.time!)));
  const vMax = Math.max(...ok.map((r) => r.draw.vmax / windFactor));
  const sx = (s: number) => (s / tMax) * VB_W;
  const sy = (v: number) => VB_H - (v / vMax) * (VB_H - 2);
  const ticks = Array.from({ length: Math.floor(tMax / 2) + 1 }, (_, i) => i * 2);

  const points = (r: (typeof ok)[number]) => {
    const pts: string[] = [`0,${VB_H}`, `${sx(r.draw.rt).toFixed(2)},${VB_H}`];
    for (let s = r.draw.rt; s <= r.time! + 1e-9; s += 0.1) {
      const v = velocityAt((s - r.draw.rt) / windFactor, { vmax: r.draw.vmax, tau: r.draw.tau }) / windFactor;
      pts.push(`${sx(s).toFixed(2)},${sy(v).toFixed(2)}`);
    }
    return pts.join(' ');
  };

  return (
    <figure className="curves">
      <figcaption className="curves__cap">
        <span className="curves__title">{t.speedCurves}</span>
        <span className="hint">{t.speedCurvesHint}</span>
      </figcaption>
      <div className="strips" role="img" aria-label={t.speedCurves}>
        {ok.map((r) => {
          const p = players.get(r.playerId)!;
          const sel = r.playerId === selected;
          return (
            <div key={r.playerId} className={`strip${sel ? ' strip--sel' : ''}`}>
              <span className="strip__name" style={{ '--band': teamColor(dv.code(dv.idOf(p))) } as CSSProperties}>
                {bibName(p.name)}
              </span>
              <svg className="strip__plot" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" aria-hidden="true">
                {ticks.map((s) => (
                  <line key={s} x1={sx(s)} x2={sx(s)} y1={0} y2={VB_H} className="strip__grid" />
                ))}
                <polyline points={points(r)} className="strip__line" />
                {[30, 60].map((m) =>
                  r.splits?.[m] ? (
                    <line key={m} x1={sx(r.splits[m]!)} x2={sx(r.splits[m]!)} y1={VB_H - 6} y2={VB_H} className="strip__split" />
                  ) : null,
                )}
              </svg>
              <span className="strip__time">{formatTime(r.time!)}</span>
            </div>
          );
        })}
        <div className="strip strip--axis" aria-hidden="true">
          <span />
          <span className="strip__axis">
            {ticks.map((s) => (
              <span key={s} style={{ left: `${(s / tMax) * 100}%` }}>
                {s}s
              </span>
            ))}
          </span>
          <span />
        </div>
      </div>
      <p className="hint curves__legend">{t.speedCurvesLegend(vMax.toFixed(1))}</p>
    </figure>
  );
}
