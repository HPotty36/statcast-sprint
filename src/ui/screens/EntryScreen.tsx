import { useState } from 'react';
import { select100mEntries, type Delegation, type EntryOverrides } from '../../engine/delegations.ts';
import { expectedTime100, formatTime } from '../../engine/race100.ts';
import type { Player } from '../../engine/types.ts';
import { Bib, DelegationLabel } from '../components/Bib.tsx';
import { Icon } from '../components/Icon.tsx';
import { useDelegation } from '../delegationView.ts';
import { useI18n } from '../i18n.tsx';

export function EntryScreen({
  delegations,
  overrides,
  onOverrides,
  onBack,
  onBegin,
}: {
  delegations: Delegation[];
  overrides: EntryOverrides;
  onOverrides: (o: EntryOverrides) => void;
  onBack: () => void;
  onBegin: () => void;
}) {
  const { t, lang } = useI18n();
  const { mode } = useDelegation();
  const [open, setOpen] = useState<string | null>(null);
  const total = select100mEntries(delegations, mode, overrides).length;

  return (
    <div className="screen entry">
      <div className="screen__head">
        <h1 className="title">{t.entryTitle}</h1>
        <p className="hint">{t.entryHint(mode.max100mEntries, mode.id)}</p>
      </div>

      <ul className={`team-list team-list--${mode.id}`}>
        {delegations.map((d) => {
          const picked = select100mEntries([d], mode, overrides[d.id] ? { [d.id]: overrides[d.id]! } : {});
          const isOpen = open === d.id;
          return (
            <li key={d.id} className={`team${isOpen ? ' team--open' : ''}`}>
              <button type="button" className="team__head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : d.id)}>
                <span className="team__code">
                  {/* 닫힌 줄은 배번 이름이 우선 — 나라 이름은 펼쳤을 때만 */}
                  <DelegationLabel id={d.id} lang={lang} withName={isOpen} />
                </span>
                <span className="team__entrants">
                  {picked.map((p) => (
                    <Bib key={p.id} p={p} size="sm" inRow />
                  ))}
                </span>
                <span className="team__chev">
                  <Icon name="next" size={16} />
                </span>
              </button>
              {isOpen && (
                <Roster
                  d={d}
                  picked={picked}
                  custom={!!overrides[d.id]}
                  onPick={(ids) => onOverrides({ ...overrides, [d.id]: ids })}
                  onReset={() => {
                    const next = { ...overrides };
                    delete next[d.id];
                    onOverrides(next);
                  }}
                />
              )}
            </li>
          );
        })}
      </ul>

      <div className="actionbar">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          {t.back}
        </button>
        <span className="actionbar__count">{t.entrants(total)}</span>
        <button type="button" className="btn btn--primary" onClick={onBegin} disabled={total === 0}>
          {t.begin100m}
        </button>
      </div>
    </div>
  );
}

function Roster({
  d,
  picked,
  custom,
  onPick,
  onReset,
}: {
  d: Delegation;
  picked: Player[];
  custom: boolean;
  onPick: (ids: number[]) => void;
  onReset: () => void;
}) {
  const { t } = useI18n();
  const MAX = useDelegation().mode.max100mEntries;
  const ids = picked.map((p) => p.id);
  const toggle = (p: Player) => {
    if (ids.includes(p.id)) onPick(ids.filter((x) => x !== p.id));
    else if (ids.length < MAX) onPick([...ids, p.id]);
  };
  return (
    <div className="roster">
      <div className="roster__bar">
        <span className="hint">
          {t.roster(d.players.length)} · {t.pickUpTo(MAX)}
        </span>
        {custom && (
          <button type="button" className="btn btn--link" onClick={onReset}>
            {t.resetAuto}
          </button>
        )}
      </div>
      <table className="roster__table">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">✓</span>
            </th>
            <th scope="col">{t.colAthlete}</th>
            <th scope="col" className="num">
              <abbr title={`${t.sprintSpeed} (ft/s)`}>{t.speedShort}</abbr>
            </th>
            <th scope="col" className="num">
              τ
            </th>
            <th scope="col" className="num">
              {t.expected100}
            </th>
          </tr>
        </thead>
        <tbody>
          {d.players.map((p) => {
            const on = ids.includes(p.id);
            const full = !on && ids.length >= MAX;
            return (
              <tr key={p.id} className={on ? 'is-on' : full ? 'is-full' : ''}>
                <td>
                  <input type="checkbox" checked={on} disabled={full} onChange={() => toggle(p)} aria-label={p.name} />
                </td>
                <td>
                  <span className="roster__name">{p.name}</span>
                  <span className="roster__pos">
                    {p.position} · {p.batSide}
                  </span>
                </td>
                <td className="num data">{p.sprintSpeedFtS.toFixed(1)}</td>
                <td className="num data">
                  {p.tau.toFixed(2)}
                  {p.tauImputed && (
                    <abbr className="flag" title={t.tauImputed}>
                      *
                    </abbr>
                  )}
                </td>
                <td className="num time-sm">{formatTime(expectedTime100(p))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
