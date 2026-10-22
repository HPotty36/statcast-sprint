import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { PlayersFile } from '../src/engine/types.ts';

const file = JSON.parse(
  readFileSync(new URL('../web/public/sample/players.sample.json', import.meta.url), 'utf-8'),
) as PlayersFile;

describe('players.sample.json', () => {
  it('샘플 표시가 되어 있고 가상 ID 대역만 사용한다', () => {
    expect(file.isSample).toBe(true);
    for (const p of file.players) {
      expect(p.id).toBeGreaterThanOrEqual(900_000);
      expect(p.id).toBeLessThanOrEqual(999_999);
    }
  });

  it('가상 선수 300명, 팀 30개', () => {
    expect(file.players).toHaveLength(300);
    expect(new Set(file.players.map((p) => p.team)).size).toBe(30);
  });

  it('모든 국가가 계주 최소 인원(4명) 이상을 보유', () => {
    const counts = new Map<string, number>();
    for (const p of file.players) counts.set(p.nation, (counts.get(p.nation) ?? 0) + 1);
    for (const n of counts.values()) expect(n).toBeGreaterThanOrEqual(4);
  });
});
