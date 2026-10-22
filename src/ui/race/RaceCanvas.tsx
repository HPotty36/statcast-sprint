// Canvas 레이스 재생. 레인은 가로, 선수는 배번 태그로 달린다.
// 종목마다 축척을 고정(100m 는 0~100m, 계주는 0~400m)해서, 다른 조·라운드의 기록을 같은 길이로 비교할 수 있다.

import { useEffect, useRef } from 'react';
import type { TrajectoryPoint } from '../../engine/kinematics.ts';
import { RULES } from '../../engine/config.ts';
import { formatTime } from '../../engine/race100.ts';
import { bibName } from '../teamColor.ts';
import { TRACK_100M, type TrackSpec } from './tracks.ts';

export interface CanvasRunner {
  lane: number;
  /** 구간별 주자 이름 (100m 는 한 명) */
  names: string[];
  team: string;
  color: string;
  trajectory: TrajectoryPoint[];
  time: number | null;
  place: number | null;
  /** DQ: 부정출발, DNF: 바통 놓침 (궤적이 놓친 지점에서 끝난다) */
  status: 'OK' | 'DQ' | 'DNF';
}

const C = {
  paper: '#f4f3ee',
  lane: '#ebe9e1',
  stock: '#d9d6cc',
  hair: '#cfccc2',
  ink: '#121212',
  ink3: '#5f5b53', // styles.css --ink-3 과 같은 값
  signal: '#e5431b',
  infraction: '#a3220c',
  white: '#ffffff',
};
// styles.css 의 --display / --ui 와 같은 서체 순서
const DISPLAY = '"Big Shoulders Display", "Black Han Sans", "Arial Narrow", sans-serif';
const UI = '"Archivo Variable", "Pretendard Variable", system-ui, sans-serif';
const ZONE = RULES.RELAY_TAKEOVER_ZONE_M;

function positionAt(traj: TrajectoryPoint[], t: number): number {
  if (traj.length === 0) return 0;
  const last = traj[traj.length - 1]!;
  if (t >= last.t) return last.x;
  // 50ms 간격 균일 샘플 (마지막 점만 예외) → 인덱스로 바로 찾는다
  const dt = traj[1] ? traj[1].t - traj[0]!.t : 0.05;
  const i = Math.min(traj.length - 2, Math.floor(t / dt));
  const a = traj[i]!;
  const b = traj[i + 1]!;
  const f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1;
  return a.x + (b.x - a.x) * Math.max(0, Math.min(1, f));
}

export function RaceCanvas({
  runners,
  tRef,
  label,
  clockRef,
  track = TRACK_100M,
}: {
  runners: CanvasRunner[];
  tRef: React.RefObject<number>;
  label: string;
  /** 진행 시간을 표시할 DOM 요소 (React 리렌더 없이 매 프레임 갱신) */
  clockRef: React.RefObject<HTMLElement | null>;
  track?: TrackSpec;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runnersRef = useRef(runners);
  const trackRef = useRef(track);
  useEffect(() => {
    runnersRef.current = runners;
    trackRef.current = track;
  }, [runners, track]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext('2d')!;
    let width = 0;
    let height = 0;
    let raf = 0;
    let lastDrawn = -1;
    let lastClock = '';

    const layout = () => {
      width = wrap.clientWidth;
      const laneH = width < 560 ? 30 : 40;
      height = 10 + RULES.LANES * laneH + 26;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastDrawn = -1;
    };

    const draw = (t: number) => {
      const tr = trackRef.current;
      const narrow = width < 560;
      const laneH = narrow ? 30 : 40;
      const top = 10;
      const numW = narrow ? 18 : 26;
      const tagW = narrow ? 64 : 104;
      const x0 = numW + tagW; // 출발선
      const x1 = width - 10; // 결승선
      const mx = (m: number) => x0 + (m / tr.distance) * (x1 - x0);
      const trackBottom = top + RULES.LANES * laneH;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = C.paper;
      ctx.fillRect(0, 0, width, height);

      // 레인
      for (let l = 0; l < RULES.LANES; l++) {
        const y = top + l * laneH;
        if (l % 2 === 1) {
          ctx.fillStyle = C.lane;
          ctx.fillRect(0, y, width, laneH);
        }
        ctx.fillStyle = C.ink3;
        ctx.font = `700 ${narrow ? 13 : 16}px ${DISPLAY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(l + 1), numW / 2, y + laneH / 2 + 1);
      }
      ctx.strokeStyle = C.hair;
      ctx.lineWidth = 1;
      for (let l = 0; l <= RULES.LANES; l++) {
        const y = Math.round(top + l * laneH) + 0.5;
        ctx.beginPath();
        ctx.moveTo(numW, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 바통 터치 구역 (음영, 경계 20m 앞 ~ 10m 뒤) 과 구간 경계 (실선)
      for (const m of tr.exchanges) {
        const za = mx(m - ZONE.BEFORE);
        ctx.fillStyle = C.stock;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(za, top, mx(m + ZONE.AFTER) - za, trackBottom - top);
        ctx.globalAlpha = 1;
        ctx.fillStyle = C.ink3;
        ctx.fillRect(Math.round(mx(m)) - 0.5, top, 1.5, trackBottom - top);
      }

      // 30m · 60m 같은 통과 지점
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = C.ink3;
      for (const m of tr.splits) {
        const x = Math.round(mx(m)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, trackBottom);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.font = `600 ${narrow ? 11 : 12}px ${UI}`;
      ctx.fillStyle = C.ink3;
      ctx.textBaseline = 'alphabetic';
      for (const m of [0, ...tr.splits, ...tr.exchanges, tr.distance]) {
        ctx.textAlign = m === tr.distance ? 'right' : 'center';
        ctx.fillText(`${m}m`, m === tr.distance ? x1 : mx(m), height - 8);
      }

      // 출발선 · 결승선
      ctx.fillStyle = C.ink;
      ctx.fillRect(Math.round(x0) - 1, top, 2, trackBottom - top);
      ctx.fillStyle = C.signal;
      ctx.fillRect(Math.round(x1) - 1, top, 3, trackBottom - top);

      // 배번 태그
      for (const r of runnersRef.current) {
        const y = top + (r.lane - 1) * laneH;
        const h = laneH - 8;
        const dq = r.status === 'DQ';
        const pos = dq ? 0 : positionAt(r.trajectory, t);
        const x = mx(pos);
        const left = x - tagW;
        const finished = r.time !== null && t >= r.time;
        const lastT = r.trajectory.at(-1)?.t ?? 0;
        const dropped = r.status === 'DNF' && t >= lastT;
        const struck = dq || dropped;

        ctx.globalAlpha = struck ? 0.5 : 1;
        ctx.fillStyle = C.white;
        ctx.fillRect(left, y + 4, tagW, h);
        ctx.fillStyle = r.color;
        ctx.fillRect(left, y + 4, tagW, 3);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(left) + 0.5, y + 4.5, tagW - 1, h - 1);

        ctx.fillStyle = C.ink;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        // 지금 바통을 든 주자 (바통 터치 지점에 정확히 서 있으면 넘겨주는 주자)
        const leg = Math.min(r.names.length - 1, Math.max(0, Math.floor((pos - 1e-6) / tr.legLength)));
        const name = narrow && tr.teamFirst ? r.team : bibName(r.names[leg] ?? '');
        const fs = narrow ? 13 : 18;
        ctx.font = `800 ${fs}px ${DISPLAY}`;
        const teamW = narrow ? 0 : 30;
        let shown = name;
        while (shown.length > 2 && ctx.measureText(shown).width > tagW - 8 - teamW) shown = shown.slice(0, -1);
        ctx.fillText(shown === name ? name : `${shown.slice(0, -1)}.`, left + 4, y + 4 + h / 2 + 2);
        if (!narrow) {
          ctx.font = `600 11px ${UI}`;
          ctx.fillStyle = C.ink3;
          ctx.textAlign = 'right';
          ctx.fillText(r.team, left + tagW - 4, y + 4 + h / 2 + 2);
        }
        if (struck) {
          // 실격 · 바통 놓침: 취소선
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(left + 3, y + 4 + h / 2 + 1);
          ctx.lineTo(left + tagW - 3, y + 4 + h / 2 + 1);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (struck) {
          // 태그 바로 오른쪽에 사유 (위반 빨강은 글자에만 쓴다)
          const text = dq ? 'DQ' : 'DNF';
          ctx.font = `800 ${narrow ? 14 : 17}px ${DISPLAY}`;
          const tw = ctx.measureText(text).width;
          const bx = Math.min(left + tagW + 4, x1 - tw - 2);
          ctx.fillStyle = C.infraction;
          ctx.textAlign = 'left';
          ctx.fillText(text, bx, y + laneH / 2 + 1);
        }

        // 결승선 통과 후 순위
        if (finished && r.place !== null) {
          const s = narrow ? 16 : 22;
          const bx = x1 - tagW - s - 4;
          // 순위 표시는 잉크 (신호 주황은 진행 중·주요 동작에만)
          ctx.fillStyle = C.ink;
          ctx.fillRect(bx, y + (laneH - s) / 2, s, s);
          ctx.fillStyle = C.white;
          ctx.font = `800 ${narrow ? 13 : 16}px ${DISPLAY}`;
          ctx.textAlign = 'center';
          ctx.fillText(String(r.place), bx + s / 2, y + laneH / 2 + 1);
        }
      }
    };

    let drawnRunners: CanvasRunner[] | null = null;
    const loop = () => {
      const t = tRef.current ?? 0;
      if (t !== lastDrawn || runnersRef.current !== drawnRunners) {
        draw(t);
        lastDrawn = t;
        drawnRunners = runnersRef.current;
      }
      const clock = clockRef.current;
      if (clock) {
        // 경기장 시계처럼 1위가 들어오면 멈춘다
        const times = runnersRef.current.map((r) => r.time).filter((x): x is number => x !== null);
        const stop = times.length ? Math.min(...times) : Infinity;
        const text = formatTime(Math.max(0, Math.min(t, stop)));
        if (text !== lastClock) {
          clock.textContent = text;
          lastClock = text;
        }
      }
      raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(layout);
    ro.observe(wrap);
    layout();
    raf = requestAnimationFrame(loop);
    // 웹폰트가 늦게 오면 다시 그린다
    document.fonts?.ready.then(() => (lastDrawn = -1));
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [tRef, clockRef]);

  return (
    <div className="race" ref={wrapRef}>
      <canvas ref={canvasRef} className="race__canvas" role="img" aria-label={label} />
    </div>
  );
}
