// CLI: 팀별 / 국가별 모드 대회 전체 (100m 예선→준결승→결승, 4×100m 예선→결승, 메달 테이블)
//   npm run event -- [--mode team|nation] [--seed 2026] [--data web/public/sample/players.sample.json] [--verbose]
// --verbose 면 모든 조의 전체 결과, 아니면 예선·준결승은 진출자만 출력한다.

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { MODES, buildDelegations, select100mEntries, selectRelaySquads } from '../src/engine/delegations.ts';
import { medalTable, podiumAwards } from '../src/engine/medals.ts';
import { formatTime, type Race100Result } from '../src/engine/race100.ts';
import type { RelayResult } from '../src/engine/relay.ts';
import { seedFromString } from '../src/engine/rng.ts';
import { run100mEvent, runRelayEvent, type HeatResult } from '../src/engine/tournament.ts';
import type { Player, PlayersFile } from '../src/engine/types.ts';

const { values } = parseArgs({
  options: {
    seed: { type: 'string', default: '2026' },
    data: { type: 'string', default: 'web/public/sample/players.sample.json' },
    verbose: { type: 'boolean', default: false },
    mode: { type: 'string', default: 'team' },
  },
});

const seed = seedFromString(values.seed);
const file = JSON.parse(readFileSync(values.data, 'utf-8')) as PlayersFile;
const mode = values.mode === 'nation' ? MODES.nation : MODES.team;
const modeLabel = mode.id === 'nation' ? '국가별 모드' : '팀별 모드';
const unit = mode.id === 'nation' ? '국가' : '팀';
const byId = new Map<number, Player>(file.players.map((p) => [p.id, p]));

const pad = (s: string | number, w: number, left = false) => (left ? String(s).padEnd(w) : String(s).padStart(w));
const fmt = (t: number | null) => (t === null ? '' : formatTime(t));
const signed = (w: number) => `${w >= 0 ? '+' : ''}${w.toFixed(1)}`;

console.log(`\nStatcast 단거리 대회 — ${modeLabel} · ${file.isSample ? '샘플 데이터(가상 선수)' : `실데이터 ${file.season}`} · seed=${values.seed}`);
console.log('모든 기록은 추정 기록입니다 (반응 시간 포함). 데이터 출처: Baseball Savant · 비공식 팬 프로젝트');

// --- 100m ---------------------------------------------------------------------
const delegations = buildDelegations(file.players, mode);
const entrants = select100mEntries(delegations, mode);
const ev100 = run100mEvent(entrants, mode.formats.m100, seed);
console.log(`\n=== 100m (${delegations.length}개 ${unit}, ${unit}당 최대 ${mode.max100mEntries}명 → ${entrants.length}명)`);

function print100Heat(h: HeatResult<Race100Result>, full: boolean) {
  const r = h.result;
  const wind = `풍속 ${signed(r.wind)}${r.windLegal ? '' : ' (풍속 초과)'}`;
  console.log(`  ${h.index}조  ${wind}`);
  for (const x of r.runners) {
    const mark = h.marks[String(x.playerId)] ?? '';
    if (!full && !mark) continue;
    const p = byId.get(x.playerId)!;
    const splits = full ? `  30m ${pad(fmt(x.splits?.[30] ?? null), 5)}  60m ${pad(fmt(x.splits?.[60] ?? null), 5)}` : '';
    console.log(
      `    ${pad(x.place ?? 'DQ', 2)}  L${x.lane}  ${pad(p.name, 22, true)} ${pad(p.team, 4, true)} ${pad(x.status === 'DQ' ? 'DQ' : fmt(x.time), 6)}  RT ${x.draw.rt.toFixed(3)}${splits}  ${mark}`,
    );
  }
  const dq = r.runners.filter((x) => x.status === 'DQ').length;
  if (!full && dq) console.log(`    (부정출발 실격 ${dq}명)`);
}

ev100.rounds.forEach((round, i) => {
  const isFinal = i === ev100.rounds.length - 1;
  console.log(`\n[${round.name}] ${round.heats.length}개 조${isFinal ? '' : ` → ${round.advancing.length}명 진출 (Q = 조 순위, q = 기록)`}`);
  for (const h of round.heats) print100Heat(h, values.verbose || isFinal);
});

// --- 4×100m -------------------------------------------------------------------
const squads = selectRelaySquads(delegations, mode);
const evRelay = runRelayEvent(squads, mode.formats.relay, seed);
console.log(`\n=== 4×100m 계주 (${squads.length}${mode.id === 'nation' ? '개국' : '팀'}, 기본 오더 · 바통 터치 전부 safe)`);

function printRelayHeat(h: HeatResult<RelayResult>, full: boolean) {
  console.log(`  ${h.index}조`);
  for (const t of h.result.teams) {
    const mark = h.marks[t.teamId] ?? '';
    if (!full && !mark) continue;
    const status = t.status === 'OK' ? fmt(t.time) : t.status === 'DNF' ? `DNF (${t.failedExchange}→${t.failedExchange! + 1} 바통 놓침)` : 'DQ (부정출발)';
    console.log(`    ${pad(t.place ?? '-', 2)}  L${t.lane}  ${pad(t.teamId, 4, true)} ${pad(status, 6)}  ${mark}`);
    if (full) {
      const legs = t.legs.map((l) => `${byId.get(l.playerId)!.name.split(' ').at(-1)} ${l.legTime === null ? '—' : l.legTime.toFixed(2)}`);
      console.log(`          ${legs.join('  |  ')}`);
    }
  }
}

evRelay.rounds.forEach((round, i) => {
  const isFinal = i === evRelay.rounds.length - 1;
  console.log(`\n[${round.name}] ${round.heats.length}개 조${isFinal ? '' : ` → ${round.advancing.length}팀 진출`}`);
  for (const h of round.heats) printRelayHeat(h, values.verbose || isFinal);
});

// --- 메달 테이블 ----------------------------------------------------------------
const awards = [
  ...podiumAwards('100m', ev100.podium, (id) => mode.groupBy(byId.get(Number(id))!)),
  ...podiumAwards('4x100m', evRelay.podium, (id) => id),
];
console.log('\n=== 메달');
for (const a of awards) {
  const who = a.event === '100m' ? `${byId.get(Number(a.winnerId))!.name} (${a.delegationId})` : a.delegationId;
  console.log(`  ${pad(a.event, 6, true)} ${pad(a.medal, 6, true)} ${who}`);
}
console.log('\n=== 메달 테이블');
console.log(`  ${pad('#', 2)}  ${pad('Team', 4, true)}  ${pad('G', 2)} ${pad('S', 2)} ${pad('B', 2)}  ${pad('Tot', 3)}`);
for (const r of medalTable(awards)) {
  console.log(`  ${pad(r.rank, 2)}  ${pad(r.delegationId, 4, true)}  ${pad(r.gold, 2)} ${pad(r.silver, 2)} ${pad(r.bronze, 2)}  ${pad(r.total, 3)}`);
}
