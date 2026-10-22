// 선수 데이터 로딩 (PLAN.md 7 "데이터 로딩")
//   web/public/data/players.{season}.json 이 있으면 실데이터, 없으면 web/public/sample/players.sample.json.
//   VITE_DATA=sample 이면 무조건 샘플 (배포 빌드에서 고정).

import type { PlayersFile } from '../engine/types.ts';

const FORCE_SAMPLE = import.meta.env.VITE_DATA === 'sample';
const BASE = import.meta.env.BASE_URL;

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: 'no-cache' });
    if (!res.ok) return null;
    // 개발 서버는 없는 파일에도 index.html 을 200 으로 돌려준다 → JSON 이 아니면 없는 것으로 본다
    if (!(res.headers.get('content-type') ?? '').includes('json')) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** 실데이터 시즌 목록: web/public/data/index.json ({"seasons":[2026, ...]}) 이 있으면 그것, 없으면 빈 배열 */
export async function realSeasons(): Promise<number[]> {
  if (FORCE_SAMPLE) return [];
  const idx = await fetchJson<{ seasons: number[] }>('data/index.json');
  return idx?.seasons ?? [];
}

export async function loadPlayers(season: number | null): Promise<PlayersFile> {
  if (!FORCE_SAMPLE && season !== null) {
    const real = await fetchJson<PlayersFile>(`data/players.${season}.json`);
    if (real) return real;
  }
  const sample = await fetchJson<PlayersFile>('sample/players.sample.json');
  if (!sample) throw new Error('sample data missing');
  return sample;
}
