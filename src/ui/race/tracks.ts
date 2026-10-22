// 레이스 캔버스의 트랙 정의 (종목별 고정 축척)

import { DEFAULT_CONFIG } from '../../engine/config.ts';

export interface TrackSpec {
  distance: number;
  /** 한 주자가 맡는 거리 (100m 는 distance 와 같다) */
  legLength: number;
  /** 30m·60m 같은 통과 지점 (점선) */
  splits: readonly number[];
  /** 바통 터치 지점 (실선 + 앞쪽 구역 음영) */
  exchanges: readonly number[];
  /** 좁은 화면에서 태그에 주자 이름 대신 팀 코드를 쓴다 (계주) */
  teamFirst: boolean;
}

export const TRACK_100M: TrackSpec = {
  distance: DEFAULT_CONFIG.RACE_DISTANCE_M,
  legLength: DEFAULT_CONFIG.RACE_DISTANCE_M,
  splits: DEFAULT_CONFIG.SPLIT_DISTANCES_M,
  exchanges: [],
  teamFirst: false,
};

const L = DEFAULT_CONFIG.RELAY_LEG_M;
const N = DEFAULT_CONFIG.RELAY_LEGS;

export const TRACK_RELAY: TrackSpec = {
  distance: L * N,
  legLength: L,
  splits: [],
  exchanges: Array.from({ length: N - 1 }, (_, i) => L * (i + 1)),
  teamFirst: true,
};
