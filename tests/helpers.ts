import type { Player } from '../src/engine/types.ts';

const FT_TO_M = 0.3048;

/** 테스트용 가상 선수 */
export function makePlayer(id: number, overrides: Partial<Player> & { speedFtS?: number } = {}): Player {
  const { speedFtS = 27, ...rest } = overrides;
  return {
    id,
    name: `Test Runner ${id}`,
    season: 2026,
    team: 'TST',
    birthCountry: 'USA',
    nation: 'USA',
    batSide: 'R',
    position: 'CF',
    sprintSpeedFtS: speedFtS,
    competitiveRuns: 100,
    bolts: 0,
    split90Sec: null,
    vmax: speedFtS * FT_TO_M,
    tau: 1.1,
    tauImputed: true,
    sigmaScale: 1,
    ...rest,
  };
}

export function makeHeat(n: number, firstId = 1) {
  return Array.from({ length: n }, (_, i) => ({
    player: makePlayer(firstId + i, { speedFtS: 26 + i * 0.5 }),
    lane: i + 1,
  }));
}
