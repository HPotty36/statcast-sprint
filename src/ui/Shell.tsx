import type { ReactNode } from 'react';
import type { PlayersFile } from '../engine/types.ts';
import { useI18n } from './i18n.tsx';

export function Shell({ file, seedText, children }: { file: PlayersFile | null; seedText: string | null; children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__inner">
          <span className="wordmark" aria-label={t.appName}>
            STATCAST<span className="wordmark__sprint">SPRINT</span>
          </span>
          <div className="topbar__meta">
            {file && <span className="chip chip--quiet chip--long">{file.isSample ? t.sampleNotice : t.realNotice(file.season)}</span>}
            {(seedText || file?.isSample) && (
              <span className={`chip chip--quiet chip--mono${seedText ? '' : ' chip--narrow-only'}`}>
                {/* 좁은 화면에서는 긴 데이터 칩 대신 여기서 샘플임을 알린다 */}
                {file?.isSample && <span className="chip__short">{t.sampleShort}</span>}
                {file?.isSample && seedText && <span className="chip__short"> · </span>}
                {seedText && `${t.seed} ${seedText}`}
              </span>
            )}
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')} lang={lang === 'ko' ? 'en' : 'ko'}>
              {t.language}
            </button>
          </div>
        </div>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <p>{file?.isSample ? t.footerSample : t.footerEstimate}</p>
        <p>
          {t.footerSource} · {t.footerFan}
        </p>
        <p>{t.footerFlags}</p>
      </footer>
    </div>
  );
}
