"""선수별 모델 파라미터 계산 → data/players.{season}.json  (PLAN.md 4.3, 로컬 전용)

입력: data/raw/{season}/sprint_speed.csv, running_splits.csv (fetch.py), people.json (people.py),
      pipeline/nation_overrides.csv
출력: data/players.{season}.json        (schema.py 검증 통과해야 저장)
      data/players.{season}.meta.json   (START_OFFSET, 좌타 계수 등 파이프라인이 정한 값과 로그)

사용법:
    python pipeline/params.py --season 2026
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

import schema
from fetch import ROOT, raw_dir
from model import DIST_90FT_M, FT_TO_M, distance
from people import load_cache

OVERRIDES_CSV = Path(__file__).resolve().parent / "nation_overrides.csv"

# --- 파이프라인 설정 ---------------------------------------------------------
TARGET_MEDIAN_TAU = 1.1  # START_OFFSET 은 리그 중앙값 τ 가 이 값이 되도록 정한다 (4.3-3)
TAU_MIN, TAU_MAX = schema.TAU_MIN, schema.TAU_MAX  # τ 피팅 범위 (4.3-4)
IMPUTE_WINDOW_FTS = 0.5  # τ 결측 시 스프린트 스피드 ±0.5 ft/s 이웃의 중앙값 (4.3-5)
SIGMA_SCALE_K = 0.2  # sigmaScale = clamp(1 + K·z, MIN, MAX) (4.3-6)
# 스위치히터의 스플릿 선택. 러닝 스플릿은 타석별로 행이 따로 있다.
#   "L"    : 좌타석 행 + 좌타 보정 (기본값. 좌타석에 더 자주 서므로)
#   "R"    : 우타석 행 (보정 없음)
#   "mean" : 양쪽 행을 각각 우타 기준으로 맞춘 뒤 평균
SWITCH_HITTER_SIDE = "L"

# --- Savant CSV 컬럼 매핑 (fetch.py 출력으로 확인한 실제 컬럼명, 2026 시즌) ---------
SS_COLS = {
    "id": "player_id",
    "name": "last_name, first_name",
    "team": "team",
    "team_id": "team_id",
    "position": "position",
    "runs": "competitive_runs",
    "bolts": "bolts",  # 볼트 0개면 빈 값(NaN) → 0 으로 채움
    "speed": "sprint_speed",
}
RS_COLS = {
    "id": "player_id",
    "bat_side": "bat_side",  # 'L' / 'R' 만 있음. 스위치히터는 타석별로 2행
    "split90": "seconds_since_hit_090",
}


def log(msg: str, logs: list[str]) -> None:
    print(msg)
    logs.append(msg)


def fit_tau(t90: float, vmax: float) -> tuple[float, str | None]:
    """d(t90; vmax, τ) = 90ft 를 만족하는 τ (이분법). 범위 밖이면 경계값과 사유를 돌려준다."""
    # d 는 τ 에 대해 감소함수: τ 가 작을수록(가속이 빠를수록) 같은 시간에 더 멀리 간다
    if distance(t90, vmax, TAU_MIN) < DIST_90FT_M:
        return TAU_MIN, "too_slow_for_tau_min"
    if distance(t90, vmax, TAU_MAX) > DIST_90FT_M:
        return TAU_MAX, "too_fast_for_tau_max"
    lo, hi = TAU_MIN, TAU_MAX
    while hi - lo > 1e-7:
        mid = (lo + hi) / 2
        if distance(t90, vmax, mid) > DIST_90FT_M:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2, None


def lefty_regression(rs: pd.DataFrame, speed: pd.Series) -> float:
    """split90 ~ a + b·sprint_speed + c·[좌타석] 의 c (좌타석 이점, 음수 기대).

    스위치히터는 양쪽 행을 모두 넣는다 → 같은 선수의 좌우 차이가 계수에 직접 반영된다.
    """
    df = rs.assign(speed=rs["id"].map(speed)).dropna(subset=["speed", "split90"])
    X = np.column_stack([np.ones(len(df)), df["speed"], (df["bat_side"] == "L").astype(float)])
    coef, *_ = np.linalg.lstsq(X, df["split90"].to_numpy(), rcond=None)
    return float(coef[2])


def choose_split(rs: pd.DataFrame, lefty_coef: float, switch_ids: set[int]) -> pd.DataFrame:
    """선수당 한 행: 원본 split90 과 우타 기준으로 보정한 split90_adj."""
    rs = rs.assign(split90_adj=rs["split90"] - np.where(rs["bat_side"] == "L", lefty_coef, 0.0))
    rows = []
    for pid, g in rs.groupby("id"):
        if pid in switch_ids and len(g) > 1:
            if SWITCH_HITTER_SIDE == "mean":
                rows.append({"id": pid, "split90": g["split90"].mean(), "split90_adj": g["split90_adj"].mean(),
                             "split_side": "mean"})
                continue
            pick = g[g["bat_side"] == SWITCH_HITTER_SIDE]
            g = pick if len(pick) else g
        r = g.iloc[0]
        rows.append({"id": pid, "split90": r["split90"], "split90_adj": r["split90_adj"], "split_side": r["bat_side"]})
    return pd.DataFrame(rows).set_index("id")


def taus_for_offset(df: pd.DataFrame, offset: float, col: str = "split90_adj") -> tuple[np.ndarray, list]:
    fits = [fit_tau(t - offset, v) for t, v in zip(df[col], df["vmax"])]
    return np.array([f[0] for f in fits]), [f[1] for f in fits]


def solve_start_offset(df: pd.DataFrame) -> float:
    """중앙값 τ = TARGET_MEDIAN_TAU 가 되는 START_OFFSET. offset 이 커질수록 t90 이 짧아져 τ 가 작아진다."""
    lo, hi = -2.0, 2.0
    for _ in range(60):
        mid = (lo + hi) / 2
        taus, _ = taus_for_offset(df, mid)
        if np.median(taus) > TARGET_MEDIAN_TAU:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def binomial_logit_fit(x: np.ndarray, k: np.ndarray, n: np.ndarray) -> np.ndarray:
    """bolts ~ Binomial(runs, logistic(a + b·x)) 를 IRLS 로 적합. [a, b] 반환."""
    X = np.column_stack([np.ones_like(x), x])
    beta = np.zeros(2)
    for _ in range(100):
        p = 1 / (1 + np.exp(-(X @ beta)))
        w = n * p * (1 - p) + 1e-12
        z = X @ beta + (k - n * p) / w
        new = np.linalg.solve(X.T @ (X * w[:, None]), X.T @ (w * z))
        if np.max(np.abs(new - beta)) < 1e-10:
            return new
        beta = new
    return beta


def sigma_scales(speed: np.ndarray, bolts: np.ndarray, runs: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """볼트 비율의 로지스틱 회귀 잔차(deviance) → 표준화 z → sigmaScale.

    Pearson 잔차는 기대 볼트가 거의 0인 선수가 볼트 몇 개만 찍어도 값이 폭발해서(2026: 왜도 4.0)
    표준화 후 대부분이 1 근처로 눌린다. deviance 잔차는 왜도 1.9로 중앙값이 1.0에 맞는다.
    """
    a, b = binomial_logit_fit(speed, bolts, runs)
    p = 1 / (1 + np.exp(-(a + b * speed)))
    k, n = bolts.astype(float), runs.astype(float)
    with np.errstate(divide="ignore", invalid="ignore"):
        t_hit = np.where(k > 0, k * np.log(k / (n * p)), 0.0)
        t_miss = np.where(n - k > 0, (n - k) * np.log((n - k) / (n * (1 - p))), 0.0)
    resid = np.sign(k - n * p) * np.sqrt(np.maximum(2 * (t_hit + t_miss), 0.0))
    z = (resid - resid.mean()) / resid.std()
    return np.clip(1 + SIGMA_SCALE_K * z, schema.SIGMA_SCALE_MIN, schema.SIGMA_SCALE_MAX), np.array([a, b])


def savant_name(s: str) -> str:
    last, _, first = s.partition(", ")
    return f"{first} {last}".strip()


def build(season: int, overrides_csv: Path = OVERRIDES_CSV) -> tuple[pd.DataFrame, dict]:
    """모든 중간 컬럼을 포함한 DataFrame 과 메타데이터 (validate.ipynb 에서도 사용)."""
    logs: list[str] = []
    d = raw_dir(season)
    ss = pd.read_csv(d / "sprint_speed.csv").rename(columns={v: k for k, v in SS_COLS.items()})[list(SS_COLS)]
    rs = pd.read_csv(d / "running_splits.csv").rename(columns={v: k for k, v in RS_COLS.items()})[list(RS_COLS)]
    people = load_cache(season)
    ss["bolts"] = ss["bolts"].fillna(0).astype(int)
    ss = ss.set_index("id")
    log(f"sprint_speed {len(ss)}명, running_splits {rs['id'].nunique()}명({len(rs)}행)", logs)

    # 1. vmax
    ss["vmax"] = ss["speed"] * FT_TO_M

    # 타석 방향: MLB Stats API 기준 (스위치히터 'S' 포함)
    missing_people = [i for i in ss.index if i not in people]
    if missing_people:
        log(f"[warn] people.json 에 없는 선수 {len(missing_people)}명: {missing_people[:10]}", logs)
    ss["batSide"] = [people.get(i, {}).get("batSide", {}).get("code") for i in ss.index]
    switch_ids = set(ss.index[ss["batSide"] == "S"])

    # 2. 좌타 보정 계수
    lefty_coef = lefty_regression(rs, ss["speed"])
    log(f"좌타석 계수 c = {lefty_coef:+.4f}s (split90 ~ speed + 좌타석)", logs)
    splits = choose_split(rs[rs["id"].isin(ss.index)], lefty_coef, switch_ids)
    ss = ss.join(splits)

    # 3–4. START_OFFSET 과 τ 피팅
    has = ss["split90_adj"].notna()
    start_offset = solve_start_offset(ss[has])
    taus, flags = taus_for_offset(ss[has], start_offset)
    ss.loc[has, "tau"] = taus
    ss.loc[has, "tauFlag"] = flags
    ss.loc[has, "tauRaw"] = taus_for_offset(ss[has], start_offset, col="split90")[0]  # 보정 전 (비교용)
    log(f"START_OFFSET = {start_offset:+.4f}s → 중앙값 τ = {np.median(taus):.4f}", logs)
    for flag, g in ss[ss["tauFlag"].notna()].groupby("tauFlag"):
        names = ", ".join(f"{savant_name(n)}({t:.2f}s)" for n, t in zip(g["name"], g["split90_adj"]))
        log(f"[clip] τ 범위 밖 {flag}: {len(g)}명 — {names}", logs)

    # 5. τ 결측 처리
    measured = ss[has]
    ss["tauImputed"] = ~has
    for pid in ss.index[~has]:
        near = measured.loc[(measured["speed"] - ss.at[pid, "speed"]).abs() <= IMPUTE_WINDOW_FTS, "tau"]
        ss.at[pid, "tau"] = near.median() if len(near) else TARGET_MEDIAN_TAU
    log(f"τ 추정(스플릿 없음): {int((~has).sum())}명 / {len(ss)}명 ({(~has).mean():.1%})", logs)

    # 6. sigmaScale
    ss["sigmaScale"], bolt_coef = sigma_scales(ss["speed"].to_numpy(), ss["bolts"].to_numpy(), ss["runs"].to_numpy())
    log(f"볼트 로지스틱 회귀: logit p = {bolt_coef[0]:.3f} + {bolt_coef[1]:.3f}·speed", logs)

    # 7. 소속팀: Savant 시즌 팀 기본, 없으면 MLB Stats API currentTeam
    id_to_abbr = dict(zip(ss["team_id"], ss["team"]))
    moved_mlb, moved_other, filled = [], 0, 0
    for pid in ss.index:
        cur = people.get(pid, {}).get("currentTeam", {}).get("id")
        if pd.isna(ss.at[pid, "team"]) and cur in id_to_abbr:
            ss.at[pid, "team"] = id_to_abbr[cur]
            filled += 1
        elif cur in id_to_abbr and cur != ss.at[pid, "team_id"]:
            moved_mlb.append(f"{savant_name(ss.at[pid, 'name'])}: {ss.at[pid, 'team']}→{id_to_abbr[cur]}")
        elif cur is not None and cur not in id_to_abbr:
            moved_other += 1  # 마이너 구단 등 MLB 30개 팀 밖
    log(f"소속팀: Savant 시즌 팀 사용. 비어 있어 currentTeam 으로 채운 선수 {filled}명", logs)
    log(f"  현재 다른 MLB 팀 소속 {len(moved_mlb)}명 (Savant 팀 유지): " + "; ".join(moved_mlb), logs)
    log(f"  현재 MLB 30개 팀 밖(마이너 등) 소속 {moved_other}명 (Savant 팀 유지)", logs)

    # 8. 대표 국가
    ss["birthCountry"] = [people.get(i, {}).get("birthCountry", "Unknown") for i in ss.index]
    ss["nation"] = ss["birthCountry"]
    ov = pd.read_csv(overrides_csv, dtype={"player_id": int, "nation": str, "note": str})
    applied = []
    for r in ov.itertuples():
        if r.player_id in ss.index:
            applied.append(f"{r.player_id}: {ss.at[r.player_id, 'nation']}→{r.nation}")
            ss.at[r.player_id, "nation"] = r.nation
    missing = int((~ov["player_id"].isin(ss.index)).sum())
    log(f"nation overrides 적용: {len(applied)}건 {'; '.join(applied)}", logs)
    if missing:
        log(f"[warn] overrides 중 이번 시즌 선수 목록에 없는 id {missing}건 (무시)", logs)

    ss["fullName"] = [people.get(i, {}).get("fullName") or savant_name(ss.at[i, "name"]) for i in ss.index]
    meta = {
        "season": season,
        "startOffset": start_offset,
        "leftyCoef": lefty_coef,
        "switchHitterSide": SWITCH_HITTER_SIDE,
        "boltLogit": bolt_coef.tolist(),
        "logs": logs,
    }
    return ss, meta


def to_players_file(ss: pd.DataFrame, season: int) -> dict:
    players = []
    for pid, r in ss.sort_values("speed", ascending=False).iterrows():
        players.append({
            "id": int(pid),
            "name": str(r["fullName"]),
            "season": season,
            "team": str(r["team"]),
            "birthCountry": str(r["birthCountry"]),
            "nation": str(r["nation"]),
            "batSide": str(r["batSide"]),
            "position": str(r["position"]),
            "sprintSpeedFtS": float(r["speed"]),
            "competitiveRuns": int(r["runs"]),
            "bolts": int(r["bolts"]),
            "split90Sec": None if pd.isna(r["split90"]) else round(float(r["split90"]), 2),
            "vmax": round(float(r["vmax"]), 4),
            "tau": round(float(r["tau"]), 4),
            "tauImputed": bool(r["tauImputed"]),
            "sigmaScale": round(float(r["sigmaScale"]), 4),
        })
    return {
        "season": season,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "isSample": False,
        "players": players,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--season", type=int, required=True)
    ap.add_argument("--overrides", type=Path, default=OVERRIDES_CSV, help="대표 국가 덮어쓰기 CSV (player_id,nation,note)")
    ap.add_argument("--out", type=Path, default=None, help="출력 경로 (기본 data/players.{season}.json)")
    args = ap.parse_args()

    ss, meta = build(args.season, args.overrides)
    data = to_players_file(ss, args.season)
    schema.PlayersFile.model_validate(data)

    out = args.out or ROOT / "data" / f"players.{args.season}.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    out.with_suffix(".meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {out} ({len(data['players'])} players)")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
