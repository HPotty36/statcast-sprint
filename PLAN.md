# Statcast 단거리 대회 — 개발 계획

MLB 야수들의 Statcast 주루 데이터로 100m 기록을 추정하고, 올림픽 룰에 맞춘 **100m**와 **4×100m 계주**를 시뮬레이션하는 브라우저 게임.
**팀별 대항(MLB 30개 팀)**과 **국가별 대항(출생 국가)** 두 모드를 지원한다.

> **Claude Code 사용법**: 이 파일을 저장소 루트에 `PLAN.md`로 두고 "PLAN.md의 Phase 0부터 진행해줘. Phase 하나가 끝나면 완료 기준을 하나씩 확인하고 멈춰서 보고해줘"라고 요청한다. 한 번에 한 Phase씩 진행한다.

---

## 1. 범위

**포함**
- 종목: 100m 개인전, 4×100m 계주 (실제 올림픽 종목만)
- 모드: 팀별(먼저 구현), 국가별(나중에 구현)
- 시즌 선택, 시드 기반 재현 가능한 레이스, 메달 테이블

**제외 (만들지 않음)**
- 200m 이상 종목, 곡선 주로, 레이스 후반 감속 구간 모델링
- 레인에 따른 기록 차이 (레인은 표시용)
- 투수 (주루 데이터가 거의 없음. 데이터가 있는 투타겸업 선수만 자연스럽게 포함)
- 멀티플레이, 계정, 수익화

---

## 2. 핵심 규칙 (모든 Phase에서 지킬 것)

1. **라이선스**: 실제 Statcast 데이터와 실제 선수 데이터는 절대 커밋하지 않는다. `data/`와 `web/public/data/`는 `.gitignore`에 넣는다. 저장소에는 **가상 선수 샘플 데이터**만 커밋한다. 공개 배포 빌드는 샘플 데이터만 사용한다.
2. **데이터 영역과 게임 영역 분리**: 최고 속도·가속은 데이터에서 나오고, 출발 반응·바람·기복·바통 터치는 게임 규칙에서 나온다. 코드와 UI 모두 이 구분이 보이게 한다. 기록은 항상 "추정 기록"으로 표기한다.
3. **엔진은 UI와 분리**: 시뮬레이션 엔진은 DOM에 의존하지 않는 순수 TypeScript 함수로 작성한다. Node에서 단독 실행·테스트할 수 있어야 한다.
4. **재현성**: 모든 난수는 시드 기반 RNG에서만 나온다. `Math.random()` 사용 금지. 같은 시드 + 같은 입력 = 같은 결과.
5. **설정값 중앙화**: 모델 상수와 대회 규칙 숫자는 전부 `src/engine/config.ts`에 모은다. 하드코딩 금지.
6. **컬럼명 추측 금지**: Savant CSV를 처음 받으면 실제 컬럼명을 출력해서 확인한 뒤 매핑한다.

---

## 3. 기술 스택과 저장소 구조

- 데이터 파이프라인: Python 3.11+, pandas, pybaseball, requests, pydantic
- 게임: TypeScript, Vite, React, Canvas 2D (레이스 애니메이션), Vitest
- 배포: GitHub Pages (샘플 데이터 빌드)

```
statcast-sprint/
├── PLAN.md
├── CLAUDE.md
├── .gitignore              # data/, web/public/data/ 포함
├── pipeline/               # Python, 로컬에서만 실행
│   ├── fetch.py            # Savant CSV 수집
│   ├── people.py           # MLB Stats API (출생 국가, 타석, 소속팀)
│   ├── params.py           # 선수별 모델 파라미터 계산 → players.json
│   ├── sample.py           # 가상 선수 샘플 데이터 생성
│   ├── schema.py           # pydantic 스키마 (players.json 검증)
│   ├── nation_overrides.csv
│   └── notebooks/validate.ipynb
├── data/                   # gitignored
│   ├── raw/{season}/
│   └── players.{season}.json
├── src/
│   ├── engine/             # 순수 TS, DOM 의존 금지
│   │   ├── config.ts
│   │   ├── types.ts
│   │   ├── rng.ts
│   │   ├── kinematics.ts
│   │   ├── race100.ts
│   │   ├── relay.ts
│   │   ├── delegations.ts
│   │   ├── tournament.ts
│   │   └── medals.ts
│   └── ui/                 # React 컴포넌트, 화면
├── scripts/
│   ├── calibrate.ts        # 몬테카를로 캘리브레이션
│   └── run-event.ts        # CLI로 대회 한 번 실행·출력
├── tests/                  # Vitest
└── web/public/
    ├── sample/players.sample.json   # 커밋됨 (가상 선수)
    └── data/                         # gitignored (실데이터 복사 위치)
```

---

## 4. 데이터

### 4.1 소스

| 데이터 | 출처 | 비고 |
|---|---|---|
| 스프린트 스피드, 볼트 수, 질주 기회 수 | `pybaseball.statcast_sprint_speed(year, min_opp=10)` 또는 `https://baseballsavant.mlb.com/leaderboard/sprint_speed?year={year}&position=&team=&min={min}&csv=true` | ft/s |
| 90ft 러닝 스플릿 | `pybaseball.statcast_running_splits(year, min_opp=5, raw_splits=True)` 또는 `https://baseballsavant.mlb.com/running_splits?type=raw&bats=&year={year}&position=&team=&min={min}&csv=true` | 타격 시점부터 5ft 단위 누적 시간 |
| 출생 국가, 타석 방향, 소속팀 | `https://statsapi.mlb.com/api/v1/people?personIds={ids}&hydrate=currentTeam` (100명 단위 배치) | 선수 ID가 Savant와 같은 체계라 바로 조인 |

- pybaseball은 유지보수가 불규칙하므로, 함수가 실패하면 위 URL로 직접 받는다.
- 클라우드 환경에서는 Savant 접속이 막힐 수 있다. 파이프라인은 로컬 실행을 전제로 한다.

### 4.2 `players.json` 스키마

```ts
interface Player {
  id: number;                // MLBAM ID
  name: string;
  season: number;
  team: string;              // 팀 약어
  birthCountry: string;      // MLB Stats API 원본 값
  nation: string;            // overrides 반영 후 대표 국가
  batSide: 'L' | 'R' | 'S';
  position: string;

  // 원본 데이터
  sprintSpeedFtS: number;
  competitiveRuns: number;
  bolts: number;
  split90Sec: number | null; // 러닝 스플릿 리더보드에 없으면 null

  // 파생 파라미터 (params.py가 계산)
  vmax: number;              // m/s
  tau: number;               // s
  tauImputed: boolean;       // 스플릿 없어서 추정값을 썼는지
  sigmaScale: number;        // 개인 기복 배수 (기본 1.0)
}

interface PlayersFile {
  season: number;
  generatedAt: string;
  isSample: boolean;
  players: Player[];
}
```

### 4.3 파라미터 계산 (`params.py`)

1. **vmax** = `sprintSpeedFtS × 0.3048`
2. **타석 방향 보정**: 러닝 스플릿은 좌타자가 1루에 가깝고 출발 자세도 달라서 유리하다. `split90Sec ~ sprintSpeedFtS + batSide` 회귀로 좌타 계수를 구해 좌타자 기록을 우타 기준으로 보정한다. 스위치히터는 좌타석에 더 자주 서므로 좌타 보정을 적용한다(설정으로 변경 가능).
3. **START_OFFSET**: 스플릿은 타격 시점부터라 스윙 후 출발까지 시간이 섞여 있다. `t90 = split90_보정 − START_OFFSET`. START_OFFSET은 **리그 중앙값 τ가 1.1초가 되도록** 정한다.
4. **τ 피팅**: `d(t90; vmax, τ) = 27.432m`(90ft)를 만족하는 τ를 이분법으로 구한다(범위 0.5~2.0). 범위 밖이면 경계값으로 자르고 로그를 남긴다.
5. **τ 결측 처리**: 스플릿이 없는 선수는 스프린트 스피드가 비슷한 선수들(±0.5 ft/s)의 τ 중앙값을 쓰고 `tauImputed: true`.
6. **sigmaScale (개인 기복)**: 볼트 비율 `bolts / competitiveRuns`을 스프린트 스피드에 대해 로지스틱 회귀한 뒤, 잔차를 표준화해서 `sigmaScale = clamp(1 + 0.2 × z, 0.6, 1.4)`. 평균이 비슷해도 최고치를 자주 찍는 선수가 기복이 크게 나온다.
7. **소속팀 규칙**: Savant 리더보드의 해당 시즌 팀 값을 기본으로 쓰고, 없으면 MLB Stats API currentTeam. 트레이드된 선수 처리 결과를 로그로 출력한다.
8. **대표 국가**: `birthCountry` 기본, `nation_overrides.csv`(player_id, nation, note)로 덮어쓴다. 푸에르토리코는 별도 국가로 취급한다.

### 4.4 참고 수치 (검증용)

`d(t) = vmax × (t − τ(1 − e^(−t/τ)))` 기준, 출발 반응 시간 제외:

| 스프린트 스피드 | τ | 30m | 90ft | 100m |
|---|---|---|---|---|
| 30.5 ft/s | 1.1 | 4.31s | 4.02s | 11.86s |
| 29.0 ft/s | 1.1 | 4.48s | — | 12.41s |
| 27.0 ft/s | 1.1 | 4.73s | 4.41s | 13.25s |
| 25.0 ft/s | 1.1 | 5.03s | — | 14.22s |

---

## 5. 시뮬레이션 모델 (엔진 명세)

### 5.1 운동 모델 (`kinematics.ts`)

- 정지 출발: `v(t) = vmax(1 − e^(−t/τ))`, `d(t) = vmax(t − τ(1 − e^(−t/τ)))`
- 플라잉 출발(계주 2~4번): 진입 속도 v0에서 시작
  `v(t) = vmax − (vmax − v0)e^(−t/τ)`, `d(t) = vmax·t − (vmax − v0)τ(1 − e^(−t/τ))`
- `timeToDistance(distance, params)`: 이분법으로 역산 (오차 1e-6초 이하)

### 5.2 100m 한 레이스 (`race100.ts`)

선수별로 레이스마다 아래를 샘플링한다.
- 레이스 vmax = `vmax + N(0, SIGMA_VMAX × sigmaScale)`
- 레이스 τ = `τ + N(0, SIGMA_TAU)`
- 출발 반응 시간 RT ~ `N(RT_MEAN, RT_SD)`, 하한 0.08초. **RT < 0.100초면 부정출발 실격(DQ)**
- 바람 w: 조(heat) 단위로 1회 샘플링, 같은 조 전원 동일 적용. `N(WIND_MEAN, WIND_SD)`를 [-3.0, +4.0]으로 자름

기록 계산:
- `t100 = RT + timeToDistance(100) × (1 − WIND_K × w)`
- 공식 기록은 반응 시간을 포함한다(실제 육상과 동일)
- 풍속 +2.0 m/s 초과면 "풍속 초과" 표시, 게임 내 기록(시즌 최고·대회 기록)으로 인정하지 않음
- 30m, 60m 스플릿도 함께 반환
- 애니메이션용 궤적: 50ms 간격의 (시간, 위치) 배열
- 표시 단위는 0.01초, 순위 판정은 0.001초, 그래도 같으면 시드 RNG로 결정

### 5.3 4×100m 계주 (`relay.ts`)

- 1번 주자: 100m와 같은 정지 출발 (RT, 부정출발 포함)
- 2~4번 주자: 플라잉 출발, 각자 100m 구간
- 바통 터치는 구간마다 플레이어가 선택:
  - `safe`: 진입 속도 v0 = `ENTRY_SAFE × vmax`, 실패 확률 `FAIL_SAFE`
  - `aggressive`: 진입 속도 v0 = `ENTRY_AGGR × vmax`, 실패 확률 `FAIL_AGGR`
  - 실패 = 바통 놓침 → 해당 팀 실격(DNF)
- 구간별 기록과 누적 기록을 반환. 계주 1·3구간 곡선은 모델링하지 않는다.
- 참고: 30.5 ft/s 선수 4명, τ 1.1, 진입 0.85×vmax면 팀 기록 약 44.8초

### 5.4 설정 초기값 (`config.ts`)

| 상수 | 초기값 | 비고 |
|---|---|---|
| SIGMA_VMAX | 0.08 m/s | 캘리브레이션으로 조정 |
| SIGMA_TAU | 0.04 s | 캘리브레이션으로 조정 |
| RT_MEAN / RT_SD | 0.170 / 0.022 s | 8인 레이스 부정출발 약 0.6% |
| WIND_MEAN / WIND_SD | 0.5 / 1.0 m/s | |
| WIND_K | 0.005 | 2 m/s 뒷바람이면 12초 기록이 약 0.12초 단축 |
| ENTRY_SAFE / ENTRY_AGGR | 0.80 / 0.88 | |
| FAIL_SAFE / FAIL_AGGR | 0.005 / 0.03 | 구간당 |
| START_OFFSET | 파이프라인에서 결정 | 리그 중앙값 τ = 1.1 기준 |

---

## 6. 대회 구조

### 6.1 대표단 추상화 (`delegations.ts`)

국가와 팀은 엔진 입장에서 같은 "대표단(Delegation)"이다. 묶는 기준과 정원만 모드 설정으로 다르다.

```ts
interface ModeConfig {
  id: 'team' | 'nation';
  groupBy: (p: Player) => string;
  max100mEntries: number;        // 대표단당 100m 최대 출전 인원
  relayMinRunners: number;       // 4
  relayMaxTeams: number | 'all'; // 계주 출전 대표단 수 상한
  formats: { m100: EventFormat; relay: EventFormat };
}
```

- 기본 엔트리 선발: 대표단 안에서 기대 기록 순 자동 선발, UI에서 수동 변경 가능
- 계주 기본 오더: 1번 = τ가 가장 작은 선수(가속형), 4번 = vmax가 가장 높은 선수, 나머지는 vmax 순

### 6.2 라운드 진행 (`tournament.ts`)

- 한 조 최대 8명(8레인)
- 조 편성: 기대 기록 순 지그재그(serpentine) 배정으로 조간 전력 균형
- 진출 규칙: 다음 라운드 정원 N, 조 수 H일 때 기본값은 조별 순위 통과 `Q = floor(N / H)`명, 나머지 `N − Q×H`명은 전체 기록 순 추가 통과(q). `EventFormat`에서 조별 통과 인원을 직접 지정하면 그 값을 우선한다(예: 국가별 계주 예선은 조 3위까지 + 기록 2팀). 결과표에 Q/q 표시
- 출전 인원이 8명 이하면 결승만, 24명 이하면 준결승부터
- 레인 배정: 준결승·결승에서 상위 시드 4명을 3~6번 레인에 배치 (표시용)
- 메달 테이블: 금 → 은 → 동 개수 순 정렬

### 6.3 모드별 규칙

| | 팀별 (먼저 구현) | 국가별 |
|---|---|---|
| 대표단 | MLB 30개 팀 | 출생 국가 (+overrides) |
| 100m 정원 | 팀당 최대 2명 | 국가당 최대 3명 (올림픽과 동일) |
| 100m 진행 | 예선 → 준결승 24명 → 결승 8명 | 같음 |
| 계주 출전 | 30팀 전원 | 4명 이상 보유국 중 기대 합산 기록 상위 16개국 |
| 계주 진행 | 예선 4개 조 → 결승 8팀 | 예선 2개 조(조 3위 + 기록 2팀) → 결승 8팀 |

---

## 7. 화면 (UI)

1. **홈**: 모드(팀별/국가별), 시즌, 시드 입력(비우면 랜덤)
2. **엔트리**: 대표단 목록, 대표단별 출전 선수 확인·변경, 선수 카드(스프린트 스피드, τ, 추정 100m)
3. **100m 진행**: 라운드·조 목록 → 레이스 재생 → 결과표 (순위, 기록, RT, 풍속, 30/60m 스플릿, Q/q, DQ)
4. **계주 오더**: 주자 순서 드래그 편성, 구간별 바통 터치 safe/aggressive 선택. 내가 고르지 않은 대표단은 기본 오더 + safe
5. **계주 진행**: 레이스 재생(바통 터치 지점 표시) → 구간 기록 포함 결과표
6. **메달 테이블**

레이스 재생:
- 엔진이 계산한 궤적을 Canvas에서 재생만 한다 (재생 중 계산 없음)
- 1×/2×/결과 바로 보기, 30m·60m 지점 표시
- 모바일 세로 화면 우선, 레인은 가로 방향

공통:
- URL에 `mode`, `season`, `seed`를 넣어 같은 대회를 공유·재현
- 모든 기록 옆에 "추정 기록" 표기, 하단에 데이터 출처(Baseball Savant)와 비공식 팬 프로젝트 문구

데이터 로딩:
- `web/public/data/players.{season}.json`이 있으면 실데이터, 없으면 `web/public/sample/players.sample.json`
- 환경변수 `VITE_DATA=sample`이면 무조건 샘플 (배포 빌드에서 고정)

---

## 8. 단계별 작업과 완료 기준

### Phase 0 — 스캐폴딩
- Vite + React + TS 프로젝트, Vitest, ESLint 설정
- Python 가상환경과 `pipeline/requirements.txt`
- `.gitignore`에 `data/`, `web/public/data/` 추가
- 이 문서의 "핵심 규칙"과 디렉터리 구조를 요약한 `CLAUDE.md` 작성
- `pipeline/sample.py`: 가상 선수 300명, 가상 팀 30개(실제 팀명·로고 사용 금지), 국가 12개 정도. 초기 분포는 스프린트 스피드 N(27, 1.5)를 [23, 31]로 자름, τ N(1.1, 0.12)
- **완료 기준**: `npm test` 통과(빈 테스트라도), `npm run dev`로 빈 화면 표시, `players.sample.json`이 스키마 검증 통과, `git status`에 실데이터 없음

### Phase 1 — 데이터 파이프라인 (로컬 실행)
- `fetch.py --season {year}`: CSV 저장 후 컬럼명과 상위 5행 출력, 확인 후 컬럼 매핑 상수 작성
- `people.py`: MLB Stats API 배치 조회, 응답 캐시
- `params.py`: 4.3절 순서대로 계산, `data/players.{season}.json` 출력
- `validate.ipynb`: 추정 100m 기록 분포, 상위 20명, 타석 방향별 τ 분포(보정 전후), 스프린트 스피드 대 100m 산점도, τ 결측 비율
- 실데이터 분포의 평균·표준편차만 참고해 `sample.py` 분포를 업데이트
- **완료 기준**: 최근 완료 시즌 하나로 `players.json` 생성, 리그 중앙값 τ ≈ 1.1, 반응 시간 제외 추정 기록이 최상위 11초대 후반~12초 초반, 평균 13초 안팎, 보정 후 좌우타 τ 중앙값 차이 0.03초 이내

### Phase 2 — 엔진 코어
- `rng.ts`: mulberry32 + Box-Muller 정규분포, `fork(seed, key)`로 조·선수별 하위 스트림 생성
- `kinematics.ts`, `race100.ts`, `relay.ts`
- **테스트**:
  - 닫힌 해 `d(t)`가 수치 적분과 1e-6 이내로 일치
  - vmax 9.30, τ 1.1 → 100m 11.86초 ±0.01 (반응 제외), 90ft 4.02초 ±0.01
  - 다른 조건이 같으면 vmax가 높을수록 기대 기록이 빠름
  - 같은 시드 → 완전히 같은 결과, 다른 시드 → 다른 결과
  - RT < 0.100 → DQ
  - 계주: 바통 실패 시 DNF, 구간 기록 합 = 팀 기록
- **완료 기준**: 테스트 전부 통과, `scripts/run-event.ts`로 샘플 데이터 100m 한 조 결과를 터미널에 출력

### Phase 3 — 대회 로직 + 캘리브레이션 (팀별 모드)
- `delegations.ts`, `tournament.ts`, `medals.ts`, 팀별 `ModeConfig`
- `scripts/calibrate.ts`: 결승 10,000회 시뮬레이션 후 아래 지표 출력
  - 기대 기록 1위의 결승 우승 확률 → 목표 45~55%
  - 기대 기록 1위의 메달 확률
  - 레이스당 부정출발 비율 → 목표 1% 이하
  - 계주 팀당 DNF 비율 → 목표 2~5%
  - 우승 기록 분포
- 목표를 벗어나면 `SIGMA_VMAX`, `SIGMA_TAU`, `FAIL_*`를 조정하고 최종값과 근거를 `config.ts` 주석에 기록
- **테스트**: 라운드별 인원 수, Q/q 계산, 팀당 정원 준수, 지그재그 편성
- **완료 기준**: CLI로 팀별 모드 100m·계주 전체 대회가 끝까지 돌고 메달 테이블 출력, 캘리브레이션 지표가 목표 범위 안

### Phase 4 — 100m UI (팀별 모드)
- 홈 → 엔트리 → 100m 진행 → 결과 화면
- Canvas 레이스 재생, 스플릿 표시, 결과표
- **완료 기준**: 샘플 데이터로 예선부터 결승까지 브라우저에서 진행 가능, 모바일 폭(375px)에서 가로 스크롤 없음

### Phase 5 — 계주 UI
- 오더 편성(드래그), 바통 터치 선택, 계주 재생과 결과
- **완료 기준**: 팀별 모드 계주 예선 → 결승 진행, 바통 실패가 화면에 표시됨

### Phase 6 — 국가별 모드
- 국가별 `ModeConfig`, `nation_overrides.csv` 적용, 계주 출전 자격(4명 이상, 상위 16개국)
- 국기 표시는 이모지로 처리 (이미지 에셋 불필요)
- **완료 기준**: 국가당 100m 3명 제한 준수, 계주 16개국 선발 로직 테스트 통과, 모드 전환 시 같은 엔진으로 동작

### Phase 7 — 마무리
- 시즌 선택, URL 공유(mode/season/seed), 메달 테이블 화면
- README: 프로젝트 소개, 파이프라인 로컬 실행 방법, 비공식 팬 프로젝트이며 데이터는 각자 받는다는 안내
- GitHub Actions로 `VITE_DATA=sample` 빌드 → GitHub Pages 배포. 빌드 결과물에 `data/` 경로 파일이 있으면 실패하는 검사 추가
- **완료 기준**: 배포된 페이지가 샘플 데이터로 정상 동작, 같은 URL을 다시 열면 같은 결과

---

## 9. 결정 필요 사항 (기본값으로 진행하고 나중에 바꿀 수 있음)

| 항목 | 기본값 |
|---|---|
| 기본 시즌 | 가장 최근 완료 시즌 |
| 트레이드 선수 소속팀 | Savant 리더보드의 해당 시즌 팀 |
| 팀별 모드 100m 정원 | 팀당 2명 |
| 스위치히터 타석 보정 | 좌타 보정 적용 |
| 결승 우승 확률 목표 | 45~55% |
