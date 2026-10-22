import { Fragment, useState } from 'react';
import { formatTime, type Race100Result } from '../../engine/race100.ts';
import type { Mark } from '../../engine/tournament.ts';
import type { Player } from '../../engine/types.ts';
import { Bib, QualMark } from '../components/Bib.tsx';
import { useI18n } from '../i18n.tsx';
import { SpeedCurves } from './SpeedCurves.tsx';

const fmt = (t: number | null | undefined) => (t == null ? '–' : formatTime(t));
const signed = (x: number, d = 2) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(d)}`;

export function ResultsTable({
  race,
  marks,
  players,
}: {
  race: Race100Result;
  marks: Record<string, Mark>;
  players: Map<number, Player>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  const hasMarks = Object.keys(marks).length > 0;

  return (
    <section className="results" aria-label={t.results}>
      <table className="rtable">
        <thead>
          <tr>
            <th scope="col" className="num">
              {t.colPlace}
            </th>
            <th scope="col" className="num col-wide">
              {t.colLane}
            </th>
            <th scope="col">{t.colAthlete}</th>
            <th scope="col" className="num">
              {t.colTime}
            </th>
            <th scope="col" className="num col-wide">
              {t.colRT}
            </th>
            <th scope="col" className="num col-wide">
              {t.colSplit30}
            </th>
            <th scope="col" className="num col-wide">
              {t.colSplit60}
            </th>
            {hasMarks && (
              <th scope="col" className="num">
                <span className="sr-only">{t.colMark}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {race.runners.map((r) => {
            const p = players.get(r.playerId)!;
            const dq = r.status === 'DQ';
            const isOpen = open === r.playerId;
            const extra = dq ? t.dqReason : `${t.colRT} ${r.draw.rt.toFixed(3)} · 30m ${fmt(r.splits?.[30])} · 60m ${fmt(r.splits?.[60])}`;
            return (
              <Fragment key={r.playerId}>
                <tr
                  className={`rrow${dq ? ' rrow--dq' : ''}${isOpen ? ' rrow--open' : ''}${r.place !== null && r.place <= 3 ? ' rrow--podium' : ''}`}
                  onClick={() => setOpen(isOpen ? null : r.playerId)}
                >
                  <td className="num place">{dq ? '–' : r.place}</td>
                  <td className="num col-wide">{r.lane}</td>
                  <td>
                    <button
                      type="button"
                      className="rrow__athlete"
                      aria-expanded={isOpen}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(isOpen ? null : r.playerId);
                      }}
                    >
                      <Bib p={p} struck={dq} />
                      <span className="rrow__full">{p.name}</span>
                    </button>
                    <span className="rrow__sub">{extra}</span>
                  </td>
                  <td className="num time">{dq ? <span className="dq">DQ</span> : fmt(r.time)}</td>
                  <td className="num col-wide game">{r.draw.rt.toFixed(3)}</td>
                  <td className="num col-wide game">{fmt(r.splits?.[30])}</td>
                  <td className="num col-wide game">{fmt(r.splits?.[60])}</td>
                  {hasMarks && (
                    <td className="num">
                      <QualMark mark={marks[String(r.playerId)]} />
                    </td>
                  )}
                </tr>
                {isOpen && (
                  <tr className="rdetail">
                    <td colSpan={hasMarks ? 8 : 7}>
                      <Breakdown p={p} r={r} wind={race.wind} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {hasMarks && <p className="hint legend">{t.qLegend}</p>}
      <SpeedCurves race={race} players={players} selected={open} />
    </section>
  );
}

function Breakdown({ p, r, wind }: { p: Player; r: Race100Result['runners'][number]; wind: number }) {
  const { t } = useI18n();
  return (
    <div className="breakdown">
      <dl className="breakdown__col breakdown__col--data">
        <dt className="breakdown__head">{t.detailData}</dt>
        <div>
          <dt>{t.sprintSpeed}</dt>
          <dd>{p.sprintSpeedFtS.toFixed(1)} ft/s</dd>
        </div>
        <div>
          <dt>vmax</dt>
          <dd>{r.base.vmax.toFixed(2)} m/s</dd>
        </div>
        <div>
          <dt>τ{p.tauImputed ? ` (${t.tauImputed})` : ''}</dt>
          <dd>{r.base.tau.toFixed(3)} s</dd>
        </div>
        <div>
          <dt>{t.form}</dt>
          <dd>×{r.base.sigmaScale.toFixed(2)}</dd>
        </div>
      </dl>
      <dl className="breakdown__col breakdown__col--game">
        <dt className="breakdown__head">{t.detailGame}</dt>
        <div>
          <dt>{t.rtLabel}</dt>
          <dd>{r.draw.rt.toFixed(3)} s</dd>
        </div>
        <div>
          <dt>{t.raceVmax}</dt>
          <dd>
            {r.draw.vmax.toFixed(2)} <small>({signed(r.draw.vmax - r.base.vmax)})</small>
          </dd>
        </div>
        <div>
          <dt>{t.raceTau}</dt>
          <dd>
            {r.draw.tau.toFixed(3)} <small>({signed(r.draw.tau - r.base.tau, 3)})</small>
          </dd>
        </div>
        <div>
          <dt>{t.wind}</dt>
          <dd>{signed(wind, 1)} m/s</dd>
        </div>
      </dl>
    </div>
  );
}
