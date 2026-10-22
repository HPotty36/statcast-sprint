// players.json 스키마 (PLAN.md 4.2). pipeline/schema.py 와 동일하게 유지할 것.

export type BatSide = 'L' | 'R' | 'S';

/** 가상 선수(샘플) ID 범위. 실제 MLBAM ID 와 겹치지 않는다 (schema.py SAMPLE_ID_MIN/MAX) */
export const SAMPLE_ID_MIN = 900_000;
export const SAMPLE_ID_MAX = 999_999;

export interface Player {
  id: number; // MLBAM ID (샘플은 9로 시작하는 가상 ID)
  name: string;
  season: number;
  team: string; // 팀 약어
  birthCountry: string; // MLB Stats API 원본 값
  nation: string; // overrides 반영 후 대표 국가
  batSide: BatSide;
  position: string;

  // 원본 데이터
  sprintSpeedFtS: number;
  competitiveRuns: number;
  bolts: number;
  split90Sec: number | null; // 러닝 스플릿 리더보드에 없으면 null

  // 파생 파라미터 (params.py 가 계산)
  vmax: number; // m/s
  tau: number; // s
  tauImputed: boolean; // 스플릿이 없어 추정값을 썼는지
  sigmaScale: number; // 개인 기복 배수 (기본 1.0)
}

export interface PlayersFile {
  season: number;
  generatedAt: string;
  isSample: boolean;
  players: Player[];
}
