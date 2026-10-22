import { useCallback, useMemo, useRef, useState } from 'react';
import { formatTime } from '../../engine/race100.ts';
import { expectedRelayTime, type RelayResult, type RelaySquad } from '../../engine/relay.ts';
import type { EventRelay } from '../../engine/tournament.ts';
import type { Player } from '../../engine/types.ts';
import { QualMark, TeamBib } from '../components/Bib.tsx';
import { Icon } from '../components/Icon.tsx';
import { useDelegation } from '../delegationView.ts';
import { useI18n } from '../i18n.tsx';
import { RaceCanvas, type CanvasRunner } from '../race/RaceCanvas.tsx';
import { RelayResultsTable } from '../race/RelayResultsTable.tsx';
import { TRACK_RELAY } from '../race/tracks.ts';
import { usePlayback } from '../race/usePlayback.ts';
import { statusReason } from '../relay/status.ts';
import { bibName, teamColor } from '../teamColor.ts';

const heatKey = (r: number, h: number) => `${r}-${h}`;

export function RelayScreen({
  event,
  squads,
  players,
  onBack,
  onMedals,
}: {
  event: EventRelay;
  squads: RelaySquad[];
  players: Map<number, Player>;
  onBack: () => void;
  onMedals: () => void;
}) {
  const { t, roundName } = useI18n();
  const dv = useDelegation();
  const [round, setRound] = useState(0);
  const [heat, setHeat] = useState(0);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [reached, setReached] = useState(0);

  const r = event.rounds[round]!;
  const h = r.heats[heat]!;
  const race = h.result;
  const key = heatKey(round, heat);
  const duration = Math.max(...race.teams.map((x) => x.trajectory.at(-1)?.t ?? 0)) + 0.6;
  const markSeen = useCallback((k: string) => setSeen((s) => (s.has(k) ? s : new Set(s).add(k))), []);
  const pb = usePlayback(duration, key, markSeen);
  const clockRef = useRef<HTMLSpanElement>(null);

  const isSeen = seen.has(key) || pb.status === 'done';
  const roundSeen = r.heats.every((_, i) => seen.has(heatKey(round, i)) || (i === heat && isSeen));
  const isFinal = round === event.rounds.length - 1;

  const canvasRunners = useMemo<CanvasRunner[]>(
    () =>
      race.teams.map((x) => ({
        lane: x.lane,
        names: x.legs.map((l) => players.get(l.playerId)!.name),
        team: dv.code(x.teamId),
        color: teamColor(dv.code(x.teamId)),
        trajectory: x.trajectory,
        time: x.time,
        place: x.place,
        status: x.status,
      })),
    [race, players, dv],
  );

  const goRound = (i: number) => {
    setRound(i);
    setHeat(0);
  };
  const revealRound = () =>
    setSeen((s) => {
      const n = new Set(s);
      r.heats.forEach((_, i) => n.add(heatKey(round, i)));
      return n;
    });
  const ariaRace = `${t.relayTitle} ${roundName(r.name)} ${t.heat(h.index)}`;

  return (
    <div className="screen sprint relay">
      <nav className="rounds" aria-label="rounds">
        <div className="tabs" role="tablist">
          {event.rounds.map((x, i) => (
            <button
              key={x.name}
              type="button"
              role="tab"
              aria-selected={i === round}
              className="tab"
              disabled={i > reached}
              title={i > reached ? t.notReached : undefined}
              onClick={() => goRound(i)}
            >
              {roundName(x.name)}
            </button>
          ))}
        </div>
        <div className="heats" role="group" aria-label={t.heatsLabel(r.heats.length)}>
          {r.heats.map((x, i) => (
            <button
              key={x.key}
              type="button"
              className={`heatchip${i === heat ? ' heatchip--on' : ''}${seen.has(heatKey(round, i)) ? ' heatchip--done' : ''}`}
              aria-current={i === heat ? 'true' : undefined}
              onClick={() => setHeat(i)}
            >
              {r.heats.length > 1 ? t.heat(x.index) : roundName(r.name)}
              {seen.has(heatKey(round, i)) && <Icon name="check" size={14} />}
            </button>
          ))}
        </div>
      </nav>

      <section className="stage" aria-label={ariaRace}>
        <div className="stage__head">
          <h1 className="stage__title">
            {t.relayTitle} {roundName(r.name)}
            {r.heats.length > 1 && <span className="stage__heat"> · {t.heat(h.index)}</span>}
          </h1>
          <div className="stage__meta">
            <span className="clock" aria-hidden="true">
              <span ref={clockRef}>0.00</span>
            </span>
          </div>
        </div>

        <RaceCanvas runners={canvasRunners} tRef={pb.tRef} clockRef={clockRef} label={ariaRace} track={TRACK_RELAY} />

        <div className="transport">
          {pb.status === 'playing' ? (
            <button type="button" className="btn btn--primary" onClick={pb.pause}>
              <Icon name="pause" /> {t.pause}
            </button>
          ) : pb.status === 'done' ? (
            <button type="button" className="btn btn--ghost" onClick={pb.replay}>
              <Icon name="replay" /> {t.replay}
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={pb.play}>
              <Icon name="play" /> {t.play}
            </button>
          )}
          <div className="seg" role="group" aria-label={t.speed}>
            {[1, 2, 4].map((v) => (
              <button key={v} type="button" className="seg__btn" aria-pressed={pb.rate === v} onClick={() => pb.setRate(v)}>
                {v}×
              </button>
            ))}
          </div>
          {pb.status !== 'done' && (
            <button type="button" className="btn btn--ghost" onClick={pb.finish}>
              <Icon name="skip" /> {t.showResult}
            </button>
          )}
        </div>
      </section>

      {isSeen ? (
        <>
          <RelayResultsTable key={key} race={race} marks={h.marks} players={players} />
          {heat < r.heats.length - 1 && (
            <div className="actionbar">
              <button type="button" className="btn btn--link" onClick={revealRound}>
                {t.skipRemaining}
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setHeat(heat + 1)}>
                {t.nextHeat} <Icon name="next" />
              </button>
            </div>
          )}
        </>
      ) : (
        <RelayStartList race={race} squads={squads} players={players} />
      )}

      {roundSeen && (
        <RelaySummary
          event={event}
          round={round}
          onNext={() => {
            if (isFinal) onMedals();
            else {
              setReached((x) => Math.max(x, round + 1));
              goRound(round + 1);
            }
          }}
        />
      )}

      <div className="actionbar actionbar--quiet">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          <Icon name="prev" /> {t.back}
        </button>
        <span className="hint">{t.heatsWatched(r.heats.filter((_, i) => seen.has(heatKey(round, i))).length, r.heats.length)}</span>
      </div>
    </div>
  );
}

function RelayStartList({ race, squads, players }: { race: RelayResult; squads: RelaySquad[]; players: Map<number, Player> }) {
  const { t } = useI18n();
  const byLane = [...race.teams].sort((a, b) => a.lane - b.lane);
  return (
    <section className="startlist" aria-label={t.startList}>
      <h2 className="section-title">{t.startList}</h2>
      <ol className="startlist__list">
        {byLane.map((x) => {
          const squad = squads.find((s) => s.teamId === x.teamId);
          return (
            <li key={x.teamId} className="startlist__row startlist__row--relay">
              <span className="startlist__lane">{x.lane}</span>
              <TeamBib team={x.teamId} />
              <span className="startlist__full">
                {x.legs.map((l, i) => (
                  <span key={l.leg}>
                    {i > 0 && <span className={`hglyph hglyph--${l.handoffIn}`} aria-hidden="true" />}
                    {bibName(players.get(l.playerId)!.name)}
                  </span>
                ))}
              </span>
              <span className="startlist__exp">
                <span className="hint">{t.expectedRelay}</span> {squad ? formatTime(expectedRelayTime(squad)) : ''}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function RelaySummary({ event, round, onNext }: { event: EventRelay; round: number; onNext: () => void }) {
  const { t, roundName } = useI18n();
  const r = event.rounds[round]!;
  const next = event.rounds[round + 1];
  if (!next) {
    return (
      <section className="summary summary--final">
        <button type="button" className="btn btn--primary btn--block" onClick={onNext}>
          {t.toMedals} <Icon name="next" />
        </button>
      </section>
    );
  }
  const rows = r.heats.flatMap((h) =>
    h.result.teams.filter((x) => h.marks[x.teamId]).map((x) => ({ x, mark: h.marks[x.teamId]!, heat: h.index })),
  );
  rows.sort((a, b) => (a.mark === b.mark ? a.x.time! - b.x.time! : a.mark === 'Q' ? -1 : 1));
  const out = r.heats.flatMap((h) => h.result.teams.filter((x) => x.status !== 'OK'));
  return (
    <section className="summary" aria-label={t.roundSummary(roundName(next.name))}>
      <h2 className="section-title">{t.roundSummary(roundName(next.name))}</h2>
      <ol className="summary__list">
        {rows.map(({ x, mark, heat }) => (
          <li key={x.teamId} className="summary__row">
            <TeamBib team={x.teamId} />
            <span className="summary__heat">{t.heat(heat)}</span>
            <span className="time-sm">{formatTime(x.time!)}</span>
            <QualMark mark={mark} />
          </li>
        ))}
      </ol>
      {out.length > 0 && (
        <ul className="summary__out">
          {out.map((x) => (
            <li key={x.teamId}>
              <TeamBib team={x.teamId} struck />
              <span className="summary__reason">{statusReason(x, t)}</span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn--primary btn--block" onClick={onNext}>
        {t.toNextRound(roundName(next.name))} <Icon name="next" />
      </button>
    </section>
  );
}
