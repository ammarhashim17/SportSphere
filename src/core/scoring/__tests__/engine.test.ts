import {
  applyDelivery,
  assertValidDelivery,
  availableBatters,
  canStartOver,
  emptyInnings,
  endInnings,
  nextBallContext,
  replay,
  validateDelivery,
  completedRuns,
} from '../engine';
import {
  bowlerFigures,
  chaseInfo,
  currentOverView,
  partnershipView,
  runRate,
  strikeRate,
} from '../selectors';
import { computeResult, resultText } from '../result';
import type { Delivery } from '../types';
import { dv, SHORT, setup, T20 } from '../testkit';

const S = (o = {}) => emptyInnings(setup(o));
const ball = (p: Partial<Delivery> = {}) =>
  dv({ strikerId: 'b1', nonStrikerId: 'b2', bowlerId: 'w1', ...p });

describe('runs & strike rotation', () => {
  it('scores runs to batter and team; odd runs rotate strike', () => {
    let s = S();
    s = applyDelivery(s, T20, ball({ runsOffBat: 1 }));
    expect(s.runs).toBe(1);
    expect(s.batters.b1?.runs).toBe(1);
    expect(s.batters.b1?.balls).toBe(1);
    expect(s.strikerId).toBe('b2');
    expect(s.nonStrikerId).toBe('b1');
    s = applyDelivery(s, T20, ball({ strikerId: 'b2', nonStrikerId: 'b1', runsOffBat: 2 }));
    expect(s.strikerId).toBe('b2'); // even runs keep strike
  });

  it('counts boundaries: fours need isBoundary, sixes always', () => {
    let s = S();
    s = applyDelivery(s, T20, ball({ runsOffBat: 4, isBoundary: true }));
    s = applyDelivery(s, T20, ball({ runsOffBat: 4, isBoundary: false }));
    s = applyDelivery(s, T20, ball({ runsOffBat: 6, isBoundary: true }));
    expect(s.batters.b1?.fours).toBe(1);
    expect(s.batters.b1?.sixes).toBe(1);
    expect(s.runs).toBe(14);
  });

  it('dot ball gives label • and kind dot', () => {
    const s = applyDelivery(S(), T20, ball());
    expect(s.balls[0]).toMatchObject({ label: '•', kind: 'dot', legal: true, overBall: '0.1' });
  });
});

describe('extras', () => {
  it('wide: +1, not a legal ball, not faced, charged to bowler', () => {
    const s = applyDelivery(S(), T20, ball({ extra: { type: 'WIDE', runs: 1 } }));
    expect(s.runs).toBe(1);
    expect(s.legalBalls).toBe(0);
    expect(s.batters.b1?.balls).toBe(0);
    expect(s.extras.wides).toBe(1);
    expect(s.bowlers.w1).toMatchObject({ runs: 1, legalBalls: 0, wides: 1 });
    expect(s.balls[0]).toMatchObject({ label: 'Wd+1', kind: 'extra', overBall: '0.0' });
    expect(s.strikerId).toBe('b1');
  });

  it('wide with 2 extra runs run (total 3) rotates the strike? 2 run = even → no', () => {
    const s = applyDelivery(S(), T20, ball({ extra: { type: 'WIDE', runs: 3 } }));
    expect(completedRuns(ball({ extra: { type: 'WIDE', runs: 3 } }))).toBe(2);
    expect(s.runs).toBe(3);
    expect(s.strikerId).toBe('b1');
  });

  it('wide + 1 run (total 2) rotates strike', () => {
    const s = applyDelivery(S(), T20, ball({ extra: { type: 'WIDE', runs: 2 } }));
    expect(s.strikerId).toBe('b2');
  });

  it('no-ball: penalty to bowler, bat runs to batter, ball faced, free hit follows', () => {
    let s = applyDelivery(
      S(),
      T20,
      ball({ runsOffBat: 4, isBoundary: true, extra: { type: 'NO_BALL', runs: 1 } }),
    );
    expect(s.runs).toBe(5);
    expect(s.legalBalls).toBe(0);
    expect(s.batters.b1).toMatchObject({ runs: 4, balls: 1, fours: 1 });
    expect(s.bowlers.w1?.runs).toBe(5);
    expect(s.extras.noBalls).toBe(1);
    expect(s.freeHit).toBe(true);
    s = applyDelivery(s, T20, ball());
    expect(s.freeHit).toBe(false);
  });

  it('free hit carries over a wide', () => {
    let s = applyDelivery(S(), T20, ball({ extra: { type: 'NO_BALL', runs: 1 } }));
    s = applyDelivery(s, T20, ball({ extra: { type: 'WIDE', runs: 1 } }));
    expect(s.freeHit).toBe(true);
    s = applyDelivery(s, T20, ball());
    expect(s.freeHit).toBe(false);
  });

  it('no free hit when the rule is disabled', () => {
    const s = applyDelivery(
      S(),
      { ...T20, freeHitEnabled: false },
      ball({ extra: { type: 'NO_BALL', runs: 1 } }),
    );
    expect(s.freeHit).toBe(false);
  });

  it('no-ball + 2 byes: bowler charged only the penalty; byes go to extras', () => {
    const s = applyDelivery(
      S(),
      T20,
      ball({ extra: { type: 'NO_BALL', runs: 3, subType: 'BYE' } }),
    );
    expect(s.runs).toBe(3);
    expect(s.extras).toMatchObject({ noBalls: 1, byes: 2, total: 3 });
    expect(s.bowlers.w1?.runs).toBe(1);
    expect(s.batters.b1?.runs).toBe(0);
    expect(s.batters.b1?.balls).toBe(1);
  });

  it('byes and leg byes: legal, faced, not charged to bowler; odd rotates', () => {
    let s = applyDelivery(S(), T20, ball({ extra: { type: 'BYE', runs: 1 } }));
    expect(s).toMatchObject({ runs: 1, legalBalls: 1, strikerId: 'b2' });
    expect(s.batters.b1?.balls).toBe(1);
    expect(s.bowlers.w1?.runs).toBe(0);
    s = applyDelivery(
      s,
      T20,
      ball({ strikerId: 'b2', nonStrikerId: 'b1', extra: { type: 'LEG_BYE', runs: 4 } }),
    );
    expect(s.extras).toMatchObject({ byes: 1, legByes: 4, total: 5 });
    expect(s.balls[1]).toMatchObject({ label: 'Lb4', kind: 'extra' });
  });
});

describe('overs', () => {
  const sixDots = (s = S(), bowler = 'w1', a = 'b1', b = 'b2') => {
    let st = s;
    for (let i = 0; i < 6; i++)
      st = applyDelivery(st, T20, dv({ strikerId: a, nonStrikerId: b, bowlerId: bowler }));
    return st;
  };

  it('over ends after 6 legal balls: strike swaps, bowler must change, maiden credited', () => {
    const s = sixDots();
    expect(s.legalBalls).toBe(6);
    expect(s.strikerId).toBe('b2');
    expect(s.nonStrikerId).toBe('b1');
    expect(s.bowlerId).toBeNull();
    expect(s.lastOverBowlerId).toBe('w1');
    expect(s.bowlers.w1?.maidens).toBe(1);
    expect(nextBallContext(s, T20)).toMatchObject({
      needsNewBowler: true,
      overNo: 1,
      ballInOver: 0,
    });
    expect(bowlerFigures(s.bowlers.w1!, 6)).toBe('1.0-1-0-0');
  });

  it('a wide in the over spoils the maiden; byes do not', () => {
    let s = S();
    s = applyDelivery(s, T20, ball({ extra: { type: 'WIDE', runs: 1 } }));
    for (let i = 0; i < 6; i++) s = applyDelivery(s, T20, ball());
    expect(s.bowlers.w1?.maidens).toBe(0);
    let t = S();
    for (let i = 0; i < 5; i++) t = applyDelivery(t, T20, ball());
    t = applyDelivery(t, T20, ball({ extra: { type: 'BYE', runs: 2 } }));
    expect(t.bowlers.w1?.maidens).toBe(1);
  });

  it('after an odd last ball the net effect of end-of-over swap is no change of striker', () => {
    let s = S();
    for (let i = 0; i < 5; i++) s = applyDelivery(s, T20, ball());
    s = applyDelivery(s, T20, ball({ runsOffBat: 1 })); // b1 takes a single off the last ball
    expect(s.strikerId).toBe('b1'); // swapped by the single, swapped back by the over end
  });

  it('overBall labels run 0.1 … 0.6 then 1.1', () => {
    let s = sixDots();
    expect(s.balls.map((b) => b.overBall)).toEqual(['0.1', '0.2', '0.3', '0.4', '0.5', '0.6']);
    s = applyDelivery(s, T20, dv({ strikerId: 'b2', nonStrikerId: 'b1', bowlerId: 'w2' }));
    expect(s.balls[6]?.overBall).toBe('1.1');
  });

  it('currentOverView shows the finished over until the next ball, then the new over', () => {
    let s = sixDots();
    expect(currentOverView(s, T20)).toMatchObject({ overNumber: 1, runs: 0 });
    expect(currentOverView(s, T20).balls).toHaveLength(6);
    s = applyDelivery(
      s,
      T20,
      dv({ strikerId: 'b2', nonStrikerId: 'b1', bowlerId: 'w2', runsOffBat: 1 }),
    );
    expect(currentOverView(s, T20)).toMatchObject({ overNumber: 2, runs: 1 });
  });

  it('bowler rules: consecutive overs and quota', () => {
    const s = sixDots();
    expect(canStartOver(s, T20, 'w1')).toEqual({ ok: false, reason: 'BOWLER_CONSECUTIVE' });
    expect(canStartOver(s, T20, 'w2').ok).toBe(true);
    const errs = validateDelivery(
      s,
      T20,
      setup(),
      dv({ strikerId: 'b2', nonStrikerId: 'b1', bowlerId: 'w1' }),
    );
    expect(errs.map((e) => e.code)).toContain('BOWLER_CONSECUTIVE');
    // quota (1 over in SHORT)
    let q = emptyInnings(setup());
    for (let i = 0; i < 6; i++) q = applyDelivery(q, SHORT, ball());
    q = applyDelivery(q, SHORT, dv({ strikerId: 'b2', nonStrikerId: 'b1', bowlerId: 'w2' }));
    for (let i = 0; i < 5; i++)
      q = applyDelivery(
        q,
        { ...SHORT, oversPerInnings: 20 },
        dv({ strikerId: 'b2', nonStrikerId: 'b1', bowlerId: 'w2' }),
      );
    expect(canStartOver(q, SHORT, 'w1').ok).toBe(false);
  });

  it('mid-over bowler change needs the allow flag', () => {
    const s = applyDelivery(S(), T20, ball());
    const d = ball({ bowlerId: 'w2' });
    expect(validateDelivery(s, T20, setup(), d).map((e) => e.code)).toContain('BOWLER_MISMATCH');
    expect(validateDelivery(s, T20, setup(), d, { allowBowlerChange: true })).toHaveLength(0);
  });
});

describe('wickets', () => {
  it('bowled: striker out, bowler credited, incoming takes striker end, FOW + partnership recorded', () => {
    let s = S();
    s = applyDelivery(s, T20, ball({ runsOffBat: 2 }));
    s = applyDelivery(
      s,
      T20,
      ball({ wicket: { type: 'BOWLED', playerOutId: 'b1', incomingBatterId: 'b3' } }),
    );
    expect(s.wickets).toBe(1);
    expect(s.batters.b1).toMatchObject({
      out: true,
      dismissal: { type: 'BOWLED', bowlerId: 'w1' },
    });
    expect(s.bowlers.w1?.wickets).toBe(1);
    expect(s.strikerId).toBe('b3');
    expect(s.nonStrikerId).toBe('b2');
    expect(s.fow[0]).toEqual({ wicketNo: 1, runs: 2, playerId: 'b1', over: '0.2' });
    expect(s.partnerships[0]).toMatchObject({ runs: 2, balls: 2, endedBy: 'WICKET', wicketNo: 1 });
    expect(s.partnership.batterAId).toBe('b3');
    expect(s.balls[1]).toMatchObject({ label: 'W', kind: 'wicket' });
  });

  it('caught: fielder stored; run out: bowler NOT credited and runs completed count', () => {
    let s = applyDelivery(
      S(),
      T20,
      ball({
        wicket: { type: 'CAUGHT', playerOutId: 'b1', fielderId: 'w5', incomingBatterId: 'b3' },
      }),
    );
    expect(s.batters.b1?.dismissal).toEqual({ type: 'CAUGHT', bowlerId: 'w1', fielderId: 'w5' });
    s = applyDelivery(
      s,
      T20,
      ball({
        strikerId: 'b3',
        runsOffBat: 1,
        wicket: { type: 'RUN_OUT', playerOutId: 'b2', fielderId: 'w2', incomingBatterId: 'b4' },
      }),
    );
    expect(s.bowlers.w1?.wickets).toBe(1); // only the catch
    expect(s.batters.b2?.dismissal).toEqual({ type: 'RUN_OUT', bowlerId: null, fielderId: 'w2' });
    expect(s.runs).toBe(1);
    // single run: batters crossed, b2 (originally non-striker) is now at the striker's end; incoming takes b2's end
    expect(s.strikerId).toBe('b4');
    expect(s.nonStrikerId).toBe('b3');
  });

  it('run out of the non-striker with no run: incoming takes the non-striker end by default', () => {
    const s = applyDelivery(
      S(),
      T20,
      ball({ wicket: { type: 'RUN_OUT', playerOutId: 'b2', incomingBatterId: 'b3' } }),
    );
    expect(s.strikerId).toBe('b1');
    expect(s.nonStrikerId).toBe('b3');
  });

  it('incomingAt overrides the default end', () => {
    const s = applyDelivery(
      S(),
      T20,
      ball({
        wicket: {
          type: 'CAUGHT',
          playerOutId: 'b1',
          incomingBatterId: 'b3',
          incomingAt: 'NON_STRIKER',
        },
      }),
    );
    expect(s.strikerId).toBe('b2');
    expect(s.nonStrikerId).toBe('b3');
  });

  it('wicket on the last ball of an over: incoming ends up at the non-striker end after the over swap', () => {
    let s = S();
    for (let i = 0; i < 5; i++) s = applyDelivery(s, T20, ball());
    s = applyDelivery(
      s,
      T20,
      ball({ wicket: { type: 'BOWLED', playerOutId: 'b1', incomingBatterId: 'b3' } }),
    );
    expect(s.strikerId).toBe('b2');
    expect(s.nonStrikerId).toBe('b3');
  });

  it('all out ends the innings and needs no incoming batter', () => {
    const cfg = { ...T20, playersPerSide: 3 };
    const su = setup({ battingXI: ['b1', 'b2', 'b3'] });
    let s = emptyInnings(su);
    s = applyDelivery(
      s,
      cfg,
      ball({ wicket: { type: 'BOWLED', playerOutId: 'b1', incomingBatterId: 'b3' } }),
    );
    const last = ball({
      strikerId: 'b3',
      nonStrikerId: 'b2',
      wicket: { type: 'BOWLED', playerOutId: 'b3' },
    });
    expect(validateDelivery(s, cfg, su, last)).toHaveLength(0);
    s = applyDelivery(s, cfg, last);
    expect(s).toMatchObject({ status: 'completed', endReason: 'ALL_OUT', wickets: 2 });
  });

  it('retired hurt (dead ball): not a wicket, batter may return later', () => {
    let s = S();
    s = applyDelivery(s, T20, ball({ runsOffBat: 1 }));
    const retire = dv({
      kind: 'DEAD',
      strikerId: 'b2',
      nonStrikerId: 'b1',
      bowlerId: 'w1',
      wicket: { type: 'RETIRED_HURT', playerOutId: 'b2', incomingBatterId: 'b3' },
    });
    expect(validateDelivery(s, T20, setup(), retire)).toHaveLength(0);
    s = applyDelivery(s, T20, retire);
    expect(s.wickets).toBe(0);
    expect(s.legalBalls).toBe(1);
    expect(s.batters.b2).toMatchObject({ out: false, retiredHurt: true });
    expect(s.strikerId).toBe('b3');
    expect(s.partnerships[0]?.endedBy).toBe('RETIRED');
    expect(availableBatters(s, setup())).toContain('b2'); // can come back
  });

  it('retired out counts as a wicket but not the bowler’s', () => {
    const retire = dv({
      kind: 'DEAD',
      strikerId: 'b1',
      nonStrikerId: 'b2',
      bowlerId: 'w1',
      wicket: { type: 'RETIRED_OUT', playerOutId: 'b1', incomingBatterId: 'b3' },
    });
    const s = applyDelivery(S(), T20, retire);
    expect(s.wickets).toBe(1);
    expect(s.bowlers.w1?.wickets ?? 0).toBe(0);
  });

  it('stumped on a wide is allowed; bowled on a wide / no-ball / free hit is not', () => {
    const base = S();
    const ok = ball({
      extra: { type: 'WIDE', runs: 1 },
      wicket: { type: 'STUMPED', playerOutId: 'b1', incomingBatterId: 'b3' },
    });
    expect(validateDelivery(base, T20, setup(), ok)).toHaveLength(0);
    const bad = ball({
      extra: { type: 'WIDE', runs: 1 },
      wicket: { type: 'BOWLED', playerOutId: 'b1', incomingBatterId: 'b3' },
    });
    expect(validateDelivery(base, T20, setup(), bad).map((e) => e.code)).toContain(
      'WICKET_NOT_ALLOWED',
    );
    const nb = ball({
      extra: { type: 'NO_BALL', runs: 1 },
      wicket: { type: 'CAUGHT', playerOutId: 'b1', incomingBatterId: 'b3' },
    });
    expect(validateDelivery(base, T20, setup(), nb).map((e) => e.code)).toContain(
      'WICKET_NOT_ALLOWED',
    );
    const afterNb = applyDelivery(base, T20, ball({ extra: { type: 'NO_BALL', runs: 1 } }));
    const fh = ball({ wicket: { type: 'LBW', playerOutId: 'b1', incomingBatterId: 'b3' } });
    expect(validateDelivery(afterNb, T20, setup(), fh).map((e) => e.code)).toContain(
      'WICKET_NOT_ALLOWED',
    );
    const fhRunOut = ball({
      wicket: { type: 'RUN_OUT', playerOutId: 'b1', incomingBatterId: 'b3' },
    });
    expect(validateDelivery(afterNb, T20, setup(), fhRunOut)).toHaveLength(0);
  });

  it('requires an incoming batter and rejects one who is out or already at the crease', () => {
    let s = applyDelivery(
      S(),
      T20,
      ball({ wicket: { type: 'BOWLED', playerOutId: 'b1', incomingBatterId: 'b3' } }),
    );
    const noIncoming = ball({ strikerId: 'b3', wicket: { type: 'BOWLED', playerOutId: 'b3' } });
    expect(validateDelivery(s, T20, setup(), noIncoming).map((e) => e.code)).toContain(
      'INCOMING_REQUIRED',
    );
    const reuse = ball({
      strikerId: 'b3',
      wicket: { type: 'BOWLED', playerOutId: 'b3', incomingBatterId: 'b1' },
    });
    expect(validateDelivery(s, T20, setup(), reuse).map((e) => e.code)).toContain(
      'INCOMING_INVALID',
    );
    const atCrease = ball({
      strikerId: 'b3',
      wicket: { type: 'BOWLED', playerOutId: 'b3', incomingBatterId: 'b2' },
    });
    expect(validateDelivery(s, T20, setup(), atCrease).map((e) => e.code)).toContain(
      'INCOMING_INVALID',
    );
    s = applyDelivery(s, T20, ball({ strikerId: 'b3' }));
    expect(availableBatters(s, setup())).not.toContain('b1');
  });

  it('only a run out / obstruction can dismiss the non-striker', () => {
    const d = ball({ wicket: { type: 'BOWLED', playerOutId: 'b2', incomingBatterId: 'b3' } });
    expect(validateDelivery(S(), T20, setup(), d).map((e) => e.code)).toContain('INVALID_WICKET');
  });
});

describe('validation of shape', () => {
  it('rejects bat runs on wides/byes, bad boundary flags, batters not at the crease', () => {
    const codes = (d: Delivery) => validateDelivery(S(), T20, setup(), d).map((e) => e.code);
    expect(codes(ball({ runsOffBat: 1, extra: { type: 'WIDE', runs: 1 } }))).toContain(
      'INVALID_EXTRA',
    );
    expect(codes(ball({ runsOffBat: 2, isBoundary: true }))).toContain('INVALID_BOUNDARY');
    expect(codes(ball({ strikerId: 'b3' }))).toContain('BATTER_NOT_AT_CREASE');
    expect(codes(ball({ runsOffBat: 9 }))).toContain('INVALID_RUNS');
    expect(codes(ball({ extra: { type: 'NO_BALL', runs: 2 } }))).toContain('INVALID_EXTRA');
  });

  it('a swapped striker/non-striker pair is accepted (Swap Strike)', () => {
    expect(
      validateDelivery(S(), T20, setup(), ball({ strikerId: 'b2', nonStrikerId: 'b1' })),
    ).toHaveLength(0);
  });

  it('assertValidDelivery throws the first problem', () => {
    expect(() => assertValidDelivery(S(), T20, setup(), ball({ runsOffBat: 9 }))).toThrow('0–7');
  });
});

describe('innings end & chase', () => {
  it('ends when overs are complete', () => {
    let s = emptyInnings(setup());
    const cfg = { ...SHORT, playersPerSide: 11 };
    let bowler = 'w1';
    let a = 'b1';
    let b = 'b2';
    for (let o = 0; o < 2; o++) {
      for (let i = 0; i < 6; i++)
        s = applyDelivery(s, cfg, dv({ strikerId: a, nonStrikerId: b, bowlerId: bowler }));
      [a, b] = [b, a];
      bowler = 'w2';
    }
    expect(s).toMatchObject({ status: 'completed', endReason: 'OVERS_COMPLETE', legalBalls: 12 });
  });

  it('second innings ends the moment the target is reached', () => {
    let s = emptyInnings(setup({ inningsNo: 2, target: 5 }));
    s = applyDelivery(s, T20, ball({ inningsNo: 2, runsOffBat: 4, isBoundary: true }));
    expect(s.status).toBe('in_progress');
    s = applyDelivery(s, T20, ball({ inningsNo: 2, runsOffBat: 1 }));
    expect(s).toMatchObject({ status: 'completed', endReason: 'TARGET_REACHED', runs: 5 });
    expect(validateDelivery(s, T20, setup(), ball()).map((e) => e.code)).toContain(
      'INNINGS_COMPLETE',
    );
  });

  it('chaseInfo gives runs needed, balls left and required rate', () => {
    let s = emptyInnings(setup({ inningsNo: 2, target: 149 }));
    s = { ...s, runs: 102, legalBalls: 86 };
    const c = chaseInfo(s, T20)!;
    expect(c).toMatchObject({ target: 149, runsNeeded: 47, ballsRemaining: 34 });
    expect(c.requiredRate).toBe(8.29); // Stitch design: RRR 8.29
    expect(c.currentRate).toBe(7.12); // CRR 7.12
    expect(chaseInfo(emptyInnings(setup()), T20)).toBeNull();
  });

  it('manual end/declaration', () => {
    expect(endInnings(S(), 'DECLARED')).toMatchObject({
      status: 'completed',
      endReason: 'DECLARED',
    });
  });

  it('deliveries after the end are ignored on replay and counted', () => {
    const ds = [ball({ inningsNo: 2, runsOffBat: 6 }), ball({ inningsNo: 2, runsOffBat: 1 })];
    const s = replay(T20, setup({ inningsNo: 2, target: 5 }), ds);
    expect(s.runs).toBe(6);
    expect(s.ignoredDeliveries).toBe(1);
  });
});

describe('replay, undo and edit', () => {
  const innings = (): Delivery[] => [
    ball({ seq: 1, runsOffBat: 1 }),
    ball({ seq: 2, strikerId: 'b2', nonStrikerId: 'b1', runsOffBat: 4, isBoundary: true }),
    ball({
      seq: 3,
      strikerId: 'b2',
      nonStrikerId: 'b1',
      wicket: { type: 'CAUGHT', playerOutId: 'b2', fielderId: 'w3', incomingBatterId: 'b3' },
    }),
  ];

  it('replay equals incremental application', () => {
    const ds = innings();
    let s = emptyInnings(setup());
    for (const d of ds) s = applyDelivery(s, T20, d);
    expect(replay(T20, setup(), ds)).toEqual(s);
  });

  it('undo = void the last delivery and replay', () => {
    const ds = innings();
    const before = replay(T20, setup(), ds.slice(0, 2));
    const after = replay(
      T20,
      setup(),
      ds.map((d, i) => (i === 2 ? { ...d, voided: true } : d)),
    );
    expect(after).toEqual(before);
  });

  it('editing an earlier ball recalculates everything after it', () => {
    const ds = innings();
    ds[1] = { ...ds[1]!, runsOffBat: 6, isBoundary: true };
    const s = replay(T20, setup(), ds);
    expect(s.runs).toBe(7);
    expect(s.batters.b2).toMatchObject({ runs: 6, sixes: 1, fours: 0 });
  });

  it('does not mutate its inputs', () => {
    const s = emptyInnings(setup());
    const frozen = JSON.stringify(s);
    applyDelivery(s, T20, ball({ runsOffBat: 1 }));
    expect(JSON.stringify(s)).toBe(frozen);
  });
});

describe('selectors & results', () => {
  it('partnership split like the Stitch bar (Sharma 20 • Ali 14)', () => {
    let s = S();
    for (let i = 0; i < 4; i++) s = applyDelivery(s, T20, ball({ runsOffBat: 5 }));
    // b1 faces: 5 (odd → rotate each ball) – alternate strikers
    const p = partnershipView(s);
    expect(p.a.runs + p.b.runs).toBe(20);
    expect(p.runs).toBe(20);
    expect(p.a.pct + p.b.pct).toBe(100);
  });

  it('rates', () => {
    expect(runRate(102, 86, 6)).toBe(7.12);
    expect(strikeRate(42, 29)).toBe(144.8);
    expect(strikeRate(18, 12)).toBe(150);
    expect(strikeRate(0, 0)).toBe(0);
  });

  it('result: win by runs, win by wickets, tie, in progress', () => {
    const first = { ...emptyInnings(setup()), runs: 165, wickets: 6, status: 'completed' as const };
    const win2 = {
      ...emptyInnings(setup({ inningsNo: 2, target: 166 })),
      runs: 166,
      wickets: 4,
      status: 'completed' as const,
    };
    const lose2 = { ...win2, runs: 142, wickets: 9 };
    const tie2 = { ...win2, runs: 165, wickets: 10 };
    const live2 = { ...win2, runs: 100, status: 'in_progress' as const };
    const names = { first: 'St. Jude CC', second: 'Valley Titans' };
    expect(resultText(computeResult(T20, first, lose2), names)).toBe('St. Jude CC won by 23 runs'); // Stitch scorecard
    expect(resultText(computeResult(T20, first, win2), names)).toBe(
      'Valley Titans won by 6 wickets',
    );
    expect(resultText(computeResult(T20, first, tie2), names)).toBe('Match tied');
    expect(computeResult(T20, first, live2)).toBeNull();
    expect(computeResult(T20, { ...first, status: 'in_progress' }, null)).toBeNull();
    expect(resultText({ type: 'WIN', winner: 'FIRST', marginType: 'RUNS', margin: 1 }, names)).toBe(
      'St. Jude CC won by 1 run',
    );
  });
});
