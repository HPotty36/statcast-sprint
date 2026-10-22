import '@fontsource/big-shoulders-display/latin-700';
import '@fontsource/big-shoulders-display/latin-800';
import '@fontsource-variable/archivo/wght.css';
import '@fontsource/black-han-sans/korean';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';
import flagFontUrl from 'country-flag-emoji-polyfill/dist/TwemojiCountryFlags.woff2?url';
import { useEffect, useMemo, useState } from 'react';
import { MODES, buildDelegations, select100mEntries, selectRelaySquads } from '../engine/delegations.ts';
import { seedFromString } from '../engine/rng.ts';
import { run100mEvent, runRelayEvent } from '../engine/tournament.ts';
import type { PlayersFile } from '../engine/types.ts';
import { loadPlayers, realSeasons } from './data.ts';
import { DelegationContext, makeDelegationView } from './delegationView.ts';
import { I18nProvider, useI18n } from './i18n.tsx';
import { EntryScreen } from './screens/EntryScreen.tsx';
import { HomeScreen, type MeetSetup } from './screens/HomeScreen.tsx';
import { PodiumScreen } from './screens/PodiumScreen.tsx';
import { RelayOrderScreen } from './screens/RelayOrderScreen.tsx';
import { RelayScreen } from './screens/RelayScreen.tsx';
import { Sprint100Screen } from './screens/Sprint100Screen.tsx';
import { decodeEntryOverrides, decodeRelayOverrides, encodeEntryOverrides, encodeRelayOverrides } from './share.ts';
import { Shell } from './Shell.tsx';
import './styles.css';

// Windows 의 Chromium 계열은 국기 이모지를 글자 두 개로 보여 준다 → 그럴 때만 국기 웹폰트(자체 호스팅)를 붙인다
polyfillCountryFlagEmojis('Twemoji Country Flags', flagFontUrl);

/** 홈 → 엔트리 → 100m → 계주 오더 → 계주 → 메달 테이블 */
type Screen = 'home' | 'entry' | 'm100' | 'relayOrder' | 'relay' | 'medals';
const AFTER_100M_START: Screen[] = ['m100', 'relayOrder', 'relay', 'medals'];

/** 사용자가 바꾼 100m 엔트리(e)·계주 오더(r). URL 에 그대로 실리는 문자열이 원본이다 (share.ts) */
interface Picks {
  e: string;
  r: string;
}
const NO_PICKS: Picks = { e: '', r: '' };

/** URL 의 mode / season / seed / e / r (PLAN.md 7 공통, 8 Phase 7) */
function readUrl(): Partial<MeetSetup> & { picks: Picks; shared: boolean } {
  const q = new URLSearchParams(location.search);
  const season = q.get('season');
  const seedText = q.get('seed')?.trim() || undefined;
  return {
    mode: q.get('mode') === 'nation' ? 'nation' : 'team',
    season: season && /^\d{4}$/.test(season) ? Number(season) : season === 'sample' ? 'sample' : undefined,
    seedText,
    picks: { e: q.get('e') ?? '', r: q.get('r') ?? '' },
    // 시드가 있는 링크 = 누군가 끝낸 대회를 공유한 것
    shared: seedText !== undefined,
  };
}

function shareQuery(s: MeetSetup, picks: Picks): string {
  const q = new URLSearchParams({ mode: s.mode, season: String(s.season), seed: s.seedText });
  if (picks.e) q.set('e', picks.e);
  if (picks.r) q.set('r', picks.r);
  return `?${q}`;
}

function randomSeedText(): string {
  // 시드 자체를 정하는 데만 쓰는 난수. 대회 안의 모든 난수는 이 시드에서 나온다.
  return String(crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000);
}

function Game() {
  const { t } = useI18n();
  const [screen, setScreenState] = useState<Screen>('home');
  const setScreen = (s: Screen) => {
    setScreenState(s);
    window.scrollTo(0, 0);
  };
  const [fromUrl] = useState(readUrl);
  const [seasons, setSeasons] = useState<number[] | null>(null);
  const [setup, setSetup] = useState<MeetSetup | null>(null);
  /** 링크가 가리킨 실데이터 시즌이 이 브라우저에 없을 때 그 시즌 (샘플로 대신 연다) */
  const [missingSeason, setMissingSeason] = useState<number | null>(null);
  /** 시즌별 로딩 결과. 현재 시즌과 다르면 아직 로딩 중 */
  const [loaded, setLoaded] = useState<{ season: MeetSetup['season']; file: PlayersFile | null; error: boolean } | null>(null);
  const [picks, setPicks] = useState<Picks>(fromUrl.picks);

  useEffect(() => {
    realSeasons().then((list) => {
      const sorted = [...list].sort((a, b) => b - a);
      const wanted = fromUrl.season;
      const available = wanted === 'sample' || (typeof wanted === 'number' && sorted.includes(wanted));
      const season = available ? wanted : (sorted[0] ?? 'sample');
      setSeasons(sorted);
      setSetup({ mode: fromUrl.mode ?? 'team', season, seedText: fromUrl.seedText ?? '' });
      if (typeof wanted === 'number' && !available) {
        setMissingSeason(wanted);
        // 다른 데이터의 선수 id 는 의미가 없으므로 편집은 버린다
        setPicks(NO_PICKS);
      }
    });
  }, [fromUrl]);

  const season = setup?.season;
  useEffect(() => {
    if (season === undefined) return;
    let live = true;
    loadPlayers(season === 'sample' ? null : season)
      .then((file) => live && setLoaded({ season, file, error: false }))
      .catch(() => live && setLoaded({ season, file: null, error: true }));
    return () => {
      live = false;
    };
  }, [season]);
  const current = loaded && loaded.season === season ? loaded : null;
  const file = current?.file ?? null;
  const error = current?.error ?? false;

  // 팀별·국가별은 같은 엔진에 모드 설정만 바꿔 넣는다
  const mode = MODES[setup?.mode ?? 'team'];
  const view = useMemo(() => makeDelegationView(mode), [mode]);
  const delegations = useMemo(() => (file ? buildDelegations(file.players, mode) : []), [file, mode]);
  const overrides = useMemo(() => decodeEntryOverrides(picks.e, delegations, mode), [picks.e, delegations, mode]);
  const relayOverrides = useMemo(() => decodeRelayOverrides(picks.r, delegations, mode), [picks.r, delegations, mode]);
  const seed = setup ? seedFromString(setup.seedText) : 0;
  const started = AFTER_100M_START.includes(screen);
  const event = useMemo(() => {
    if (!started) return null;
    const entrants = select100mEntries(delegations, mode, overrides);
    return run100mEvent(entrants, mode.formats.m100, seed);
  }, [started, delegations, mode, overrides, seed]);
  const relayStarted = screen === 'relay' || screen === 'medals';
  const squads = useMemo(() => selectRelaySquads(delegations, mode, relayOverrides), [delegations, mode, relayOverrides]);
  const relayEvent = useMemo(
    () => (relayStarted ? runRelayEvent(squads, mode.formats.relay, seed) : null),
    [relayStarted, squads, mode, seed],
  );

  const players = useMemo(() => new Map((file?.players ?? []).map((p) => [p.id, p])), [file]);

  // 대회가 시작되면 주소창이 곧 공유 링크다: 설정·시드·편집이 바뀔 때마다 맞춘다
  const query = setup ? shareQuery(setup, picks) : '';
  useEffect(() => {
    if (screen !== 'home' && query) history.replaceState(null, '', `${location.pathname}${query}`);
  }, [screen, query]);

  const begin = (to: Screen) => {
    if (!setup) return;
    setSetup({ ...setup, seedText: setup.seedText.trim() || randomSeedText() });
    setScreen(to);
  };

  let body;
  if (error) body = <p className="notice notice--error">{t.loadError}</p>;
  else if (!setup || !seasons || !file) body = <p className="notice">{t.loading}</p>;
  else if (screen === 'home')
    body = (
      <HomeScreen
        setup={setup}
        seasons={seasons}
        missingSeason={missingSeason}
        // 링크 그대로일 때만 "공유된 대회" (시드를 고치거나 모드·시즌을 바꾸면 새 대회)
        shared={fromUrl.shared && picks === fromUrl.picks && setup.seedText === fromUrl.seedText}
        edits={Object.keys(overrides).length + Object.keys(relayOverrides).length}
        onChange={(s) => {
          // 모드·시즌이 바뀌면 대표단이 달라지므로 편집은 버린다
          if (s.mode !== setup.mode || s.season !== setup.season) setPicks(NO_PICKS);
          setSetup(s);
        }}
        onStart={() => begin('entry')}
        onSkipToResults={() => begin('medals')}
      />
    );
  else if (screen === 'entry')
    body = (
      <EntryScreen
        delegations={delegations}
        overrides={overrides}
        onOverrides={(o) => setPicks((p) => ({ ...p, e: encodeEntryOverrides(o) }))}
        onBack={() => setScreen('home')}
        onBegin={() => setScreen('m100')}
      />
    );
  else if (screen === 'm100' && event)
    body = <Sprint100Screen event={event} players={players} onBack={() => setScreen('entry')} onPodium={() => setScreen('relayOrder')} />;
  else if (screen === 'relayOrder')
    body = (
      <RelayOrderScreen
        delegations={delegations}
        eligible={new Set(squads.map((s) => s.teamId))}
        overrides={relayOverrides}
        onOverrides={(o) => setPicks((p) => ({ ...p, r: encodeRelayOverrides(o) }))}
        onBack={() => setScreen('m100')}
        onBegin={() => setScreen('relay')}
      />
    );
  else if (screen === 'relay' && relayEvent)
    body = (
      <RelayScreen event={relayEvent} squads={squads} players={players} onBack={() => setScreen('relayOrder')} onMedals={() => setScreen('medals')} />
    );
  else if (screen === 'medals' && event)
    body = (
      <PodiumScreen
        event100={event}
        eventRelay={relayEvent}
        players={players}
        shareUrl={`${location.origin}${location.pathname}${query}`}
        isSample={file.isSample}
        onNew={() => {
          setPicks(NO_PICKS);
          setSetup({ ...setup, seedText: '' });
          setScreen('home');
        }}
      />
    );

  return (
    <DelegationContext.Provider value={view}>
      <Shell file={file} seedText={screen === 'home' ? null : (setup?.seedText ?? null)}>
        {body}
      </Shell>
    </DelegationContext.Provider>
  );
}

export function App() {
  return (
    <I18nProvider>
      <Game />
    </I18nProvider>
  );
}
