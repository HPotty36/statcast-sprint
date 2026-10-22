"""가상 선수 샘플 데이터 생성 → web/public/sample/players.sample.json

실제 선수·팀 데이터는 전혀 사용하지 않는다 (핵심 규칙 1).
- 선수 이름: 음절 조합으로 만든 가상 이름, ID 는 900001 부터
- 팀: 실제 MLB 팀명·약어와 겹치지 않는 가상 팀 30개
- 분포: 스프린트 스피드 N(27.37, 1.36) [23, 31] 절단, τ N(1.1, 0.05)
  (2026 실데이터의 평균·표준편차만 반영. 초기값은 N(27, 1.5), τ N(1.1, 0.12) 였음)

사용법:
    python pipeline/sample.py [--seed 20261022] [--season 2026] [--out web/public/sample/players.sample.json]
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

import schema
from model import DIST_90FT_M, FT_TO_M, time_to_distance

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "web" / "public" / "sample" / "players.sample.json"

N_PLAYERS = 300
SPEED_MEAN, SPEED_SD, SPEED_MIN, SPEED_MAX = 27.37, 1.36, 23.0, 31.0
TAU_MEAN, TAU_SD = 1.1, 0.05
SPLIT_COVERAGE = 0.85  # 러닝 스플릿 리더보드에 있는 비율 (나머지는 τ 추정)
IMPUTE_WINDOW_FTS = 0.5  # τ 결측 시 ±0.5 ft/s 이웃의 중앙값 (PLAN 4.3-5)
# 스플릿 = 순수 주행 시간 + START_OFFSET − 좌타 이점 + 측정 잡음.
# 2026 params.py 결과(START_OFFSET −0.312s, 좌타 계수 −0.065s)에 맞춘 값.
SAMPLE_START_OFFSET = -0.31
SAMPLE_LEFTY_ADVANTAGE = 0.065
SAMPLE_SPLIT_NOISE_SD = 0.03

# (약어, 이름) — 실제 MLB 팀명·닉네임·약어를 쓰지 않는다
TEAMS = [
    ("ASO", "Ashford Owls"), ("BVP", "Bayview Pelicans"), ("CFL", "Cedar Falls Lumberjacks"),
    ("DUF", "Dunmore Foxes"), ("EGC", "Eastgate Comets"), ("FHH", "Fairhaven Herons"),
    ("GWB", "Glenwood Badgers"), ("HPH", "Highpoint Hawks"), ("IBF", "Ironbridge Forge"),
    ("JNC", "Juniper Coyotes"), ("KPA", "Kingsport Anchors"), ("LML", "Lakemont Loons"),
    ("MBM", "Millbrook Millers"), ("NFW", "Northfield Wolves"), ("ORS", "Oakridge Stags"),
    ("PCR", "Pinecrest Ravens"), ("QHM", "Quarry Hill Miners"), ("RVO", "Riverton Otters"),
    ("SVP", "Silverton Prospectors"), ("TBB", "Thornbury Bison"), ("UPK", "Upland Kestrels"),
    ("VMV", "Valemont Voyagers"), ("WBW", "Westbrook Wildcats"), ("YBS", "Yarrow Bay Sharks"),
    ("ZCG", "Zephyr City Gales"), ("RSR", "Redstone Rockets"), ("BMJ", "Blue Mesa Javelinas"),
    ("CRM", "Copper Ridge Moose"), ("SSP", "Seaside Sandpipers"), ("GPG", "Granite Peak Goats"),
]

# (MLB Stats API 표기, 대략적 비중). 계주 출전(4명 이상)이 가능하도록 국가당 최소 인원을 보장한다.
NATIONS = [
    ("USA", 0.58), ("Dominican Republic", 0.15), ("Venezuela", 0.09), ("Puerto Rico", 0.03),
    ("Cuba", 0.03), ("Mexico", 0.025), ("Japan", 0.015), ("Canada", 0.015),
    ("Colombia", 0.012), ("Republic of Korea", 0.01), ("Panama", 0.01), ("Curacao", 0.01),
]
MIN_PER_NATION = 5
# 출생 국가와 대표 국가가 다른 선수 비율 (nation_overrides.csv 상황 재현용)
OVERRIDE_RATE = 0.02

BAT_SIDES = [("R", 0.55), ("L", 0.35), ("S", 0.10)]
POSITIONS = [
    ("C", 0.11), ("1B", 0.10), ("2B", 0.11), ("3B", 0.11), ("SS", 0.11),
    ("LF", 0.10), ("CF", 0.11), ("RF", 0.11), ("DH", 0.06),
]

FIRST_NAMES = [
    "Alden", "Bram", "Caius", "Dario", "Emil", "Fabian", "Gideon", "Hollis", "Ivo", "Jory",
    "Kael", "Lucan", "Matteo", "Nico", "Orrin", "Pax", "Quill", "Rafe", "Soren", "Tobin",
    "Ulric", "Vance", "Wren", "Xander", "Yuri", "Zev", "Anselm", "Beck", "Cyrus", "Dax",
    "Elio", "Finn", "Gael", "Hiro", "Isandro", "Joaquim", "Kenji", "Leif", "Milo", "Noam",
]
SURNAME_HEADS = [
    "Bar", "Cal", "Dor", "Fen", "Gar", "Hol", "Kes", "Lun", "Mar", "Nor",
    "Pel", "Quin", "Ros", "Sal", "Tor", "Val", "Wex", "Yor", "Zan", "Bel",
]
SURNAME_TAILS = [
    "ford", "ley", "ton", "wick", "more", "ridge", "dale", "vane", "croft", "well",
    "bourne", "stead", "mere", "holt", "garde",  # "by" 는 실존 선수 성(Norby)과 겹쳐서 뺌
]


def weighted_choice(rng: np.random.Generator, items: list[tuple[str, float]]) -> str:
    labels, weights = zip(*items)
    p = np.array(weights) / sum(weights)
    return str(rng.choice(labels, p=p))


def allocate_nations(rng: np.random.Generator, n: int) -> list[str]:
    total_w = sum(w for _, w in NATIONS)
    counts = {name: max(MIN_PER_NATION, round(w / total_w * n)) for name, w in NATIONS}
    counts["USA"] += n - sum(counts.values())  # 나머지는 최대 비중 국가로 맞춤
    pool = [name for name, c in counts.items() for _ in range(c)]
    rng.shuffle(pool)
    return pool


def make_names(rng: np.random.Generator, n: int) -> list[str]:
    names: set[str] = set()
    while len(names) < n:
        first = rng.choice(FIRST_NAMES)
        last = rng.choice(SURNAME_HEADS) + rng.choice(SURNAME_TAILS)
        names.add(f"{first} {last}")
    out = sorted(names)
    rng.shuffle(out)
    return out


def generate(seed: int, season: int) -> dict:
    rng = np.random.default_rng(seed)
    nations = allocate_nations(rng, N_PLAYERS)
    names = make_names(rng, N_PLAYERS)
    teams = [abbr for abbr, _ in TEAMS] * (N_PLAYERS // len(TEAMS))
    rng.shuffle(teams)
    nation_names = [name for name, _ in NATIONS]

    players = []
    for i in range(N_PLAYERS):
        speed = float(np.clip(rng.normal(SPEED_MEAN, SPEED_SD), SPEED_MIN, SPEED_MAX))
        speed = round(speed, 1)  # Savant 리더보드 표기 단위
        vmax = speed * FT_TO_M
        tau = float(np.clip(rng.normal(TAU_MEAN, TAU_SD), schema.TAU_MIN, schema.TAU_MAX))
        bat = weighted_choice(rng, BAT_SIDES)

        # 개인 기복: 잠재 변수 z 가 볼트 비율과 sigmaScale 을 함께 결정 (PLAN 4.3-6 과 같은 방향)
        z = float(rng.normal())
        runs = int(np.clip(round(np.exp(rng.normal(np.log(120), 0.6))), 10, 450))
        p_bolt = 1 / (1 + np.exp(-((speed - 29.6) * 2.2 + 0.6 * z)))
        bolts = int(rng.binomial(runs, p_bolt))
        sigma_scale = float(np.clip(1 + 0.2 * z, schema.SIGMA_SCALE_MIN, schema.SIGMA_SCALE_MAX))

        has_split = rng.random() < SPLIT_COVERAGE
        split90 = None
        if has_split:
            t90 = time_to_distance(DIST_90FT_M, vmax, tau)
            lefty = SAMPLE_LEFTY_ADVANTAGE if bat in ("L", "S") else 0.0
            split90 = round(float(t90 + SAMPLE_START_OFFSET - lefty + rng.normal(0, SAMPLE_SPLIT_NOISE_SD)), 2)

        nation = nations[i]
        birth = nation
        if rng.random() < OVERRIDE_RATE:
            birth = str(rng.choice([n for n in nation_names if n != nation]))

        players.append({
            "id": 900_001 + i,
            "name": names[i],
            "season": season,
            "team": teams[i],
            "birthCountry": birth,
            "nation": nation,
            "batSide": bat,
            "position": weighted_choice(rng, POSITIONS),
            "sprintSpeedFtS": speed,
            "competitiveRuns": runs,
            "bolts": bolts,
            "split90Sec": split90,
            "vmax": round(vmax, 4),
            "tau": tau,
            "tauImputed": not has_split,
            "sigmaScale": round(sigma_scale, 3),
        })

    # τ 결측 처리: 스플릿 있는 선수 중 스프린트 스피드 ±0.5 ft/s 이웃의 τ 중앙값 (PLAN 4.3-5)
    measured = [(p["sprintSpeedFtS"], p["tau"]) for p in players if not p["tauImputed"]]
    for p in players:
        if p["tauImputed"]:
            near = [t for s, t in measured if abs(s - p["sprintSpeedFtS"]) <= IMPUTE_WINDOW_FTS]
            p["tau"] = float(np.median(near)) if near else TAU_MEAN
        p["tau"] = round(p["tau"], 3)

    return {
        "season": season,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "isSample": True,
        "players": players,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--seed", type=int, default=20261022)
    ap.add_argument("--season", type=int, default=2026)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = ap.parse_args()

    data = generate(args.seed, args.season)
    schema.PlayersFile.model_validate(data)  # 저장 전에 스키마 검증

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    speeds = np.array([p["sprintSpeedFtS"] for p in data["players"]])
    taus = np.array([p["tau"] for p in data["players"]])
    imputed = sum(p["tauImputed"] for p in data["players"])
    print(f"wrote {args.out} ({len(data['players'])} players)")
    print(f"  sprint speed mean={speeds.mean():.2f} sd={speeds.std():.2f} min={speeds.min()} max={speeds.max()}")
    print(f"  tau median={np.median(taus):.3f} sd={taus.std():.3f}  imputed={imputed}")


if __name__ == "__main__":
    main()
