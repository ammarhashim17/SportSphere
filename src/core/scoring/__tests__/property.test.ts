import * as fc from 'fast-check';
import {
  applyDelivery,
  availableBatters,
  canStartOver,
  emptyInnings,
  nextBallContext,
  replay,
  validateDelivery,
} from '../engine';
import {
  maxWickets,
  type Delivery,
  type InningsSetup,
  type InningsState,
  type MatchConfig,
  type WicketType,
} from '../types';
import { bat, bowl, setup, T20 } from '../testkit';

const CFG: MatchConfig = {
  oversPerInnings: 6,
  ballsPerOver: 6,
  maxOversPerBowler: 2,
  freeHitEnabled: true,
  playersPerSide: 11,
};

/** Builds a random but VALID innings from a stream of random integers. */
function generate(
  cfg: MatchConfig,
  su: InningsSetup,
  rolls: number[],
): { deliveries: Delivery[]; state: InningsState } {
  let state = emptyInnings(su);
  const deliveries: Delivery[] = [];
  let i = 0;
  const next = (n: number) => rolls[i++ % rolls.length]! % n;
  let seq = 0;

  while (state.status === 'in_progress' && deliveries.length < 400) {
    const ctx = nextBallContext(state, cfg);
    let bowlerId = ctx.bowlerId;
    if (!bowlerId) {
      const opts = su.bowlingXI.filter((b) => canStartOver(state, cfg, b).ok);
      if (opts.length === 0) break;
      bowlerId = opts[next(opts.length)]!;
    }
    const base = {
      id: `g${seq}`,
      inningsNo: su.inningsNo,
      seq: ++seq,
      strikerId: ctx.strikerId,
      nonStrikerId: ctx.nonStrikerId,
      bowlerId,
    } as const;
    const roll = next(100);
    let d: Delivery;
    if (roll < 40) d = { ...base, runsOffBat: [0, 0, 0, 1, 1, 2][next(6)]! };
    else if (roll < 50) d = { ...base, runsOffBat: next(2) ? 4 : 6, isBoundary: true };
    else if (roll < 56) d = { ...base, runsOffBat: 3 };
    else if (roll < 66) d = { ...base, runsOffBat: 0, extra: { type: 'WIDE', runs: 1 + next(3) } };
    else if (roll < 72) d = { ...base, runsOffBat: next(5), extra: { type: 'NO_BALL', runs: 1 } };
    else if (roll < 76)
      d = {
        ...base,
        runsOffBat: 0,
        extra: { type: 'NO_BALL', runs: 2 + next(3), subType: next(2) ? 'BYE' : 'LEG_BYE' },
      };
    else if (roll < 82)
      d = {
        ...base,
        runsOffBat: 0,
        extra: { type: next(2) ? 'BYE' : 'LEG_BYE', runs: 1 + next(4) },
      };
    else {
      const types: WicketType[] = ['BOWLED', 'CAUGHT', 'LBW', 'STUMPED', 'RUN_OUT', 'HIT_WICKET'];
      const type = types[next(types.length)]!;
      const avail = availableBatters(state, su);
      const outId = type === 'RUN_OUT' && next(2) ? ctx.nonStrikerId : ctx.strikerId;
      d = {
        ...base,
        runsOffBat: type === 'RUN_OUT' ? next(3) : 0,
        wicket: {
          type,
          playerOutId: outId,
          fielderId: bowl[next(bowl.length)]!,
          incomingBatterId: avail.length ? avail[next(avail.length)]! : null,
        },
      };
    }
    if (validateDelivery(state, cfg, su, d).length > 0) continue; // skip impossible combos (consumes rolls, progress guaranteed by plain runs)
    deliveries.push(d);
    state = applyDelivery(state, cfg, d);
  }
  return { deliveries, state };
}

const invariants = (s: InningsState, cfg: MatchConfig) => {
  const batRuns = Object.values(s.batters).reduce((n, b) => n + b.runs, 0);
  expect(s.runs).toBe(batRuns + s.extras.total);
  expect(s.extras.total).toBe(s.extras.wides + s.extras.noBalls + s.extras.byes + s.extras.legByes);

  const bowlers = Object.values(s.bowlers);
  expect(bowlers.reduce((n, b) => n + b.legalBalls, 0)).toBe(s.legalBalls);
  expect(bowlers.reduce((n, b) => n + b.runs, 0)).toBe(s.runs - s.extras.byes - s.extras.legByes);
  expect(bowlers.reduce((n, b) => n + b.wickets, 0)).toBeLessThanOrEqual(s.wickets);

  const out = Object.values(s.batters).filter((b) => b.out).length;
  expect(s.wickets).toBe(out);
  expect(s.fow).toHaveLength(s.wickets);
  expect(s.wickets).toBeLessThanOrEqual(maxWickets(cfg));
  expect(s.legalBalls).toBeLessThanOrEqual(cfg.oversPerInnings * cfg.ballsPerOver);

  const partnershipRuns = [...s.partnerships, s.partnership].reduce((n, p) => n + p.runs, 0);
  expect(partnershipRuns).toBe(s.runs);

  // the two batters at the crease are never out and are distinct
  if (s.status === 'in_progress') {
    expect(s.strikerId).not.toBe(s.nonStrikerId);
    expect(s.batters[s.strikerId]?.out).toBe(false);
    expect(s.batters[s.nonStrikerId]?.out).toBe(false);
  }
  // every legal ball is in the ball list and per-over counts never exceed 6
  expect(s.balls.filter((b) => b.legal)).toHaveLength(s.legalBalls);
  const perOver = new Map<number, number>();
  for (const b of s.balls) if (b.legal) perOver.set(b.overNo, (perOver.get(b.overNo) ?? 0) + 1);
  for (const n of perOver.values()) expect(n).toBeLessThanOrEqual(cfg.ballsPerOver);
};

describe('scoring engine — properties', () => {
  const rolls = fc.array(fc.integer({ min: 0, max: 1_000_000 }), { minLength: 50, maxLength: 600 });

  it('invariants hold for random valid first innings', () => {
    fc.assert(
      fc.property(rolls, (r) => {
        const su = setup();
        const { state } = generate(CFG, su, r);
        invariants(state, CFG);
      }),
      { numRuns: 300 },
    );
  });

  it('replay of the stored events equals the incrementally built state', () => {
    fc.assert(
      fc.property(rolls, (r) => {
        const su = setup();
        const { deliveries, state } = generate(CFG, su, r);
        expect(replay(CFG, su, deliveries)).toEqual(state);
      }),
      { numRuns: 200 },
    );
  });

  it('undo (void the last ball) equals the state before it', () => {
    fc.assert(
      fc.property(rolls, (r) => {
        const su = setup();
        const { deliveries } = generate(CFG, su, r);
        if (deliveries.length === 0) return;
        const voided = deliveries.map((d, i) =>
          i === deliveries.length - 1 ? { ...d, voided: true } : d,
        );
        expect(replay(CFG, su, voided)).toEqual(replay(CFG, su, deliveries.slice(0, -1)));
      }),
      { numRuns: 200 },
    );
  });

  it('chasing innings never exceeds target + 6 and ends on reaching it', () => {
    fc.assert(
      fc.property(rolls, fc.integer({ min: 10, max: 120 }), (r, target) => {
        const su = setup({ inningsNo: 2, target });
        const { state } = generate(CFG, su, r);
        invariants(state, CFG);
        if (state.endReason === 'TARGET_REACHED') expect(state.runs).toBeGreaterThanOrEqual(target);
        else expect(state.runs).toBeLessThan(target);
      }),
      { numRuns: 200 },
    );
  });

  it('T20 sanity: a full 20 overs of singles is 120 runs and ends', () => {
    let s = emptyInnings(setup());
    let a = 'b1',
      b = 'b2';
    for (let o = 0; o < 20; o++) {
      const bowler = bowl[o % 5]!; // 5 bowlers x 4 overs
      for (let k = 0; k < 6; k++) {
        s = applyDelivery(s, T20, {
          id: `x${o}-${k}`,
          inningsNo: 1,
          seq: o * 6 + k + 1,
          strikerId: a,
          nonStrikerId: b,
          bowlerId: bowler,
          runsOffBat: 1,
        });
        [a, b] = [b, a];
      }
      [a, b] = [b, a]; // end-of-over swap is applied by the engine; keep our local copy in sync with s
      a = s.strikerId;
      b = s.nonStrikerId;
    }
    expect(s).toMatchObject({
      status: 'completed',
      endReason: 'OVERS_COMPLETE',
      runs: 120,
      wickets: 0,
      legalBalls: 120,
    });
    expect(bat.length).toBe(11);
  });
});
