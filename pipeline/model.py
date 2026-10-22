"""운동 모델 (PLAN.md 5.1) 의 파이프라인용 사본. src/engine/kinematics.ts 와 같은 식을 쓴다."""

from __future__ import annotations

import math

FT_TO_M = 0.3048
DIST_90FT_M = 90 * FT_TO_M  # 27.432 m


def distance(t: float, vmax: float, tau: float, v0: float = 0.0) -> float:
    """t초 동안 달린 거리. v0=0 이면 정지 출발."""
    return vmax * t - (vmax - v0) * tau * (1 - math.exp(-t / tau))


def time_to_distance(d: float, vmax: float, tau: float, v0: float = 0.0, tol: float = 1e-7) -> float:
    """distance(t) = d 를 만족하는 t 를 이분법으로 구한다."""
    lo, hi = 0.0, 1.0
    while distance(hi, vmax, tau, v0) < d:
        hi *= 2
    while hi - lo > tol:
        mid = (lo + hi) / 2
        if distance(mid, vmax, tau, v0) < d:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2
