"""players.json 스키마 (PLAN.md 4.2). src/engine/types.ts 와 동일하게 유지할 것.

사용법:
    python pipeline/schema.py web/public/sample/players.sample.json [다른 파일 ...]
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

FT_TO_M = 0.3048
TAU_MIN, TAU_MAX = 0.5, 2.0
SIGMA_SCALE_MIN, SIGMA_SCALE_MAX = 0.6, 1.4
# 가상 선수 ID 대역. 실제 MLBAM ID와 겹치지 않게 9로 시작하는 6자리를 쓴다.
SAMPLE_ID_MIN, SAMPLE_ID_MAX = 900_000, 999_999


class Player(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: int = Field(gt=0)
    name: str = Field(min_length=1)
    season: int = Field(ge=2015)  # Statcast 스프린트 스피드는 2015년부터
    team: str = Field(min_length=2, max_length=4)
    birthCountry: str = Field(min_length=1)
    nation: str = Field(min_length=1)
    batSide: Literal["L", "R", "S"]
    position: str = Field(min_length=1)

    # 원본 데이터
    sprintSpeedFtS: float = Field(gt=15, lt=35)
    competitiveRuns: int = Field(ge=0)
    bolts: int = Field(ge=0)
    split90Sec: float | None = Field(default=None, gt=3, lt=7)

    # 파생 파라미터
    vmax: float = Field(gt=0)
    tau: float = Field(ge=TAU_MIN, le=TAU_MAX)
    tauImputed: bool
    sigmaScale: float = Field(ge=SIGMA_SCALE_MIN, le=SIGMA_SCALE_MAX)

    @model_validator(mode="after")
    def _consistency(self) -> Player:
        if self.bolts > self.competitiveRuns:
            raise ValueError(f"bolts({self.bolts}) > competitiveRuns({self.competitiveRuns})")
        if abs(self.vmax - self.sprintSpeedFtS * FT_TO_M) > 1e-3:
            raise ValueError(f"vmax({self.vmax}) != sprintSpeedFtS × {FT_TO_M}")
        if self.split90Sec is None and not self.tauImputed:
            raise ValueError("split90Sec 가 없으면 tauImputed 는 true 여야 함")
        return self


class PlayersFile(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    season: int
    generatedAt: str
    isSample: bool
    players: list[Player] = Field(min_length=1)

    @model_validator(mode="after")
    def _consistency(self) -> PlayersFile:
        ids = [p.id for p in self.players]
        if len(ids) != len(set(ids)):
            raise ValueError("중복된 선수 id 가 있음")
        wrong_season = [p.id for p in self.players if p.season != self.season]
        if wrong_season:
            raise ValueError(f"파일 season({self.season})과 다른 선수: {wrong_season[:5]}")
        if self.isSample:
            real_ids = [i for i in ids if not SAMPLE_ID_MIN <= i <= SAMPLE_ID_MAX]
            if real_ids:
                raise ValueError(f"샘플 파일에 가상 ID 대역 밖의 id 가 있음: {real_ids[:5]}")
        return self


def load(path: str | Path) -> PlayersFile:
    return PlayersFile.model_validate_json(Path(path).read_text(encoding="utf-8"))


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    failed = False
    for arg in argv:
        try:
            f = load(arg)
        except Exception as e:  # noqa: BLE001 — 파일별로 결과를 모두 출력
            failed = True
            print(f"FAIL {arg}\n{e}")
            continue
        teams = {p.team for p in f.players}
        nations = {p.nation for p in f.players}
        print(
            f"OK   {arg}: season={f.season} isSample={f.isSample} "
            f"players={len(f.players)} teams={len(teams)} nations={len(nations)}"
        )
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
