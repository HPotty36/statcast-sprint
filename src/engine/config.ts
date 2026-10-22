// 모델 상수와 대회 규칙 숫자는 전부 여기에 둔다 (핵심 규칙 5).
// 엔진 함수는 cfg 인자로 이 객체를 받는다 → 테스트·캘리브레이션에서 일부만 덮어쓸 수 있다.
//
// 데이터 영역 / 게임 영역 (핵심 규칙 2):
//   - vmax, τ, sigmaScale 은 선수 데이터(players.json)에서 온다.
//   - 아래 "게임 규칙" 값들(레이스 기복, 출발 반응, 바람, 바통 터치)은 데이터가 아니라 게임이 정한 것이다.

export interface EngineConfig {
  // --- 게임 규칙: 레이스별 기복 ---
  /** 레이스 vmax = vmax + N(0, SIGMA_VMAX × sigmaScale)  [m/s] */
  SIGMA_VMAX: number;
  /** 레이스 τ = τ + N(0, SIGMA_TAU)  [s] */
  SIGMA_TAU: number;
  /** 노이즈를 더한 레이스 τ 의 하한 (음수·0 방지) [s] */
  TAU_RACE_MIN: number;

  // --- 게임 규칙: 출발 반응 ---
  RT_MEAN: number;
  RT_SD: number;
  /** 반응 시간 하한 [s] */
  RT_MIN: number;
  /** 이 값 미만이면 부정출발 실격 (World Athletics 와 동일 0.100s) */
  FALSE_START_RT: number;

  // --- 게임 규칙: 바람 (100m 만. 계주는 실제 육상처럼 풍속을 재지 않는다) ---
  WIND_MEAN: number;
  WIND_SD: number;
  WIND_MIN: number;
  WIND_MAX: number;
  /** 이 값을 초과하면 풍속 초과 — 게임 내 기록으로 인정하지 않음 [m/s] */
  WIND_LEGAL_MAX: number;
  /** 주행 시간 배수 = 1 − WIND_K × w */
  WIND_K: number;

  // --- 게임 규칙: 4×100m 바통 터치 (구간당) ---
  /** 받는 주자의 진입 속도 = ENTRY × (받는 주자의 레이스 vmax) */
  ENTRY_SAFE: number;
  ENTRY_AGGR: number;
  FAIL_SAFE: number;
  FAIL_AGGR: number;

  // --- 대회 규칙 / 표시 ---
  RACE_DISTANCE_M: number;
  RELAY_LEG_M: number;
  RELAY_LEGS: number;
  SPLIT_DISTANCES_M: readonly number[];
  /** 애니메이션 궤적 샘플 간격 [s] */
  TRAJECTORY_DT: number;
  /** 순위 판정 단위 [s] (그래도 같으면 시드 RNG) */
  RANK_RESOLUTION: number;
  /** 표시 단위 [s] (실제 육상처럼 올림) */
  DISPLAY_RESOLUTION: number;

  // --- 수치 계산 ---
  /** timeToDistance 이분법 종료 오차 [s] (명세: 1e-6 이하) */
  TIME_TOLERANCE: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  // 캘리브레이션 (Phase 3, scripts/calibrate.ts, 2026 실데이터, 결승 10,000회 × 시드 2개):
  //   초기값 0.08 / 0.04 → 기대 기록 1위 우승 44.3% (목표 45~55% 미달).
  //   SIGMA_TAU/SIGMA_VMAX 비율 0.5 를 유지하고 스윕: 0.06 → 54.4%, 0.07 → 48.8%.
  //   0.065 / 0.0325 → 우승 51.6% · 51.7%, 메달 93.0%.
  //   샘플 데이터는 상위 3명이 0.03초 안에 몰려 있어 같은 값에서 약 41% (실데이터 기준으로 맞춤).
  SIGMA_VMAX: 0.065,
  SIGMA_TAU: 0.0325,
  TAU_RACE_MIN: 0.3,

  // 8인 레이스 부정출발 약 0.6% (캘리브레이션 실측 0.6% · 0.7%, 목표 1% 이하 → 조정 없음)
  RT_MEAN: 0.17,
  RT_SD: 0.022,
  RT_MIN: 0.08,
  FALSE_START_RT: 0.1,

  WIND_MEAN: 0.5,
  WIND_SD: 1.0,
  WIND_MIN: -3.0,
  WIND_MAX: 4.0,
  WIND_LEGAL_MAX: 2.0,
  // 2 m/s 뒷바람이면 12초 기록이 약 0.12초 단축
  WIND_K: 0.005,

  ENTRY_SAFE: 0.8,
  ENTRY_AGGR: 0.88,
  // 캘리브레이션: 초기값 FAIL_SAFE 0.005 면 기본 오더(전부 safe) 팀 DNF 1.5% (목표 2~5% 미달).
  //   0.01 → 3.0% · 2.9%. FAIL_AGGR 0.03 은 유지: 전부 aggressive 면 DNF 8.8%, 평균 0.27초 단축.
  FAIL_SAFE: 0.01,
  FAIL_AGGR: 0.03,

  RACE_DISTANCE_M: 100,
  RELAY_LEG_M: 100,
  RELAY_LEGS: 4,
  SPLIT_DISTANCES_M: [30, 60],
  TRAJECTORY_DT: 0.05,
  RANK_RESOLUTION: 0.001,
  DISPLAY_RESOLUTION: 0.01,

  TIME_TOLERANCE: 1e-9,
};

export function withConfig(overrides: Partial<EngineConfig>): EngineConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

// --- 대회 규칙 (PLAN.md 6) ---------------------------------------------------

export interface RoundFormat {
  name: string;
  /** 이 라운드의 정원. 첫 라운드(예선)는 생략. 정원이 있는 라운드는 상위 시드를 3~6번 레인에 배치 */
  size?: number;
  /** 조 수. 생략하면 ceil(인원 / LANES) */
  heats?: number;
  /** 다음 라운드로 조별 순위 통과(Q) 인원. 생략하면 floor(다음 정원 / 조 수) */
  qualifyPerHeat?: number;
}

export interface EventFormat {
  /** 첫 라운드부터 결승까지. 출전 인원이 적으면 정원이 인원 이상인 가장 늦은 라운드부터 시작 */
  rounds: readonly RoundFormat[];
}

export interface ModeRules {
  /** 대표단당 100m 최대 출전 인원 */
  MAX_100M_ENTRIES: number;
  /** 계주 출전 대표단 수 상한 */
  RELAY_MAX_TEAMS: number | 'all';
  M100: EventFormat;
  RELAY: EventFormat;
}

export const RULES = {
  /** 한 조 최대 인원 (8레인) */
  LANES: 8,
  /** 정원이 있는 라운드(준결승·결승)의 레인 추첨: 시드 1~4 → 3~6번, 5~6 → 7·8번, 7~8 → 1·2번 */
  SEEDED_LANE_GROUPS: [
    [3, 4, 5, 6],
    [7, 8],
    [1, 2],
  ],
  RELAY_MIN_RUNNERS: 4,
  /** 바통 터치 구역 (World Athletics 4×100m: 구간 경계 20m 앞 ~ 10m 뒤, 총 30m). 표시용, 엔진 모델에는 없음 */
  RELAY_TAKEOVER_ZONE_M: { BEFORE: 20, AFTER: 10 },
  MEDALS: ['gold', 'silver', 'bronze'],

  TEAM_MODE: {
    MAX_100M_ENTRIES: 2,
    RELAY_MAX_TEAMS: 'all',
    M100: { rounds: [{ name: '예선' }, { name: '준결승', size: 24 }, { name: '결승', size: 8 }] },
    RELAY: { rounds: [{ name: '예선', heats: 4 }, { name: '결승', size: 8 }] },
  },

  // 국가별: 올림픽과 같은 국가당 100m 3명, 계주는 기대 팀 기록 상위 16개국 → 예선 2개 조(조 3위 + 기록 2팀) → 결승 8팀
  NATION_MODE: {
    MAX_100M_ENTRIES: 3,
    RELAY_MAX_TEAMS: 16,
    M100: { rounds: [{ name: '예선' }, { name: '준결승', size: 24 }, { name: '결승', size: 8 }] },
    RELAY: { rounds: [{ name: '예선', heats: 2, qualifyPerHeat: 3 }, { name: '결승', size: 8 }] },
  },
} as const satisfies {
  LANES: number;
  SEEDED_LANE_GROUPS: readonly (readonly number[])[];
  RELAY_MIN_RUNNERS: number;
  RELAY_TAKEOVER_ZONE_M: { BEFORE: number; AFTER: number };
  MEDALS: readonly string[];
  TEAM_MODE: ModeRules;
  NATION_MODE: ModeRules;
};

export type Medal = (typeof RULES.MEDALS)[number];
