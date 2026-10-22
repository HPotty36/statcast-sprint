// 몬테카를로 캘리브레이션 (PLAN.md Phase 3)
//   npm run calibrate -- [--data data/players.2026.json] [--n 10000] [--sigma-vmax 0.08] [--sigma-tau 0.04]
//                        [--fail-safe 0.005] [--fail-aggr 0.03] [--sweep]
//
// 결승(팀별 모드 엔트리 중 기대 기록 상위 8명)과 계주 결승(기대 기록 상위 8팀)을 n 회 돌려서:
//   - 기대 기록 1위의 우승 확률 (목표 45~55%) / 메달 확률
//   - 레이스당 부정출발 비율 (목표 1% 이하)
//   - 계주 팀당 DNF 비율 (목표 2~5%, 기본 오더 = 전부 safe)
//   - 우승 기록 분포

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { DEFAULT_CONFIG, withConfig, type EngineConfig } from '../src/engine/config.ts';
import { TEAM_MODE, buildDelegations, select100mEntries, selectRelaySquads } from '../src/engine/delegations.ts';
import { expectedTime100, formatTime, runRace100, type RaceEntrant } from '../src/engine/race100.ts';
import { expectedRelayTime, runRelay, type RelaySquad } from '../src/engine/relay.ts';
import type { PlayersFile } from '../src/engine/types.ts';

const { values } = parseArgs({
  options: {
    data: { type: 'string', default: 'web/public/sample/players.sample.json' },
    n: { type: 'string', default: '10000' },
    seed: { type: 'string', default: '1' },
    'sigma-vmax': { type: 'string' },
    'sigma-tau': { type: 'string' },
    'fail-safe': { type: 'string' },
    'fail-aggr': { type: 'string' },
    sweep: { type: 'boolean', default: false },
  },
});

const N = Number(values.n);
const SEED = Number(values.seed);
const file = JSON.parse(readFileSync(values.data, 'utf-8')) as PlayersFile;
const num = (s: string | undefined) => (s === undefined ? undefined : Number(s));
const overrides: Partial<EngineConfig> = Object.fromEntries(
  Object.entries({
    SIGMA_VMAX: num(values['sigma-vmax']),
    SIGMA_TAU: num(values['sigma-tau']),
    FAIL_SAFE: num(values['fail-safe']),
    FAIL_AGGR: num(values['fail-aggr']),
  }).filter(([, v]) => v !== undefined),
);
const baseCfg = withConfig(overrides);

const delegations = buildDelegations(file.players, TEAM_MODE, baseCfg);
const finalists = select100mEntries(delegations, TEAM_MODE)
  .sort((a, b) => expectedTime100(a, baseCfg) - expectedTime100(b, baseCfg))
  .slice(0, 8);
const finalEntrants: RaceEntrant[] = finalists.map((player, i) => ({ player, lane: i + 1 }));
const favorite = finalists[0]!;

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
};

function simulateFinal(cfg: EngineConfig, n: number) {
  let favWins = 0, favMedals = 0, falseStartRaces = 0;
  const winTimes: number[] = [];
  for (let i = 0; i < n; i++) {
    const res = runRace100(finalEntrants, SEED, `cal/final/${i}`, cfg);
    if (res.runners.some((r) => r.status === 'DQ')) falseStartRaces++;
    const fav = res.runners.find((r) => r.playerId === favorite.id)!;
    if (fav.place === 1) favWins++;
    if (fav.place !== null && fav.place <= 3) favMedals++;
    winTimes.push(res.runners[0]!.time!);
  }
  return { favWin: favWins / n, favMedal: favMedals / n, falseStart: falseStartRaces / n, winTimes };
}

function simulateRelay(cfg: EngineConfig, n: number, squads: RelaySquad[]) {
  let teams = 0, dnf = 0, dq = 0;
  const times: number[] = [];
  for (let i = 0; i < n; i++) {
    const res = runRelay(squads.map((s, k) => ({ ...s, lane: k + 1 })), SEED, `cal/relay/${i}`, cfg);
    for (const t of res.teams) {
      teams++;
      if (t.status === 'DNF') dnf++;
      if (t.status === 'DQ') dq++;
      if (t.time !== null) times.push(t.time);
    }
  }
  const mean = times.reduce((s, x) => s + x, 0) / times.length;
  return { dnf: dnf / teams, dq: dq / teams, meanTime: mean, winTimes: times };
}

console.log(`데이터: ${values.data} (${file.isSample ? '샘플' : `실데이터 ${file.season}`}), n=${N}, seed=${SEED}`);
console.log(
  `설정: SIGMA_VMAX=${baseCfg.SIGMA_VMAX} SIGMA_TAU=${baseCfg.SIGMA_TAU} FAIL_SAFE=${baseCfg.FAIL_SAFE} FAIL_AGGR=${baseCfg.FAIL_AGGR}`,
);
console.log('\n결승 진출자 (기대 기록 순):');
for (const p of finalists) {
  console.log(`  ${formatTime(expectedTime100(p, baseCfg)).padStart(6)}  σ×${p.sigmaScale.toFixed(2)}  ${p.name} (${p.team})`);
}

if (values.sweep) {
  // SIGMA_TAU / SIGMA_VMAX 비율은 고정하고 SIGMA_VMAX 만 바꿔 본다
  const ratio = baseCfg.SIGMA_TAU / baseCfg.SIGMA_VMAX;
  console.log(`\nSIGMA_VMAX 스윕 (SIGMA_TAU = ${ratio.toFixed(2)} × SIGMA_VMAX)`);
  for (const sv of [0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.1, 0.12]) {
    const cfg = withConfig({ ...overrides, SIGMA_VMAX: sv, SIGMA_TAU: ratio * sv });
    const r = simulateFinal(cfg, N);
    console.log(`  SIGMA_VMAX=${sv.toFixed(2)} SIGMA_TAU=${(ratio * sv).toFixed(3)} → 1위 우승 ${pct(r.favWin)}, 메달 ${pct(r.favMedal)}`);
  }
  process.exit(0);
}

const final = simulateFinal(baseCfg, N);
const relayFinalists = selectRelaySquads(delegations, TEAM_MODE, {}, baseCfg)
  .sort((a, b) => expectedRelayTime(a, baseCfg) - expectedRelayTime(b, baseCfg))
  .slice(0, 8);
const relaySafe = simulateRelay(baseCfg, N, relayFinalists);
const relayAggr = simulateRelay(
  baseCfg,
  N,
  relayFinalists.map((s) => ({ ...s, handoffs: s.handoffs.map(() => 'aggressive' as const) })),
);

const check = (ok: boolean) => (ok ? '✅' : '❌');
console.log('\n=== 100m 결승');
console.log(`기대 기록 1위 우승 확률   ${pct(final.favWin).padStart(6)}  ${check(final.favWin >= 0.45 && final.favWin <= 0.55)} 목표 45~55%`);
console.log(`기대 기록 1위 메달 확률   ${pct(final.favMedal).padStart(6)}`);
console.log(`레이스당 부정출발 비율    ${pct(final.falseStart).padStart(6)}  ${check(final.falseStart <= 0.01)} 목표 1% 이하`);
console.log(
  `우승 기록 분포 (5/25/50/75/95%): ${[0.05, 0.25, 0.5, 0.75, 0.95].map((q) => formatTime(quantile(final.winTimes, q))).join(' / ')}`,
);
console.log('\n=== 4×100m 결승 (8팀)');
console.log(`팀당 DNF (기본 오더, 전부 safe)  ${pct(relaySafe.dnf).padStart(6)}  ${check(relaySafe.dnf >= 0.02 && relaySafe.dnf <= 0.05)} 목표 2~5%`);
console.log(`팀당 DQ  (1번 주자 부정출발)     ${pct(relaySafe.dq).padStart(6)}`);
console.log(`참고: 전부 aggressive 면 DNF ${pct(relayAggr.dnf)}, 평균 기록 ${(relaySafe.meanTime - relayAggr.meanTime).toFixed(3)}초 단축`);
console.log(
  `완주 기록 분포 (5/50/95%, safe): ${[0.05, 0.5, 0.95].map((q) => formatTime(quantile(relaySafe.winTimes, q))).join(' / ')}`,
);
console.log(`\n(DEFAULT_CONFIG 기준값: SIGMA_VMAX=${DEFAULT_CONFIG.SIGMA_VMAX}, SIGMA_TAU=${DEFAULT_CONFIG.SIGMA_TAU})`);
