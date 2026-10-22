import { useId, useState, type CSSProperties } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config.ts';
import { defaultRelaySquad, type Delegation } from '../../engine/delegations.ts';
import { expectedTime100, formatTime } from '../../engine/race100.ts';
import { expectedRelayTime, type Handoff, type RelaySquad } from '../../engine/relay.ts';
import { Bib, DelegationLabel } from '../components/Bib.tsx';
import { Icon } from '../components/Icon.tsx';
import { useDelegation } from '../delegationView.ts';
import { useI18n } from '../i18n.tsx';
import { moveRunner, sameSquad, setHandoff, setRunner } from '../relay/squadEdit.ts';
import { bibName } from '../teamColor.ts';

export type RelayOverrides = Record<string, RelaySquad>;

export function RelayOrderScreen({
  delegations,
  eligible,
  overrides,
  onOverrides,
  onBack,
  onBegin,
}: {
  delegations: Delegation[];
  /** 출전 자격을 얻은 대표단 id (국가별은 기대 팀 기록 상위 16개국) */
  eligible: Set<string>;
  overrides: RelayOverrides;
  onOverrides: (o: RelayOverrides) => void;
  onBack: () => void;
  onBegin: () => void;
}) {
  const { t, lang } = useI18n();
  const { mode } = useDelegation();
  const [open, setOpen] = useState<string | null>(null);
  // 주자가 모자란 대표단은 목록에서 뺀다. 자격 밖(17위 이하)은 목록에 남기되 표시한다
  const teams = delegations
    .map((d) => ({ d, base: defaultRelaySquad(d, mode) }))
    .filter((x): x is { d: Delegation; base: RelaySquad } => x.base !== null)
    .sort((a, b) => Number(eligible.has(b.d.id)) - Number(eligible.has(a.d.id)));

  const update = (base: RelaySquad, next: RelaySquad) => {
    const o = { ...overrides };
    if (sameSquad(base, next)) delete o[base.teamId];
    else o[base.teamId] = next;
    onOverrides(o);
  };

  return (
    <div className="screen relay-order">
      <div className="screen__head">
        <h1 className="title">{t.relayOrderTitle}</h1>
        <p className="hint">{t.relayOrderHint(mode.id)}</p>
      </div>

      <ul className="team-list">
        {teams.map(({ d, base }) => {
          const squad = overrides[d.id] ?? base;
          const isOpen = open === d.id;
          const out = !eligible.has(d.id);
          return (
            <li key={d.id} className={`team${isOpen ? ' team--open' : ''}${out ? ' team--out' : ''}`}>
              <button type="button" className="team__head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : d.id)}>
                <span className="team__code">
                  <DelegationLabel id={d.id} lang={lang} withName={false} />
                </span>
                <span className="team__legs">
                  {squad.runners.map((p, i) => (
                    <span key={p.id} className="team__leg">
                      {i > 0 && <HandoffGlyph h={squad.handoffs[i - 1]!} />}
                      {bibName(p.name)}
                    </span>
                  ))}
                </span>
                {overrides[d.id] && <span className="tag-edited">{t.edited}</span>}
                {out && <span className="tag-out">{t.notQualified}</span>}
                {/* 출전권(상위 16개국)을 가르는 값이므로 목록에서도 보인다 */}
                <span className="team__est time-sm">
                  <span className="team__est-label">{t.estShort}</span>
                  {formatTime(expectedRelayTime(squad))}
                </span>
                <span className="team__chev">
                  <Icon name="next" size={16} />
                </span>
              </button>
              {isOpen && (
                <SquadEditor
                  d={d}
                  squad={squad}
                  edited={!!overrides[d.id]}
                  onChange={(next) => update(base, next)}
                  onReset={() => update(base, base)}
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
        <span className="actionbar__count">{t.relayTeams(eligible.size, mode.id)}</span>
        <button type="button" className="btn btn--primary" onClick={onBegin}>
          {t.beginRelay}
        </button>
      </div>
    </div>
  );
}

/** 목록에서 바통 터치 방식을 보여 주는 작은 표시: 안전은 실선, 공격은 이중선 */
function HandoffGlyph({ h }: { h: Handoff }) {
  return <span className={`hglyph hglyph--${h}`} aria-hidden="true" />;
}

function SquadEditor({
  d,
  squad,
  edited,
  onChange,
  onReset,
}: {
  d: Delegation;
  squad: RelaySquad;
  edited: boolean;
  onChange: (s: RelaySquad) => void;
  onReset: () => void;
}) {
  const { t } = useI18n();
  /** 끌기 상태: 잡은 구간, 시작 y, 지금까지 움직인 거리, 한 칸 높이 */
  const [drag, setDrag] = useState<{ from: number; startY: number; dy: number; rowH: number } | null>(null);
  const n = squad.runners.length;
  const target = drag ? Math.max(0, Math.min(n - 1, Math.round(drag.from + drag.dy / drag.rowH))) : null;
  const pct = (x: number) => Math.round(x * 100);
  const failPct = (x: number) => (x * 100).toFixed(x < 0.01 ? 1 : 0);

  const role = (i: number) => (i === 0 ? t.legRoleStart : i === n - 1 ? t.legRoleAnchor : t.legRoleMiddle);

  return (
    <div className="squad">
      <ol className="squad__legs">
        {squad.runners.map((p, i) => {
          const dragging = drag?.from === i;
          return (
            <li key={i} className="squad__item">
              {i > 0 && (
                <HandoffControl
                  index={i - 1}
                  value={squad.handoffs[i - 1]!}
                  onChange={(h) => onChange(setHandoff(squad, i - 1, h))}
                  safeDetail={t.handoffDetail(pct(DEFAULT_CONFIG.ENTRY_SAFE), failPct(DEFAULT_CONFIG.FAIL_SAFE))}
                  aggrDetail={t.handoffDetail(pct(DEFAULT_CONFIG.ENTRY_AGGR), failPct(DEFAULT_CONFIG.FAIL_AGGR))}
                />
              )}
              <div
                className={`slot${dragging ? ' slot--dragging' : ''}${target === i && drag && !dragging ? ' slot--target' : ''}`}
                style={dragging ? ({ transform: `translateY(${drag.dy}px)` } as CSSProperties) : undefined}
              >
                <button
                  type="button"
                  className="slot__grip"
                  aria-label={t.dragHandle(i + 1)}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    const row = e.currentTarget.closest('.squad__item') as HTMLElement;
                    setDrag({ from: i, startY: e.clientY, dy: 0, rowH: row.getBoundingClientRect().height });
                  }}
                  onPointerMove={(e) => {
                    if (!drag || drag.from !== i) return;
                    setDrag({ ...drag, dy: e.clientY - drag.startY });
                  }}
                  onPointerUp={() => {
                    if (drag && target !== null) onChange(moveRunner(squad, drag.from, target));
                    setDrag(null);
                  }}
                  onPointerCancel={() => setDrag(null)}
                >
                  <Icon name="grip" />
                </button>
                <span className="slot__num" aria-label={t.leg(i + 1)}>
                  {i + 1}
                </span>
                <span className="slot__runner">
                  <span className="slot__id">
                    <Bib p={p} size="sm" />
                    <span className="slot__role">{role(i)}</span>
                  </span>
                  <RunnerSelect d={d} slot={i} value={p.id} onPick={(pl) => onChange(setRunner(squad, i, pl))} />
                  {/* 추정 100m 은 선택 목록에 이미 있으므로 여기는 데이터 값만 */}
                  <span className="slot__stats data">
                    {t.speedShort} {p.sprintSpeedFtS.toFixed(1)} ft/s · τ {p.tau.toFixed(2)} s
                  </span>
                </span>
                <span className="slot__moves">
                  <button type="button" className="iconbtn" aria-label={`${t.leg(i + 1)} ${t.moveUp}`} disabled={i === 0} onClick={() => onChange(moveRunner(squad, i, i - 1))}>
                    <Icon name="up" size={16} />
                  </button>
                  <button type="button" className="iconbtn" aria-label={`${t.leg(i + 1)} ${t.moveDown}`} disabled={i === n - 1} onClick={() => onChange(moveRunner(squad, i, i + 1))}>
                    <Icon name="down" size={16} />
                  </button>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="squad__foot">
        <span className="squad__est">
          <span className="hint">{t.expectedRelay}</span>
          <span className="time">{formatTime(expectedRelayTime(squad))}</span>
        </span>
        {edited && (
          <button type="button" className="btn btn--link" onClick={onReset}>
            {t.resetDefault}
          </button>
        )}
      </div>
    </div>
  );
}

function RunnerSelect({ d, slot, value, onPick }: { d: Delegation; slot: number; value: number; onPick: (p: Delegation['players'][number]) => void }) {
  const { t } = useI18n();
  const id = useId();
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {t.swapRunner(slot + 1)}
      </label>
      <select
        id={id}
        className="input input--sm slot__select"
        value={value}
        onChange={(e) => onPick(d.players.find((p) => p.id === Number(e.target.value))!)}
      >
        {d.players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {t.estShort} {formatTime(expectedTime100(p))}
          </option>
        ))}
      </select>
    </>
  );
}

function HandoffControl({
  index,
  value,
  onChange,
  safeDetail,
  aggrDetail,
}: {
  index: number;
  value: Handoff;
  onChange: (h: Handoff) => void;
  safeDetail: string;
  aggrDetail: string;
}) {
  const { t } = useI18n();
  const name = useId();
  return (
    <fieldset className="handoff">
      <legend className="handoff__label">{t.handoffLabel(index + 1, index + 2)}</legend>
      <div className="handoff__seg">
        {(['safe', 'aggressive'] as const).map((h) => (
          <label key={h} className={`handoff__opt handoff__opt--${h}`}>
            <input type="radio" name={name} value={h} checked={value === h} onChange={() => onChange(h)} />
            <span className="handoff__title">{h === 'safe' ? t.handoffSafe : t.handoffAggr}</span>
            <span className="handoff__detail">{h === 'safe' ? safeDetail : aggrDetail}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
