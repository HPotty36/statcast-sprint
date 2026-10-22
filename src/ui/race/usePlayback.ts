import { useCallback, useEffect, useRef, useState } from 'react';

export type PlaybackStatus = 'ready' | 'playing' | 'paused' | 'done';

export interface Playback {
  /** 현재 재생 시각 [s]. 매 프레임 바뀌므로 ref 로 두고 캔버스가 직접 읽는다 */
  tRef: React.RefObject<number>;
  status: PlaybackStatus;
  rate: number;
  setRate: (r: number) => void;
  play: () => void;
  pause: () => void;
  finish: () => void;
  replay: () => void;
}

/**
 * 레이스 재생 시계. 엔진이 미리 계산한 궤적을 재생만 한다 (재생 중 계산 없음).
 * key 가 바뀌면 (다른 조) 처음으로 돌아간다. 상태는 key 와 함께 저장해서,
 * 조를 바꾼 첫 렌더에 이전 조의 'done' 이 새 조로 새어 들어가지 않게 한다.
 */
export function usePlayback(duration: number, key: string, onDone?: (key: string) => void): Playback {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  const tRef = useRef(0);
  const keyRef = useRef(key);
  if (keyRef.current !== key) {
    keyRef.current = key;
    tRef.current = 0;
  }
  const [state, setState] = useState<{ key: string; status: PlaybackStatus }>({ key, status: 'ready' });
  const status: PlaybackStatus = state.key === key ? state.status : 'ready';
  const [rate, setRate] = useState(1);
  const rateRef = useRef(rate);
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    if (status !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      tRef.current = Math.min(duration, tRef.current + dt * rateRef.current);
      if (tRef.current >= duration) {
        setState({ key, status: 'done' });
        onDoneRef.current?.(key);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status, duration, key]);

  const play = useCallback(() => {
    if (tRef.current >= duration) tRef.current = 0;
    setState({ key, status: 'playing' });
  }, [duration, key]);
  const pause = useCallback(() => setState({ key, status: 'paused' }), [key]);
  const finish = useCallback(() => {
    tRef.current = duration;
    setState({ key, status: 'done' });
    onDoneRef.current?.(key);
  }, [duration, key]);
  const replay = useCallback(() => {
    tRef.current = 0;
    setState({ key, status: 'playing' });
  }, [key]);

  return { tRef, status, rate, setRate, play, pause, finish, replay };
}
