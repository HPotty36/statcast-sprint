import { describe, expect, it } from 'vitest';
import { withConfig } from '../src/engine/config.ts';
import { timeToDistance } from '../src/engine/kinematics.ts';
import { expectedTime100, formatTime, runRace100 } from '../src/engine/race100.ts';
import { makeHeat, makePlayer } from './helpers.ts';

/** 기복·바람·반응 시간 편차를 없앤 설정 */
const NO_NOISE = withConfig({ SIGMA_VMAX: 0, SIGMA_TAU: 0, RT_SD: 0, WIND_MEAN: 0, WIND_SD: 0 });

describe('runRace100: 재현성', () => {
  it('같은 시드 → 완전히 같은 결과', () => {
    expect(runRace100(makeHeat(8), 2026, 'R1H1')).toEqual(runRace100(makeHeat(8), 2026, 'R1H1'));
  });

  it('다른 시드 → 다른 결과', () => {
    const a = runRace100(makeHeat(8), 2026, 'R1H1');
    const b = runRace100(makeHeat(8), 2027, 'R1H1');
    expect(b.runners.map((r) => r.time)).not.toEqual(a.runners.map((r) => r.time));
  });

  it('선수 기록은 같은 조의 다른 선수나 레인과 무관 (선수별 하위 스트림)', () => {
    const heat = makeHeat(8);
    const full = runRace100(heat, 5, 'H');
    const reordered = runRace100([...heat].reverse().slice(0, 4).map((e, i) => ({ ...e, lane: i + 1 })), 5, 'H');
    for (const r of reordered.runners) {
      expect(r.time).toBe(full.runners.find((f) => f.playerId === r.playerId)!.time);
    }
  });
});

describe('runRace100: 기록 계산', () => {
  it('기복 없으면 기록 = RT_MEAN + timeToDistance(100)', () => {
    const p = makePlayer(1, { speedFtS: 30.5 });
    const r = runRace100([{ player: p, lane: 4 }], 1, 'H', NO_NOISE).runners[0]!;
    expect(r.draw.rt).toBe(0.17);
    expect(r.time).toBeCloseTo(0.17 + timeToDistance(100, { vmax: p.vmax, tau: p.tau }), 9);
    expect(r.time).toBeCloseTo(expectedTime100(p), 6);
  });

  it('다른 조건이 같으면 vmax 가 높을수록 빠르다 (같은 난수로 비교)', () => {
    const slow = makePlayer(7, { speedFtS: 28 });
    const fast = { ...slow, vmax: slow.vmax + 0.1 };
    for (let seed = 0; seed < 200; seed++) {
      const a = runRace100([{ player: slow, lane: 1 }], seed, 'H').runners[0]!;
      const b = runRace100([{ player: fast, lane: 1 }], seed, 'H').runners[0]!;
      if (a.status === 'DQ') continue;
      expect(b.time!).toBeLessThan(a.time!);
    }
    expect(expectedTime100(fast)).toBeLessThan(expectedTime100(slow));
  });

  it('뒷바람은 기록을 줄인다 (반응 시간에는 적용하지 않음)', () => {
    const p = makePlayer(1, { speedFtS: 29 });
    const calm = runRace100([{ player: p, lane: 1 }], 1, 'H', NO_NOISE).runners[0]!.time!;
    const tail = runRace100([{ player: p, lane: 1 }], 1, 'H', withConfig({ ...NO_NOISE, WIND_MEAN: 2 })).runners[0]!.time!;
    expect(tail).toBeCloseTo(0.17 + (calm - 0.17) * (1 - 0.005 * 2), 9);
  });

  it('스플릿 30m < 60m < 기록, 궤적은 (기록, 100m) 에서 끝난다', () => {
    for (const r of runRace100(makeHeat(8), 3, 'H').runners) {
      if (r.status === 'DQ') continue;
      expect(r.splits![30]!).toBeLessThan(r.splits![60]!);
      expect(r.splits![60]!).toBeLessThan(r.time!);
      expect(r.trajectory.at(-1)).toEqual({ t: r.time, x: 100 });
      expect(r.trajectory[0]).toEqual({ t: 0, x: 0 });
      // 반응 시간 전에는 출발하지 않음
      for (const pt of r.trajectory) if (pt.t <= r.draw.rt) expect(pt.x).toBe(0);
    }
  });

  it('순위는 기록 순', () => {
    const res = runRace100(makeHeat(8), 11, 'H');
    const ok = res.runners.filter((r) => r.status === 'OK');
    ok.forEach((r, i) => {
      expect(r.place).toBe(i + 1);
      if (i > 0) expect(r.time!).toBeGreaterThanOrEqual(ok[i - 1]!.time!);
    });
  });

  it('0.001초까지 같으면 시드 RNG 로 순위 결정 (재현 가능)', () => {
    const twins = [1, 2, 3].map((id, i) => ({ player: makePlayer(id, { speedFtS: 28 }), lane: i + 1 }));
    const orders = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const res = runRace100(twins, seed, 'H', NO_NOISE);
      expect(res.runners.map((r) => r.place)).toEqual([1, 2, 3]);
      expect(runRace100(twins, seed, 'H', NO_NOISE)).toEqual(res);
      orders.add(res.runners.map((r) => r.playerId).join());
    }
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe('runRace100: 부정출발과 풍속', () => {
  it('RT < 0.100 → DQ (기록·순위·궤적 없음)', () => {
    const res = runRace100(makeHeat(8), 1, 'H', withConfig({ RT_MEAN: 0.099, RT_SD: 0 }));
    for (const r of res.runners) {
      expect(r.status).toBe('DQ');
      expect(r.time).toBeNull();
      expect(r.place).toBeNull();
      expect(r.trajectory).toEqual([]);
    }
  });

  it('RT = 0.100 은 정상 출발', () => {
    const res = runRace100(makeHeat(8), 1, 'H', withConfig({ RT_MEAN: 0.1, RT_SD: 0 }));
    expect(res.runners.every((r) => r.status === 'OK')).toBe(true);
  });

  it('반응 시간 하한 0.08초', () => {
    const res = runRace100(makeHeat(8), 1, 'H', withConfig({ RT_MEAN: 0.0, RT_SD: 0 }));
    expect(res.runners.every((r) => r.draw.rt === 0.08)).toBe(true);
  });

  it('DQ 선수는 나머지 선수의 기록·순위에 영향을 주지 않는다', () => {
    const res = runRace100(makeHeat(8), 1, 'H', withConfig({ RT_MEAN: 0.1, RT_SD: 0.05 }));
    const ok = res.runners.filter((r) => r.status === 'OK');
    const dq = res.runners.filter((r) => r.status === 'DQ');
    expect(dq.length).toBeGreaterThan(0);
    expect(ok.map((r) => r.place)).toEqual(ok.map((_, i) => i + 1));
    expect(res.runners.slice(-dq.length).every((r) => r.status === 'DQ')).toBe(true);
  });

  it('풍속 +2.0 초과면 windLegal = false, 범위 [-3, +4] 로 자름', () => {
    const at = (w: number) => runRace100(makeHeat(2), 1, 'H', withConfig({ WIND_MEAN: w, WIND_SD: 0 }));
    expect(at(2.0).windLegal).toBe(true);
    expect(at(2.1).windLegal).toBe(false);
    expect(at(9).wind).toBe(4);
    expect(at(-9).wind).toBe(-3);
  });
});

describe('formatTime', () => {
  it('0.01초 단위로 올림 표시', () => {
    expect(formatTime(11.861)).toBe('11.87');
    expect(formatTime(11.86)).toBe('11.86');
    expect(formatTime(9.5801)).toBe('9.59');
  });
});
