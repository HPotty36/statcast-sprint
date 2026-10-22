import { useId } from 'react';
import { useI18n } from '../i18n.tsx';

export interface MeetSetup {
  mode: 'team' | 'nation';
  /** 실데이터 시즌 또는 'sample' */
  season: number | 'sample';
  /** 사용자가 입력한 시드 문자열 (비면 시작할 때 무작위) */
  seedText: string;
}

export function HomeScreen({
  setup,
  seasons,
  missingSeason,
  shared,
  edits,
  onChange,
  onStart,
  onSkipToResults,
}: {
  setup: MeetSetup;
  seasons: number[];
  /** 링크의 실데이터 시즌이 이 브라우저에 없어 샘플로 연 경우 그 시즌 */
  missingSeason: number | null;
  /** 공유 링크 그대로 열린 대회 (시드·편집이 링크에서 왔다) */
  shared: boolean;
  /** 링크에 담긴 엔트리·오더 편집 수 */
  edits: number;
  onChange: (s: MeetSetup) => void;
  onStart: () => void;
  onSkipToResults: () => void;
}) {
  const { t } = useI18n();
  const seasonId = useId();
  const seedId = useId();
  const seedHintId = useId();
  const sharedId = useId();

  return (
    <form
      className="screen home"
      onSubmit={(e) => {
        e.preventDefault();
        onStart();
      }}
    >
      <div className="home__head">
        <h1 className="display">{t.appName}</h1>
        <p className="lede">{t.appTagline}</p>
      </div>

      {missingSeason !== null && <p className="notice notice--warn">{t.seasonMissing(missingSeason)}</p>}
      {shared && (
        <section className="shared" aria-labelledby={sharedId}>
          <h2 className="shared__title" id={sharedId}>
            {t.sharedTitle}
          </h2>
          <p className="shared__body">{t.sharedBody(setup.seedText, edits)}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onSkipToResults}>
            {t.skipToResults}
          </button>
        </section>
      )}

      <section className="panel">
        <h2 className="panel__title">{t.homeTitle}</h2>

        <fieldset className="field">
          <legend className="field__label">{t.mode}</legend>
          <div className="choice-row">
            <label className="choice">
              <input type="radio" name="mode" value="team" checked={setup.mode === 'team'} onChange={() => onChange({ ...setup, mode: 'team' })} />
              <span className="choice__body">
                <span className="choice__title">{t.modeTeam}</span>
                <span className="choice__hint">{t.modeTeamHint}</span>
              </span>
            </label>
            <label className="choice">
              <input type="radio" name="mode" value="nation" checked={setup.mode === 'nation'} onChange={() => onChange({ ...setup, mode: 'nation' })} />
              <span className="choice__body">
                <span className="choice__title">{t.modeNation}</span>
                <span className="choice__hint">{t.modeNationHint}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <div className="field-grid">
          <div className="field">
            <label className="field__label" htmlFor={seasonId}>
              {t.season}
            </label>
            <select
              id={seasonId}
              className="input"
              value={String(setup.season)}
              onChange={(e) => onChange({ ...setup, season: e.target.value === 'sample' ? 'sample' : Number(e.target.value) })}
            >
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="sample">{t.sampleNotice}</option>
            </select>
          </div>
          <div className="field">
            <label className="field__label" htmlFor={seedId}>
              {t.seed}
            </label>
            <input
              id={seedId}
              className="input input--mono"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={24}
              placeholder={t.seedPlaceholder}
              value={setup.seedText}
              aria-describedby={seedHintId}
              onChange={(e) => onChange({ ...setup, seedText: e.target.value })}
            />
          </div>
        </div>
        <p className="hint" id={seedHintId}>
          {t.seedHint}
        </p>

        <button type="submit" className="btn btn--primary btn--block">
          {t.start}
        </button>
      </section>

      <p className="hint hint--split">{t.dataVsGame}</p>
    </form>
  );
}
