import { useId, useState, type ReactNode } from 'react';
import type { Medal } from '../../engine/config.ts';
import { medalTable, podiumAwards } from '../../engine/medals.ts';
import { formatTime } from '../../engine/race100.ts';
import type { Event100, EventRelay } from '../../engine/tournament.ts';
import type { Player } from '../../engine/types.ts';
import { Bib, DelegationLabel, TeamBib } from '../components/Bib.tsx';
import { useDelegation } from '../delegationView.ts';
import { useI18n } from '../i18n.tsx';
import { bibName } from '../teamColor.ts';

interface Step {
  key: string;
  medal: Medal;
  place: number;
  bib: ReactNode;
  name: string;
  time: number;
}

/** 시상대: 2위 · 1위 · 3위 순으로 놓는다 */
function Stand({ title, steps }: { title: string; steps: Step[] }) {
  const { t } = useI18n();
  const medalName = { gold: t.gold, silver: t.silver, bronze: t.bronze };
  const order = [1, 0, 2].filter((i) => i < steps.length);
  return (
    <section className="podium__event">
      <h2 className="section-title">{title}</h2>
      <ol className="stand">
        {order.map((i) => {
          const s = steps[i]!;
          return (
            <li key={s.key} className={`stand__step stand__step--${s.medal}`}>
              {s.bib}
              <span className="stand__name">{s.name}</span>
              <span className="stand__time">
                {formatTime(s.time)}
                <small>{t.estimated}</small>
              </span>
              <span className="stand__block">
                <span className="stand__place">{s.place}</span>
                <span className="stand__medal">{medalName[s.medal]}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function PodiumScreen({
  event100,
  eventRelay,
  players,
  shareUrl,
  isSample,
  onNew,
}: {
  event100: Event100;
  eventRelay: EventRelay | null;
  players: Map<number, Player>;
  shareUrl: string;
  isSample: boolean;
  onNew: () => void;
}) {
  const { t, lang } = useI18n();
  const dv = useDelegation();
  const final100 = event100.rounds.at(-1)!.heats[0]!.result;
  const awards100 = podiumAwards('100m', event100.podium, (id) => dv.idOf(players.get(Number(id))!));
  const awardsRelay = eventRelay ? podiumAwards('4x100m', eventRelay.podium, (id) => id) : [];
  const table = medalTable([...awards100, ...awardsRelay]);

  const steps100: Step[] = awards100.map((a, i) => {
    const p = players.get(Number(a.winnerId))!;
    return {
      key: a.winnerId,
      medal: a.medal,
      place: i + 1,
      bib: <Bib p={p} size="lg" />,
      name: p.name,
      time: final100.runners.find((x) => x.playerId === p.id)!.time!,
    };
  });
  const finalRelay = eventRelay?.rounds.at(-1)!.heats[0]!.result;
  const stepsRelay: Step[] = awardsRelay.map((a, i) => {
    const team = finalRelay!.teams.find((x) => x.teamId === a.winnerId)!;
    return {
      key: a.winnerId,
      medal: a.medal,
      place: i + 1,
      bib: <TeamBib team={a.winnerId} />,
      name: team.legs.map((l) => bibName(players.get(l.playerId)!.name)).join(' · '),
      time: team.time!,
    };
  });

  return (
    <div className="screen podium">
      <h1 className="title">{t.meetResults}</h1>
      <Stand title={t.podiumTitle} steps={steps100} />
      {eventRelay && <Stand title={t.relayPodium} steps={stepsRelay} />}

      <section className="panel">
        <h2 className="panel__title">{t.medalTable}</h2>
        <table className="mtable">
          <thead>
            <tr>
              <th scope="col" className="num">
                #
              </th>
              <th scope="col">{t.team(dv.mode.id)}</th>
              <th scope="col" className="num">
                {t.gold}
              </th>
              <th scope="col" className="num">
                {t.silver}
              </th>
              <th scope="col" className="num">
                {t.bronze}
              </th>
              <th scope="col" className="num">
                {t.total}
              </th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.delegationId}>
                <td className="num">{row.rank}</td>
                <td>
                  <DelegationLabel id={row.delegationId} lang={lang} />
                </td>
                <td className="num">{row.gold}</td>
                <td className="num">{row.silver}</td>
                <td className="num">{row.bronze}</td>
                <td className="num">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <ShareBox url={shareUrl} isSample={isSample} />

      <button type="button" className="btn btn--primary btn--block" onClick={onNew}>
        {t.newEvent}
      </button>
    </div>
  );
}

/** 공유 링크: 항상 보이는 읽기 전용 칸 + 복사 버튼 (복사가 막힌 환경에서도 직접 선택해 복사할 수 있게) */
function ShareBox({ url, isSample }: { url: string; isSample: boolean }) {
  const { t } = useI18n();
  const inputId = useId();
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };
  return (
    <section className="panel share">
      <h2 className="panel__title">{t.shareTitle}</h2>
      <p className="hint">{t.shareHint}</p>
      {!isSample && <p className="hint">{t.shareRealNote}</p>}
      <label className="sr-only" htmlFor={inputId}>
        {t.shareLink}
      </label>
      <div className="share__row">
        <input id={inputId} className="input input--mono input--sm share__url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn--ghost btn--sm" onClick={copy}>
          {t.copyLink}
        </button>
      </div>
      <p className="hint share__status" role="status">
        {status === 'copied' ? t.copied : status === 'failed' ? t.copyFailed : ''}
      </p>
    </section>
  );
}
