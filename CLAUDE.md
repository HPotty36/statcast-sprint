# CLAUDE.md — statcast-sprint

MLB 야수의 Statcast 주루 데이터로 100m 기록을 추정하고 100m·4×100m 계주를 시뮬레이션하는 브라우저 게임.
전체 명세와 단계별 완료 기준은 [PLAN.md](PLAN.md). **한 번에 한 Phase씩 진행하고, Phase가 끝나면 완료 기준을 하나씩 확인한 뒤 멈춰서 보고한다.**

## 핵심 규칙 (모든 Phase)

1. **실데이터 커밋 금지** — 실제 Statcast/선수 데이터는 `data/`, `web/public/data/`에만 두고 둘 다 gitignored. 저장소에는 가상 선수 샘플(`web/public/sample/players.sample.json`, ID 900001~)만 커밋. 배포 빌드는 `VITE_DATA=sample`로 샘플만 사용.
2. **데이터 영역 / 게임 영역 분리** — vmax·τ는 데이터, 출발 반응·바람·기복·바통 터치는 게임 규칙. 코드와 UI에서 구분이 보이게. 기록은 항상 "추정 기록"으로 표기.
3. **엔진은 순수 TS** — `src/engine/`은 DOM·React에 의존하지 않고 Node에서 단독 실행·테스트 가능해야 한다 (ESLint가 `window`/`document`/react import를 막음).
4. **재현성** — 난수는 시드 RNG(`src/engine/rng.ts`)에서만. `Math.random()` 금지 (ESLint 에러). 같은 시드 + 같은 입력 = 같은 결과.
5. **설정값 중앙화** — 모델 상수·대회 규칙 숫자는 전부 `src/engine/config.ts`. 하드코딩 금지.
6. **컬럼명 추측 금지** — Savant CSV는 받은 뒤 실제 컬럼명을 출력해 확인하고 매핑한다.

## 구조

```
pipeline/        Python, 로컬 전용 (fetch.py, people.py, params.py, sample.py, schema.py, model.py)
data/            gitignored — raw CSV, players.{season}.json
src/engine/      순수 TS 엔진 (types, config, rng, kinematics, race100, relay, delegations, tournament, medals)
src/ui/          React 화면
scripts/         calibrate.ts, run-event.ts (CLI)
tests/           Vitest (tests/**/*.test.ts)
web/public/      Vite publicDir — sample/ 커밋, data/ gitignored
```

- 제품 맥락은 [PRODUCT.md](PRODUCT.md), 화면 디자인 시스템(Race Bib: 토큰·서체·색 규칙)은 [DESIGN.md](DESIGN.md). UI 를 바꿀 때 DESIGN.md 의 규칙을 따른다 (주황은 주요 동작·진행 중 상태, 파랑은 데이터 값만).
- `players.json` 스키마는 `src/engine/types.ts`와 `pipeline/schema.py` 두 곳에 있다. 바꿀 때 둘 다 수정.
- 운동 모델 식은 `src/engine/kinematics.ts`와 `pipeline/model.py`가 같은 식을 쓴다.

## 명령

```
npm run dev | npm test | npm run lint | npm run typecheck | npm run build
npm run event -- --seed 2026 [--verbose] [--data <players.json>]   # CLI 팀별 대회 전체 + 메달 테이블 (Node 타입 스트리핑으로 .ts 직접 실행)
npm run calibrate -- --data data/players.2026.json [--sweep] [--sigma-vmax x --sigma-tau y --fail-safe z]   # 몬테카를로 캘리브레이션
python -m venv .venv && .venv/Scripts/python -m pip install -r pipeline/requirements.txt
.venv/Scripts/python pipeline/sample.py          # 샘플 재생성 (+스키마 검증)
.venv/Scripts/python pipeline/schema.py <json>   # players.json 검증

# 실데이터 파이프라인 (로컬 전용, 결과는 전부 data/ 아래)
.venv/Scripts/python pipeline/fetch.py --season 2026    # Savant CSV → data/raw/2026/
.venv/Scripts/python pipeline/people.py --season 2026   # MLB Stats API → data/raw/2026/people.json (캐시)
.venv/Scripts/python pipeline/params.py --season 2026   # → data/players.2026.json (+ .meta.json)
```

- `pipeline/notebooks/validate.ipynb`는 **출력 없이** 커밋한다 (출력에 실제 선수가 들어감). 실행 결과는 `data/`에 저장.
- Python 3.14 + Windows에서는 Jupyter 커널이 시작되지 않는 문제가 있다 (WinError 10014). 노트북을 Jupyter로 돌리려면 Python 3.12/3.13 가상환경을 쓴다.

Windows PowerShell에서 `npm`이 다른 실행 파일에 가려지면 `npm.cmd`를 쓴다.
