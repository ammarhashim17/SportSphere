import { describe, expect, it } from '@jest/globals';
import { replay } from '../engine';
import { runsBall } from '../builders';
import { setup } from '../testkit';
import type { Delivery, MatchConfig } from '../types';

describe('P2-M8 Performance Benchmark', () => {
  it('replays a full 50-over innings (300 balls) in under 50 ms', () => {
    const config: MatchConfig = {
      oversPerInnings: 50,
      ballsPerOver: 6,
      maxOversPerBowler: 10,
      freeHitEnabled: true,
      playersPerSide: 11,
    };
    const inningsSetup = setup({
      openingStrikerId: 'b1',
      openingNonStrikerId: 'b2',
      openingBowlerId: 'w1',
    });

    const deliveries: Delivery[] = [];
    let currentStriker = 'b1';
    let currentNonStriker = 'b2';
    const bowlers = ['w1', 'w2', 'w3', 'w4', 'w5'];

    for (let over = 0; over < 50; over++) {
      const bowlerId = bowlers[over % bowlers.length]!;
      for (let ball = 0; ball < 6; ball++) {
        const seq = over * 6 + ball + 1;
        // Alternate between 0, 1, 2, 4 runs
        const runs = seq % 4 === 0 ? 4 : seq % 2 === 0 ? 2 : 1;
        const b = runsBall(
          { strikerId: currentStriker, nonStrikerId: currentNonStriker, bowlerId },
          runs,
        );
        deliveries.push({
          id: `del_${seq}`,
          inningsNo: 1,
          seq,
          ...b,
        });

        // Rotate strike on odd runs
        if (runs % 2 === 1) {
          const tmp = currentStriker;
          currentStriker = currentNonStriker;
          currentNonStriker = tmp;
        }
      }
      // Rotate strike at end of over
      const tmp = currentStriker;
      currentStriker = currentNonStriker;
      currentNonStriker = tmp;
    }

    expect(deliveries.length).toBe(300);

    // Warm-up run
    replay(config, inningsSetup, deliveries);

    // Timed run
    const start = performance.now();
    const state = replay(config, inningsSetup, deliveries);
    const duration = performance.now() - start;

    expect(state.legalBalls).toBe(300);
    expect(state.status).toBe('completed');
    expect(state.endReason).toBe('OVERS_COMPLETE');

    // NFR: target < 50 ms for a 50-over innings replay
    expect(duration).toBeLessThan(50);
  });
});
