"""Baseball Savant CSV 수집 → data/raw/{season}/  (로컬 전용, gitignored)

- sprint_speed.csv   : 스프린트 스피드 리더보드 (min=10 질주 기회)
- running_splits.csv : 90ft 러닝 스플릿 raw (5ft 단위 누적 시간, min=5)

받은 뒤 실제 컬럼명과 상위 5행을 출력한다 (핵심 규칙 6: 컬럼명 추측 금지).

사용법:
    python pipeline/fetch.py --season 2026 [--force]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"

SOURCES = {
    "sprint_speed": (
        "https://baseballsavant.mlb.com/leaderboard/sprint_speed"
        "?year={season}&position=&team=&min={min}&csv=true",
        10,
    ),
    "running_splits": (
        "https://baseballsavant.mlb.com/running_splits"
        "?type=raw&bats=&year={season}&position=&team=&min={min}&csv=true",
        5,
    ),
}
HEADERS = {"User-Agent": "statcast-sprint (unofficial fan project; local pipeline)"}


def raw_dir(season: int) -> Path:
    return RAW_DIR / str(season)


def download(name: str, season: int, force: bool = False) -> Path:
    url_tmpl, min_opp = SOURCES[name]
    out = raw_dir(season) / f"{name}.csv"
    if out.exists() and not force:
        print(f"[skip] {out} 이미 있음 (--force 로 다시 받기)")
        return out
    url = url_tmpl.format(season=season, min=min_opp)
    print(f"[get ] {url}")
    r = requests.get(url, headers=HEADERS, timeout=60)
    r.raise_for_status()
    text = r.content.decode("utf-8-sig")
    if not text.strip() or text.lstrip().startswith("<"):
        raise RuntimeError(f"{name}: CSV 대신 빈 응답 또는 HTML 이 왔음 (len={len(text)})")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    return out


def describe(path: Path) -> None:
    df = pd.read_csv(path)
    print(f"\n=== {path.name}: {len(df)} rows × {len(df.columns)} cols")
    print("columns:", list(df.columns))
    with pd.option_context("display.max_columns", 12, "display.width", 200):
        print(df.head(5))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--season", type=int, required=True)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    for name in SOURCES:
        describe(download(name, args.season, args.force))
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
