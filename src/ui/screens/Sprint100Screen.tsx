import { useCallback, useMemo, useRef, useState } from 'react';
import { expectedTime100, formatTime } from '../../engine/race100.ts';
import type { Event100 } from '../../engine/tournament.ts';
import type { Player } from '../../engine/types.ts';
import { Bib, QualMark } from '../components/Bib.tsx';
import { Icon } from '../components/Icon.tsx';
import { useDelegation } from '../delegationView.ts';
import { useI18n } from '../i18n.tsx';
import { RaceCanvas, type CanvasRunner } from '../race/RaceCanvas.tsx';
import { ResultsTable } from '../race/ResultsTable.tsx';
import { usePlayback } from '../race/usePlayback.ts';
import { teamColor } from '../teamColor.ts';

const heatKey = (r: number, h: number) => `${r}-${h}`;

export function Sprint100Screen({
  event,
  players,
  onBack,
  onPodium,
}: {
  event: Event100;
  players: Map<number, Player>;
  onBack: () => void;
  onPodium: () => void;
}) {
  const { t, roundName } = useI18n();
  const dv = useDelegation();
  const [round, setRound] = useState(0);
  const [heat, setHeat] = useState(0);
  /** 결과를 본 조 — 아직 보지 않은 조의 결과는 보여 주지 않는다 */
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [reached, setReached] = useState(0);

  const r = event.rounds[round]!;
  const h = r.heats[heat]!;
  const race = h.result;
  const key = heatKey(round, heat);
  const duration = Math.max(...race.runners.map((x) => x.time ?? 0)) + 0.4;
  const markSeen = useCallback((k: string) => setSeen((s) => (s.has(k) ? s : new Set(s).add(k))), []);
  const pb = usePlayback(duration, key, markSeen);
  const clockRef = useRef<HTMLSpanElement>(null);

  const isSeen = seen.has(key) || pb.status === 'done';
  const roundSeen = r.heats.every((_, i) => seen.has(heatKey(round, i)) || (i === heat && isSeen));
  const isFinal = round === event.rounds.length - 1;

  const canvasRunners = useMemo<CanvasRunner[]>(
    () =>
      race.runners.map((x) => {
        const p = players.get(x.playerId)!;
        return {
          lane: x.lane,
          names: [p.name],
          team: dv.code(dv.idOf(p)),
          color: teamColor(dv.code(dv.idOf(p))),
          trajectory: x.trajectory,
          time: x.time,
          place: x.place,
          status: x.status,
        };
      }),
    [race, players, dv],
  );

  const goHeat = (i: number) => setHeat(i);
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

  const ariaRace = `${roundName(r.name)} ${t.heat(h.index)}. ${t.wind} ${race.wind.toFixed(1)} m/s.`;

  return (
    <div className="screen sprint">
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
          {r.heats.map((x, i) => {
            const done = seen.has(heatKey(round, i));
            return (
              <button
                key={x.key}
                type="button"
                className={`heatchip${i === heat ? ' heatchip--on' : ''}${done ? ' heatchip--done' : ''}`}
                aria-current={i === heat ? 'true' : undefined}
                onClick={() => goHeat(i)}
              >
                {r.heats.length > 1 ? t.heat(x.index) : roundName(r.name)}
                {done && <Icon name="check" size={14} />}
              </button>
            );
          })}
        </div>
      </nav>

      <section className="stage" aria-label={ariaRace}>
        <div className="stage__head">
          <h1 className="stage__title">
            {roundName(r.name)}
            {r.heats.length > 1 && <span className="stage__heat"> · {t.heat(h.index)}</span>}
          </h1>
          <div className="stage__meta">
            <span className={`wind${race.windLegal ? '' : ' wind--illegal'}`}>
              {t.wind} {race.wind >= 0 ? '+' : '−'}
              {Math.abs(race.wind).toFixed(1)} m/s
            </span>
            <span className="clock" aria-hidden="true">
              <span ref={clockRef}>0.00</span>
            </span>
          </div>
        </div>
        {!race.windLegal && isSeen && <p className="flagline">{t.windIllegal}</p>}

        <RaceCanvas runners={canvasRunners} tRef={pb.tRef} clockRef={clockRef} label={ariaRace} />

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
            {[1, 2].map((v) => (
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
          <ResultsTable key={key} race={race} marks={h.marks} players={players} />
          <div className="actionbar">
            {heat < r.heats.length - 1 ? (
              <>
                <button type="button" className="btn btn--link" onClick={revealRound}>
                  {t.skipRemaining}
                </button>
                <button type="button" className="btn btn--primary" onClick={() => goHeat(heat + 1)}>
                  {t.nextHeat} <Icon name="next" />
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : (
        <StartList race={race} players={players} />
      )}

      {roundSeen && (
        <RoundSummary
          event={event}
          round={round}
          players={players}
          onNext={() => {
            if (isFinal) onPodium();
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

function StartList({ race, players }: { race: Event100['rounds'][number]['heats'][number]['result']; players: Map<number, Player> }) {
  const { t } = useI18n();
  const byLane = [...race.runners].sort((a, b) => a.lane - b.lane);
  return (
    <section className="startlist" aria-label={t.startList}>
      <h2 className="section-title">{t.startList}</h2>
      <ol className="startlist__list">
        {byLane.map((x) => {
          const p = players.get(x.playerId)!;
          return (
            <li key={x.playerId} className="startlist__row">
              <span className="startlist__lane">{x.lane}</span>
              <Bib p={p} />
              <span className="startlist__full">{p.name}</span>
              <span className="startlist__exp">
                <span className="hint">{t.expected100}</span> {formatTime(expectedTime100(p))}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function RoundSummary({
  event,
  round,
  players,
  onNext,
}: {
  event: Event100;
  round: number;
  players: Map<number, Player>;
  onNext: () => void;
}) {
  const { t, roundName } = useI18n();
  const r = event.rounds[round]!;
  const next = event.rounds[round + 1];
  if (!next) {
    return (
      <section className="summary summary--final">
        <button type="button" className="btn btn--primary btn--block" onClick={onNext}>
          {t.toRelayOrder} <Icon name="next" />
        </button>
      </section>
    );
  }
  const rows = r.heats.flatMap((h) =>
    h.result.runners
      .filter((x) => h.marks[String(x.playerId)])
      .map((x) => ({ x, mark: h.marks[String(x.playerId)]!, heat: h.index })),
  );
  rows.sort((a, b) => (a.mark === b.mark ? a.x.time! - b.x.time! : a.mark === 'Q' ? -1 : 1));
  return (
    <section className="summary" aria-label={t.roundSummary(roundName(next.name))}>
      <h2 className="section-title">{t.roundSummary(roundName(next.name))}</h2>
      <ol className="summary__list">
        {rows.map(({ x, mark, heat }) => {
          const p = players.get(x.playerId)!;
          return (
            <li key={x.playerId} className="summary__row">
              <Bib p={p} size="sm" />
              <span className="summary__heat">{t.heat(heat)}</span>
              <span className="time-sm">{formatTime(x.time!)}</span>
              <QualMark mark={mark} />
            </li>
          );
        })}
      </ol>
      <button type="button" className="btn btn--primary btn--block" onClick={onNext}>
        {t.toNextRound(roundName(next.name))} <Icon name="next" />
      </button>
    </section>
  );
}
