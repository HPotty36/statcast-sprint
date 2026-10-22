import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'ko' | 'en';
type ModeId = 'team' | 'nation';
const UNIT_KO: Record<ModeId, string> = { team: '팀', nation: '국가' };
/** 조사까지 붙인 형태 (팀을 / 국가를, 팀은 / 국가는) */
const UNIT_KO_OBJ: Record<ModeId, string> = { team: '팀을', nation: '국가를' };
const UNIT_KO_TOPIC: Record<ModeId, string> = { team: '팀은', nation: '국가는' };
const UNIT_EN: Record<ModeId, string> = { team: 'team', nation: 'nation' };

const ko = {
  appName: 'Statcast 단거리 대회',
  appTagline: 'MLB 야수들의 Statcast 주루 데이터로 추정한 100m',
  language: 'English',
  estimated: '추정 기록',
  footerEstimate: '모든 기록은 Statcast 주루 데이터로 추정한 기록입니다.',
  footerSample: '선수와 팀은 모두 가상 샘플 데이터이며, 기록은 Statcast 주루 모델로 추정한 값입니다.',
  sampleShort: '샘플',
  footerSource: '데이터 출처: Baseball Savant',
  footerFan: '비공식 팬 프로젝트 · MLB와 무관합니다',
  footerFlags: '국기 그래픽: Twemoji (CC-BY 4.0)',
  sampleNotice: '가상 선수 샘플 데이터',
  realNotice: (season: number) => `${season} 시즌 실데이터 (로컬)`,
  loading: '선수 데이터를 불러오는 중…',
  loadError: '선수 데이터를 불러오지 못했습니다. 새로고침하거나 파일 경로를 확인하세요.',

  // home
  homeTitle: '대회 설정',
  mode: '모드',
  modeTeam: '팀별 대항',
  modeTeamHint: 'MLB 30개 팀, 팀당 100m 최대 2명',
  modeNation: '국가별 대항',
  modeNationHint: '출생 국가, 국가당 100m 최대 3명 · 계주 상위 16개국',
  season: '시즌',
  seed: '시드',
  seedHint: '비워 두면 무작위. 같은 시드는 같은 대회를 만듭니다.',
  seedPlaceholder: '예: 2026',
  start: '엔트리 확인',
  dataVsGame: '데이터에서 오는 값: 최고 속도(vmax)와 가속(τ). 게임 규칙에서 오는 값: 출발 반응, 바람, 레이스별 기복.',
  seasonMissing: (season: number) => `링크의 ${season} 시즌 실데이터가 이 브라우저에 없어 가상 선수 샘플로 열었습니다. 결과는 링크와 다릅니다.`,
  sharedTitle: '공유된 대회',
  sharedBody: (seed: string, edits: number) =>
    `시드 ${seed}${edits > 0 ? ` · 엔트리·오더 편집 ${edits}건` : ''}. 그대로 진행하면 링크를 보낸 사람과 같은 결과가 나옵니다.`,
  skipToResults: '메달 테이블 바로 보기',

  // entry
  entryTitle: '100m 엔트리',
  entryHint: (n: number, mode: ModeId) => `${UNIT_KO[mode]}마다 기대 기록 순으로 ${n}명이 자동 선발됩니다. ${UNIT_KO_OBJ[mode]} 눌러 바꿀 수 있습니다.`,
  entrants: (n: number) => `출전 ${n}명`,
  roster: (n: number) => `선수 ${n}명`,
  pickUpTo: (n: number) => `최대 ${n}명 선택`,
  resetAuto: '자동 선발로 되돌리기',
  begin100m: '100m 시작',
  back: '이전',
  sprintSpeed: '스프린트 스피드',
  speedShort: '스피드',
  expected100: '추정 100m',
  estShort: '추정',
  tauImputed: 'τ 추정값',
  close: '닫기',

  // 100m
  heatsLabel: (n: number) => `${n}개 조`,
  heat: (n: number) => `${n}조`,
  wind: '풍속',
  windIllegal: '풍속 초과 · 기록 불인정',
  startList: '출발 순서',
  play: '재생',
  pause: '일시정지',
  replay: '다시 보기',
  showResult: '결과 바로 보기',
  speed: '배속',
  nextHeat: '다음 조',
  results: '결과',
  colPlace: '순위',
  colLane: '레인',
  colAthlete: '선수',
  colTime: '추정 기록',
  colRT: '반응',
  colSplit30: '30m',
  colSplit60: '60m',
  colMark: '진출',
  dq: '실격',
  dqReason: '부정출발 (반응 0.100초 미만)',
  qLegend: 'Q = 조 순위로 진출 · q = 기록으로 진출 · DQ = 부정출발 실격',
  detailData: '데이터',
  detailGame: '이번 레이스 (게임)',
  rtLabel: '출발 반응',
  raceVmax: '레이스 vmax',
  raceTau: '레이스 τ',
  form: '기복 배수',
  speedCurves: '속도 곡선',
  speedCurvesHint: '순위 순으로 쌓은 선수별 속도 변화. 표에서 고른 선수가 굵게 표시됩니다.',
  speedCurvesLegend: (v: string) => `띠 높이 = 속도 (맨 위 ${v} m/s) · 짧은 눈금 = 30m·60m 통과`,
  roundSummary: (name: string) => `${name} 진출자`,
  toNextRound: (name: string) => `${name}으로`,
  skipRemaining: '남은 조 결과 바로 보기',
  heatsWatched: (a: number, b: number) => `${a}/${b}조 확인`,
  toPodium: '시상식',
  toRelayOrder: '4×100m 계주 오더로',
  notReached: '아직 진행되지 않은 라운드',

  // relay
  relayOrderTitle: '4×100m 계주 오더',
  relayOrderHint: (mode: ModeId) =>
    `${UNIT_KO_OBJ[mode]} 눌러 주자 순서와 바통 터치를 정하세요. 손대지 않은 ${UNIT_KO_TOPIC[mode]} 기본 오더(1번 가속형, 4번 최고 속도)와 안전 터치로 뜁니다.` +
    (mode === 'nation' ? ' 주자 4명 이상인 나라 중 추정 팀 기록 상위 16개국이 출전합니다.' : ''),
  relayTeams: (n: number, mode: ModeId) => (mode === 'nation' ? `${n}개국 출전` : `${n}팀 출전`),
  edited: '편집됨',
  notQualified: '출전권 밖',
  leg: (n: number) => `${n}구간`,
  legShort: '구간',
  blocks: '정지 출발',
  legRoleStart: '출발 · 정지 출발',
  legRoleMiddle: '플라잉 출발',
  legRoleAnchor: '앵커 · 플라잉 출발',
  dragHandle: (n: number) => `${n}구간 주자 끌어서 옮기기`,
  moveUp: '위로',
  moveDown: '아래로',
  swapRunner: (n: number) => `${n}구간 주자`,
  handoffLabel: (a: number, b: number) => `${a}→${b} 바통 터치`,
  handoffSafe: '안전',
  handoffAggr: '공격',
  handoffDetail: (entryPct: number, failPct: string) => `진입 ${entryPct}% · 실패 ${failPct}%`,
  expectedRelay: '추정 팀 기록',
  resetDefault: '기본 오더로 되돌리기',
  beginRelay: '계주 시작',
  relayTitle: '4×100m',
  colTeam: (mode: ModeId) => UNIT_KO[mode],
  batonDrop: (a: number, b: number) => `${a}→${b} 바통 놓침 · 완주 못 함`,
  relayDq: '1번 주자 부정출발 · 실격',
  relayLegend: 'Q = 조 순위로 진출 · q = 기록으로 진출 · DNF = 바통을 놓쳐 완주 못 함 · DQ = 부정출발 실격',
  legTimes: '추정 구간 기록',
  legTimesGroup: '추정 구간 기록',
  handoffIn: '받은 터치',
  entrySpeed: '진입 속도',
  cumulative: '추정 누적',
  noLeg: '–',
  toMedals: '메달 테이블',
  relayPodium: '4×100m 시상',
  relayStartLegend: '레인 · 팀 · 주자 순서',

  // podium
  podiumTitle: '100m 시상',
  medalTable: '메달 테이블',
  meetResults: '대회 결과',
  team: (mode: ModeId) => UNIT_KO[mode],
  gold: '금',
  silver: '은',
  bronze: '동',
  total: '합계',
  newEvent: '새 대회',
  finalResult: '결승 결과',
  shareTitle: '결과 공유',
  shareHint: '이 링크를 열면 같은 설정·시드·엔트리·오더로 같은 결과가 나옵니다.',
  shareRealNote: '로컬 실데이터 시즌이라, 같은 데이터를 가진 사람에게만 같은 결과가 나옵니다.',
  shareLink: '공유 링크',
  copyLink: '링크 복사',
  copied: '복사했습니다',
  copyFailed: '복사하지 못했습니다. 링크를 직접 선택해 복사하세요.',
};

type Dict = typeof ko;

const en: Dict = {
  appName: 'Statcast Sprint',
  appTagline: 'A 100m estimated from MLB Statcast baserunning data',
  language: '한국어',
  estimated: 'Estimated',
  footerEstimate: 'Every time is estimated from Statcast baserunning data.',
  footerSample: 'All players and teams are fictional sample data; times are estimated with the Statcast baserunning model.',
  sampleShort: 'Sample',
  footerSource: 'Data: Baseball Savant',
  footerFan: 'Unofficial fan project · not affiliated with MLB',
  footerFlags: 'Flag graphics: Twemoji (CC-BY 4.0)',
  sampleNotice: 'Sample data, fictional players',
  realNotice: (season) => `${season} season, real data (local)`,
  loading: 'Loading players…',
  loadError: 'Could not load player data. Reload, or check the file path.',

  homeTitle: 'Set up the meet',
  mode: 'Mode',
  modeTeam: 'Team vs team',
  modeTeamHint: '30 MLB teams, up to 2 per team in the 100m',
  modeNation: 'Nation vs nation',
  modeNationHint: 'Birth country, up to 3 per nation in the 100m · top 16 in the relay',
  season: 'Season',
  seed: 'Seed',
  seedHint: 'Leave blank for random. The same seed builds the same meet.',
  seedPlaceholder: 'e.g. 2026',
  start: 'Check entries',
  dataVsGame: 'From the data: top speed (vmax) and acceleration (τ). From the game rules: reaction, wind and race-day form.',
  seasonMissing: (season) => `This browser has no real data for the ${season} season in the link, so it opened with the fictional sample. Results will differ from the link.`,
  sharedTitle: 'Shared meet',
  sharedBody: (seed, edits) =>
    `Seed ${seed}${edits > 0 ? ` · ${edits} entry/order edit${edits === 1 ? '' : 's'}` : ''}. Run it as is and you get the same results as whoever sent the link.`,
  skipToResults: 'Go straight to the medal table',

  entryTitle: '100m entries',
  entryHint: (n, mode) => `Each ${UNIT_EN[mode]} sends its ${n} fastest by expected time. Tap a ${UNIT_EN[mode]} to change.`,
  entrants: (n) => `${n} entrants`,
  roster: (n) => `${n} players`,
  pickUpTo: (n) => `Pick up to ${n}`,
  resetAuto: 'Back to auto selection',
  begin100m: 'Start the 100m',
  back: 'Back',
  sprintSpeed: 'Sprint speed',
  speedShort: 'Speed',
  expected100: 'Est. 100m',
  estShort: 'Est.',
  tauImputed: 'τ imputed',
  close: 'Close',

  heatsLabel: (n) => `${n} heats`,
  heat: (n) => `Heat ${n}`,
  wind: 'Wind',
  windIllegal: 'Wind over limit · not a record',
  startList: 'Start list',
  play: 'Play',
  pause: 'Pause',
  replay: 'Replay',
  showResult: 'Skip to result',
  speed: 'Speed',
  nextHeat: 'Next heat',
  results: 'Result',
  colPlace: 'Pl',
  colLane: 'Lane',
  colAthlete: 'Athlete',
  colTime: 'Est. time',
  colRT: 'React',
  colSplit30: '30m',
  colSplit60: '60m',
  colMark: 'Adv',
  dq: 'DQ',
  dqReason: 'False start (reaction under 0.100s)',
  qLegend: 'Q = qualified by place · q = qualified by time · DQ = false start',
  detailData: 'Data',
  detailGame: 'This race (game)',
  rtLabel: 'Reaction',
  raceVmax: 'Race vmax',
  raceTau: 'Race τ',
  form: 'Form factor',
  speedCurves: 'Speed curves',
  speedCurvesHint: 'How each runner built speed, stacked in finishing order. The runner picked in the table is drawn bold.',
  speedCurvesLegend: (v) => `Strip height = speed (top ${v} m/s) · short ticks = 30m and 60m`,
  roundSummary: (name) => `Through to ${name}`,
  toNextRound: (name) => `Go to ${name}`,
  skipRemaining: 'Reveal remaining heats',
  heatsWatched: (a, b) => `${a}/${b} heats seen`,
  toPodium: 'Medal ceremony',
  toRelayOrder: 'On to the 4×100m order',
  notReached: 'Round not reached yet',

  relayOrderTitle: '4×100m relay order',
  relayOrderHint: (mode) =>
    `Tap a ${UNIT_EN[mode]} to set its running order and baton exchanges. Any you leave alone run the default order (fastest starter first, top speed on anchor) with safe exchanges.` +
    (mode === 'nation' ? ' Of the nations with at least 4 runners, the 16 with the best estimated team time take part.' : ''),
  relayTeams: (n, mode) => `${n} ${mode === 'nation' ? 'nations' : 'teams'}`,
  edited: 'Edited',
  notQualified: 'Not qualified',
  leg: (n) => `Leg ${n}`,
  legShort: 'Leg',
  blocks: 'Blocks',
  legRoleStart: 'Start · from blocks',
  legRoleMiddle: 'Flying start',
  legRoleAnchor: 'Anchor · flying start',
  dragHandle: (n) => `Drag leg ${n} runner`,
  moveUp: 'Move up',
  moveDown: 'Move down',
  swapRunner: (n) => `Leg ${n} runner`,
  handoffLabel: (a, b) => `${a}→${b} exchange`,
  handoffSafe: 'Safe',
  handoffAggr: 'Aggressive',
  handoffDetail: (entryPct, failPct) => `entry ${entryPct}% · fail ${failPct}%`,
  expectedRelay: 'Est. team time',
  resetDefault: 'Back to default order',
  beginRelay: 'Start the relay',
  relayTitle: '4×100m',
  colTeam: (mode) => (mode === 'nation' ? 'Nation' : 'Team'),
  batonDrop: (a, b) => `Dropped baton ${a}→${b} · DNF`,
  relayDq: 'False start on leg 1 · DQ',
  relayLegend: 'Q = qualified by place · q = qualified by time · DNF = dropped baton, did not finish · DQ = false start',
  legTimes: 'Est. leg time',
  legTimesGroup: 'Est. leg times',
  handoffIn: 'Exchange in',
  entrySpeed: 'Entry speed',
  cumulative: 'Est. cumulative',
  noLeg: '–',
  toMedals: 'Medal table',
  relayPodium: '4×100m medals',
  relayStartLegend: 'Lane · team · running order',

  podiumTitle: '100m medals',
  medalTable: 'Medal table',
  meetResults: 'Meet results',
  team: (mode) => (mode === 'nation' ? 'Nation' : 'Team'),
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
  total: 'Total',
  newEvent: 'New meet',
  finalResult: 'Final result',
  shareTitle: 'Share the result',
  shareHint: 'Opening this link replays the same setup, seed, entries and orders, so it gives the same result.',
  shareRealNote: 'This is a local real-data season, so only someone with the same data gets the same result.',
  shareLink: 'Share link',
  copyLink: 'Copy link',
  copied: 'Copied',
  copyFailed: 'Could not copy. Select the link and copy it yourself.',
};

/** 엔진의 라운드 이름(한국어) → 표시 이름 */
const ROUND_NAMES: Record<string, Record<Lang, string>> = {
  예선: { ko: '예선', en: 'Heats' },
  준결승: { ko: '준결승', en: 'Semi-finals' },
  결승: { ko: '결승', en: 'Final' },
};

interface I18n {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
  roundName: (engineName: string) => string;
}

const Ctx = createContext<I18n | null>(null);
const STORAGE_KEY = 'statcast-sprint.lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ko' || saved === 'en') return saved;
  } catch {
    // 저장소를 쓸 수 없으면 브라우저 언어로
  }
  return navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // 무시
    }
  }, [lang]);
  const value = useMemo<I18n>(
    () => ({
      lang,
      t: lang === 'ko' ? ko : en,
      setLang,
      roundName: (n) => ROUND_NAMES[n]?.[lang] ?? n,
    }),
    [lang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('I18nProvider 가 필요함');
  return v;
}
