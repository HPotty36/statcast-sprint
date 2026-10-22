import { Fragment, useState } from 'react';
import { formatTime } from '../../engine/race100.ts';
import type { RelayResult, RelayTeamResult } from '../../engine/relay.ts';
import type { Mark } from '../../engine/tournament.ts';
import type { Player } from '../../engine/types.ts';
import { QualMark, TeamBib } from '../components/Bib.tsx';
import { useDelegation } from '../delegationView.ts';
import { useI18n } from '../i18n.tsx';
import { statusReason } from '../relay/status.ts';
import { bibName } from '../teamColor.ts';

const fmt = (t: number | null | undefined) => (t == null ? '–' : formatTime(t));

export function RelayResultsTable({
  race,
  marks,
  players,
}: {
  race: RelayResult;
  marks: Record<string, Mark>;
  players: Map<number, Player>;
}) {
  const { t } = useI18n();
  const { mode } = useDelegation();
  const [open, setOpen] = useState<string | null>(null);
  const hasMarks = Object.keys(marks).length > 0;
  const legCount = race.teams[0]?.legs.length ?? 4;

  return (
    <section className="results" aria-label={t.results}>
      <table className="rtable">
        <thead>
          {/* 넓은 화면에서만 보이는 구간 기록 묶음 머리 */}
          <tr className="rtable__group" aria-hidden="true">
            <th colSpan={3} />
            <th colSpan={legCount} className="rtable__grouphead">
              {t.legTimesGroup}
            </th>
            <th colSpan={hasMarks ? 2 : 1} />
          </tr>
          <tr>
            <th scope="col" className="num">
              {t.colPlace}
            </th>
            <th scope="col" className="num col-wide">
              {t.colLane}
            </th>
            <th scope="col">{t.colTeam(mode.id)}</th>
            {Array.from({ length: legCount }, (_, i) => (
              <th key={i} scope="col" className="num col-wide">
                {t.leg(i + 1)}
              </th>
            ))}
            <th scope="col" className="num">
              {t.colTime}
            </th>
            {hasMarks && (
              <th scope="col" className="num">
                <span className="sr-only">{t.colMark}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {race.teams.map((team) => {
            const out = team.status !== 'OK';
            const isOpen = open === team.teamId;
            const reason = statusReason(team, t);
            const names = team.legs.map((l) => bibName(players.get(l.playerId)!.name)).join(' · ');
            return (
              <Fragment key={team.teamId}>
                <tr className={`rrow${out ? ' rrow--dq' : ''}${isOpen ? ' rrow--open' : ''}`} onClick={() => setOpen(isOpen ? null : team.teamId)}>
                  <td className="num place">{team.place ?? '–'}</td>
                  <td className="num col-wide">{team.lane}</td>
                  <td>
                    <button
                      type="button"
                      className="rrow__athlete"
                      aria-expanded={isOpen}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(isOpen ? null : team.teamId);
                      }}
                    >
                      <TeamBib team={team.teamId} struck={out} />
                    </button>
                    <span className="rrow__sub rrow__sub--always">{reason ?? names}</span>
                  </td>
                  {team.legs.map((l) => (
                    <td key={l.leg} className="num col-wide game">
                      {fmt(l.legTime)}
                    </td>
                  ))}
                  <td className="num time">{team.status === 'OK' ? fmt(team.time) : <span className="dq">{team.status}</span>}</td>
                  {hasMarks && (
                    <td className="num">
                      <QualMark mark={marks[team.teamId]} />
                    </td>
                  )}
                </tr>
                {isOpen && (
                  <tr className="rdetail">
                    <td colSpan={4 + legCount + (hasMarks ? 1 : 0)}>
                      <LegDetail team={team} players={players} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
<p className="hint legend">{t.relayLegend}</p>
    </section>
  );
}

function LegDetail({ team, players }: { team: RelayTeamResult; players: Map<number, Player> }) {
  const { t } = useI18n();
  return (
    <table className="legtable">
      <thead>
        <tr>
          <th scope="col">{t.legShort}</th>
          <th scope="col">{t.colAthlete}</th>
          <th scope="col">{t.handoffIn}</th>
          <th scope="col" className="num">
            {t.entrySpeed}
          </th>
          <th scope="col" className="num">
            {t.legTimes}
          </th>
          <th scope="col" className="num col-wide">
            {t.cumulative}
          </th>
        </tr>
      </thead>
      <tbody>
        {team.legs.map((l) => {
          const p = players.get(l.playerId)!;
          const dropped = team.failedExchange !== null && l.leg === team.failedExchange + 1;
          // 바통을 받지 못한 구간(놓친 구간 이후, 부정출발 팀의 2구간 이후)은 달리지 않았다
          const ran = l.legTime !== null || dropped;
          return (
            <tr key={l.leg} className={dropped ? 'is-dropped' : ''}>
              <td className="legtable__n">{l.leg}</td>
              <td>
                <span className="legtable__name">{bibName(p.name)}</span>
                <span className="legtable__vmax data">vmax {l.base.vmax.toFixed(2)}</span>
              </td>
              <td>{l.handoffIn === null ? t.blocks : l.handoffIn === 'safe' ? t.handoffSafe : t.handoffAggr}</td>
              <td className="num">{!ran && l.handoffIn !== null ? t.noLeg : `${l.handoffIn === null ? '0' : l.entrySpeed.toFixed(2)} m/s`}</td>
              <td className="num time-sm">{dropped ? <span className="dq">DNF</span> : fmt(l.legTime)}</td>
              <td className="num col-wide">{fmt(l.cumulative)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
