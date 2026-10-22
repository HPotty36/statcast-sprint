// 배포 빌드 검사 (PLAN.md 8 Phase 7, 핵심 규칙 1): 실데이터가 결과물에 섞이면 실패한다.
//   1. dist/ 안에 data/ 경로의 파일이 하나라도 있으면 실패 (web/public/data 가 복사된 경우)
//   2. 선수 JSON 은 샘플(isSample: true, 가상 선수 ID)만 허용
// 사용: npm run check:dist [-- <dir>]   (기본 dist)

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { SAMPLE_ID_MAX, SAMPLE_ID_MIN } from '../src/engine/types.ts';

const root = process.argv[2] ?? 'dist';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

let files: string[];
try {
  files = walk(root);
} catch {
  console.error(`[check-dist] ${root}/ 가 없습니다. 먼저 빌드하세요.`);
  process.exit(1);
}

const problems: string[] = [];
for (const file of files) {
  const rel = relative(root, file).split(sep).join('/');
  if (rel.split('/').includes('data')) problems.push(`${rel}: data/ 경로 파일은 배포 금지`);
  if (!rel.endsWith('.json')) continue;
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, 'utf-8'));
  } catch {
    continue;
  }
  const players = (json as { players?: unknown }).players;
  if (!Array.isArray(players)) continue;
  if ((json as { isSample?: unknown }).isSample !== true) problems.push(`${rel}: isSample 이 true 가 아닌 선수 파일`);
  const real = players.filter((p) => !(typeof p?.id === 'number' && p.id >= SAMPLE_ID_MIN && p.id <= SAMPLE_ID_MAX));
  if (real.length > 0) problems.push(`${rel}: 가상 선수 ID(${SAMPLE_ID_MIN}~${SAMPLE_ID_MAX})가 아닌 선수 ${real.length}명`);
}

if (problems.length > 0) {
  console.error(`[check-dist] 실패 — 실데이터로 보이는 파일이 ${root}/ 에 있습니다:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`[check-dist] OK — ${files.length}개 파일, data/ 경로 없음, 선수 파일은 샘플만`);
