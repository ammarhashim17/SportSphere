import { applyDelivery, auditInnings, emptyInnings, validateDelivery } from '../engine';
import {
  byeBall,
  legByeBall,
  noBallBall,
  retireEvent,
  runsBall,
  wicketBall,
  wideBall,
} from '../builders';
import { setup, T20 } from '../testkit';
import type { Delivery } from '../types';

const w = { strikerId: 'b1', nonStrikerId: 'b2', bowlerId: 'w1' };
const mk = (i: ReturnType<typeof runsBall>, seq = 1): Delivery => ({
  id: `x${seq}`,
  inningsNo: 1,
  seq,
  ...i,
});
const ok = (i: ReturnType<typeof runsBall>) =>
  expect(validateDelivery(emptyInnings(setup()), T20, setup(), mk(i))).toEqual([]);

describe('builders produce deliveries the engine accepts', () => {
  it('runs 0..6', () => {
    for (let r = 0; r <= 6; r++) ok(runsBall(w, r));
  });
  it('wide totals', () => {
    ok(wideBall(w));
    ok(wideBall(w, 3));
  });
  it('no-ball variants', () => {
    ok(noBallBall(w));
    ok(noBallBall(w, { batRuns: 6, boundary: true }));
    ok(noBallBall(w, { nonBat: { type: 'BYE', runs: 2 } }));
  });
  it('byes', () => {
    ok(byeBall(w, 1));
    ok(legByeBall(w, 4));
  });
  it('wickets incl. on wide / no-ball', () => {
    ok(wicketBall(w, { type: 'BOWLED', playerOutId: 'b1', incomingBatterId: 'b3' }));
    ok(
      wicketBall(w, {
        type: 'STUMPED',
        playerOutId: 'b1',
        incomingBatterId: 'b3',
        onExtra: 'WIDE',
      }),
    );
    ok(
      wicketBall(w, {
        type: 'RUN_OUT',
        playerOutId: 'b2',
        incomingBatterId: 'b3',
        onExtra: 'NO_BALL',
        runsOffBat: 1,
      }),
    );
  });
  it('retire', () => {
    ok(retireEvent(w, { type: 'RETIRED_HURT', playerOutId: 'b1', incomingBatterId: 'b3' }));
  });

  it('a no-ball with bat 4 scores 5, bye part charged correctly', () => {
    const s = applyDelivery(
      emptyInnings(setup()),
      T20,
      mk(noBallBall(w, { batRuns: 4, boundary: true })),
    );
    expect(s.runs).toBe(5);
    expect(s.balls[0]?.label).toBe('Nb+5');
  });
});

describe('auditInnings', () => {
  it('passes a clean innings and flags a broken edit', () => {
    const a = mk(runsBall(w, 1), 1);
    const b = mk(runsBall({ strikerId: 'b2', nonStrikerId: 'b1', bowlerId: 'w1' }, 2), 2);
    expect(auditInnings(T20, setup(), [a, b])).toEqual([]);
    // editing ball 1 to a wicket makes ball 2's striker invalid
    const edited = {
      ...a,
      ...wicketBall(w, { type: 'BOWLED', playerOutId: 'b1', incomingBatterId: 'b3' }),
    };
    const problems = auditInnings(T20, setup(), [edited, b]);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.seq).toBe(2);
  });
});
