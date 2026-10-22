"""MLB Stats API 선수 정보 (출생 국가, 타석, 포지션, 현재 소속팀) 배치 조회 + 캐시.

캐시: data/raw/{season}/people.json  ({player_id: 응답의 people[] 항목})
이미 캐시에 있는 id 는 다시 조회하지 않는다.

사용법:
    python pipeline/people.py --season 2026 [--refresh]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd
import requests

from fetch import HEADERS, raw_dir

API_URL = "https://statsapi.mlb.com/api/v1/people"
BATCH_SIZE = 100


def cache_path(season: int) -> Path:
    return raw_dir(season) / "people.json"


def load_cache(season: int) -> dict[int, dict]:
    p = cache_path(season)
    if not p.exists():
        return {}
    return {int(k): v for k, v in json.loads(p.read_text(encoding="utf-8")).items()}


def fetch_people(season: int, ids: list[int], refresh: bool = False) -> dict[int, dict]:
    cache = {} if refresh else load_cache(season)
    missing = sorted(set(ids) - cache.keys())
    for i in range(0, len(missing), BATCH_SIZE):
        batch = missing[i : i + BATCH_SIZE]
        r = requests.get(
            API_URL,
            params={"personIds": ",".join(map(str, batch)), "hydrate": "currentTeam"},
            headers=HEADERS,
            timeout=60,
        )
        r.raise_for_status()
        for person in r.json().get("people", []):
            cache[int(person["id"])] = person
        print(f"[get ] people {i + len(batch)}/{len(missing)}")
    not_found = sorted(set(ids) - cache.keys())
    if not_found:
        print(f"[warn] API 응답에 없는 id {len(not_found)}명: {not_found[:10]}")
    p = cache_path(season)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps({str(k): v for k, v in sorted(cache.items())}, ensure_ascii=False), encoding="utf-8")
    return cache


def season_ids(season: int) -> list[int]:
    d = raw_dir(season)
    ids: set[int] = set()
    for name in ("sprint_speed.csv", "running_splits.csv"):
        ids |= set(pd.read_csv(d / name)["player_id"].astype(int))
    return sorted(ids)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--season", type=int, required=True)
    ap.add_argument("--refresh", action="store_true", help="캐시 무시하고 전부 다시 조회")
    args = ap.parse_args()

    ids = season_ids(args.season)
    people = fetch_people(args.season, ids, args.refresh)
    countries = pd.Series([people[i].get("birthCountry") for i in ids if i in people]).value_counts(dropna=False)
    print(f"{len(people)}명 캐시됨 → {cache_path(args.season)}")
    print("birthCountry:\n" + countries.to_string())
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
