import { describe, expect, it } from '@jest/globals';
import { replay } from '../engine';
import { bowlerFigures } from '../selectors';
import { runsBall, wideBall, noBallBall, byeBall, wicketBall } from '../builders';
import { setup } from '../testkit';
import type { Delivery, MatchConfig } from '../types';

describe('P2-M1 Paper-scorebook 2-over check', () => {
  it('matches expected paper scorebook totals for a 2-over innings', () => {
    const config: MatchConfig = {
      oversPerInnings: 2,
      ballsPerOver: 6,
      maxOversPerBowler: 1,
      freeHitEnabled: true,
      playersPerSide: 11,
    };
    const inningsSetup = setup({
      openingStrikerId: 'b1',
      openingNonStrikerId: 'b2',
      openingBowlerId: 'w1',
    });

    let seq = 1;
    const mk = (i: ReturnType<typeof runsBall>): Delivery => ({
      id: `d${seq}`,
      inningsNo: 1,
      seq: seq++,
      ...i,
    });

    const deliveries: Delivery[] = [
      // 1.1 Wide (1 wd)
      mk(wideBall({ strikerId: 'b1', nonStrikerId: 'b2', bowlerId: 'w1' })),

      // 1.1 No-ball + 1 bat run (striker b1 scores 1, strike rotates -> b2 on strike)
      mk(noBallBall({ strikerId: 'b1', nonStrikerId: 'b2', bowlerId: 'w1' }, { batRuns: 1 })),

      // 1.1 Free-hit ball: 2 byes (legal ball 1). Striker b2 faces, runs 2 (even -> stays b2)
      mk(byeBall({ strikerId: 'b2', nonStrikerId: 'b1', bowlerId: 'w1' }, 2)),

      // 1.2 Dot (legal ball 2). Striker b2
      mk(runsBall({ strikerId: 'b2', nonStrikerId: 'b1', bowlerId: 'w1' }, 0)),

      // 1.3 Bowled wicket (legal ball 3). Striker b2 bowled, b3 incoming at striker end
      mk(
        wicketBall(
          { strikerId: 'b2', nonStrikerId: 'b1', bowlerId: 'w1' },
          { type: 'BOWLED', playerOutId: 'b2', incomingBatterId: 'b3' },
        ),
      ),

      // 1.4 Single by B3 (legal ball 4). Strike rotates -> b1 on strike
      mk(runsBall({ strikerId: 'b3', nonStrikerId: 'b1', bowlerId: 'w1' }, 1)),

      // 1.5 Run-out of B1 with 0 completed runs (legal ball 5). Incoming b4 at striker end
      mk(
        wicketBall(
          { strikerId: 'b1', nonStrikerId: 'b3', bowlerId: 'w1' },
          {
            type: 'RUN_OUT',
            playerOutId: 'b1',
            incomingBatterId: 'b4',
            fielderId: 'w2',
            runsOffBat: 0,
          },
        ),
      ),

      // 1.6 2 runs by B4 (legal ball 6 - end of over 1). Even runs -> b4 stays striker, then over ends -> rotates to b3
      mk(runsBall({ strikerId: 'b4', nonStrikerId: 'b3', bowlerId: 'w1' }, 2)),

      // Over 2: Bowler w2. End-of-over strike rotation put B3 on strike.
      // 2.1 1 run by B3 -> rotates to b4
      mk(runsBall({ strikerId: 'b3', nonStrikerId: 'b4', bowlerId: 'w2' }, 1)),

      // 2.2 4 runs (four) by B4 -> even, b4 on strike
      mk(runsBall({ strikerId: 'b4', nonStrikerId: 'b3', bowlerId: 'w2' }, 4)),

      // 2.3 Dot by B4
      mk(runsBall({ strikerId: 'b4', nonStrikerId: 'b3', bowlerId: 'w2' }, 0)),

      // 2.4 6 runs (six) by B4
      mk(runsBall({ strikerId: 'b4', nonStrikerId: 'b3', bowlerId: 'w2' }, 6)),

      // 2.5 1 run by B4 -> rotates to b3
      mk(runsBall({ strikerId: 'b4', nonStrikerId: 'b3', bowlerId: 'w2' }, 1)),

      // 2.6 1 run by B3 (end of over 2 & innings)
      mk(runsBall({ strikerId: 'b3', nonStrikerId: 'b4', bowlerId: 'w2' }, 1)),
    ];

    const state = replay(config, inningsSetup, deliveries);

    // Innings score: 21 runs for 2 wickets in 2.0 overs (12 legal balls)
    expect(state.runs).toBe(21);
    expect(state.wickets).toBe(2);
    expect(state.legalBalls).toBe(12);
    expect(state.status).toBe('completed');
    expect(state.endReason).toBe('OVERS_COMPLETE');

    // Extras: 1 wide, 1 no-ball, 2 byes, 0 leg-byes = 4
    expect(state.extras.wides).toBe(1);
    expect(state.extras.noBalls).toBe(1);
    expect(state.extras.byes).toBe(2);
    expect(state.extras.legByes).toBe(0);
    expect(state.extras.total).toBe(4);

    // Individual batters
    const b1 = state.batters['b1'];
    expect(b1).toEqual(expect.objectContaining({ runs: 1, balls: 2, out: true }));

    const b2 = state.batters['b2'];
    expect(b2).toEqual(expect.objectContaining({ runs: 0, balls: 3, out: true }));

    const b3 = state.batters['b3'];
    expect(b3).toEqual(expect.objectContaining({ runs: 3, balls: 3, out: false }));

    const b4 = state.batters['b4'];
    expect(b4).toEqual(
      expect.objectContaining({ runs: 13, balls: 5, fours: 1, sixes: 1, out: false }),
    );

    // Bowler figures
    const w1 = state.bowlers['w1']!;
    expect(bowlerFigures(w1, 6)).toBe('1.0-0-6-1');

    const w2 = state.bowlers['w2']!;
    expect(bowlerFigures(w2, 6)).toBe('1.0-0-13-0');
  });
});
