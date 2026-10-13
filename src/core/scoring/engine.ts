import {
  BOWLER_CREDITED,
  maxWickets,
  ScoringError,
  type BallKind,
  type BallView,
  type BatterState,
  type BowlerState,
  type Delivery,
  type EndReason,
  type InningsSetup,
  type InningsState,
  type MatchConfig,
  type ValidateOptions,
} from './types';

// ───────────────────────── helpers ─────────────────────────

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const isLegalBall = (d: Delivery): boolean =>
  d.kind !== 'DEAD' && d.extra?.type !== 'WIDE' && d.extra?.type !== 'NO_BALL';

/** Runs the batters physically ran (decides strike rotation). */
export function completedRuns(d: Delivery): number {
  if (d.kind === 'DEAD') return 0;
  const e = d.extra;
  if (!e) return d.runsOffBat;
  switch (e.type) {
    case 'WIDE':
      return Math.max(0, e.runs - 1);
    case 'NO_BALL':
      return d.runsOffBat + (e.subType ? Math.max(0, e.runs - 1) : 0);
    case 'BYE':
    case 'LEG_BYE':
      return e.runs;
  }
}

export const totalRunsOf = (d: Delivery): number =>
  d.kind === 'DEAD' ? 0 : d.runsOffBat + (d.extra?.runs ?? 0);

export function formatOvers(legalBalls: number, ballsPerOver: number): string {
  return `${Math.floor(legalBalls / ballsPerOver)}.${legalBalls % ballsPerOver}`;
}

/** Label + style class used by the over strip (Stitch bubbles). */
export function ballLabel(d: Delivery): { label: string; kind: BallKind } {
  if (d.wicket && d.kind !== 'DEAD') return { label: 'W', kind: 'wicket' };
  const total = totalRunsOf(d);
  switch (d.extra?.type) {
    case 'WIDE':
      return { label: `Wd+${total}`, kind: 'extra' };
    case 'NO_BALL':
      return { label: `Nb+${total}`, kind: 'extra' };
    case 'BYE':
      return { label: `B${total}`, kind: 'extra' };
    case 'LEG_BYE':
      return { label: `Lb${total}`, kind: 'extra' };
  }
  if (d.runsOffBat === 0) return { label: '•', kind: 'dot' };
  if (d.runsOffBat === 4 && d.isBoundary) return { label: '4', kind: 'four' };
  if (d.runsOffBat === 6) return { label: '6', kind: 'six' };
  return { label: String(d.runsOffBat), kind: 'run' };
}

const newBatter = (playerId: string, order: number): BatterState => ({
  playerId,
  order,
  runs: 0,
  balls: 0,
  fours: 0,
  sixes: 0,
  out: false,
  retiredHurt: false,
  dismissal: null,
});

const newBowler = (playerId: string): BowlerState => ({
  playerId,
  legalBalls: 0,
  runs: 0,
  wickets: 0,
  maidens: 0,
  wides: 0,
  noBalls: 0,
});

function ensureBatter(s: InningsState, id: string): BatterState {
  let b = s.batters[id];
  if (!b) {
    s.battingOrder.push(id);
    b = newBatter(id, s.battingOrder.length);
    s.batters[id] = b;
  }
  return b;
}

function ensureBowler(s: InningsState, id: string): BowlerState {
  let b = s.bowlers[id];
  if (!b) {
    b = newBowler(id);
    s.bowlers[id] = b;
  }
  return b;
}

const freshPartnership = (
  a: string,
  b: string,
  wicketNo: number | null = null,
): InningsState['partnership'] => ({
  batterAId: a,
  batterBId: b,
  runs: 0,
  balls: 0,
  extras: 0,
  contrib: { [a]: 0, [b]: 0 },
  endedBy: null,
  wicketNo,
});

// ───────────────────────── creation ─────────────────────────

export function emptyInnings(setup: InningsSetup): InningsState {
  const s: InningsState = {
    inningsNo: setup.inningsNo,
    battingTeamId: setup.battingTeamId,
    bowlingTeamId: setup.bowlingTeamId,
    target: setup.target,
    status: 'in_progress',
    endReason: null,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    strikerId: setup.openingStrikerId,
    nonStrikerId: setup.openingNonStrikerId,
    bowlerId: setup.openingBowlerId,
    lastOverBowlerId: null,
    freeHit: false,
    batters: {},
    battingOrder: [],
    bowlers: {},
    overLedger: {},
    balls: [],
    fow: [],
    partnership: freshPartnership(setup.openingStrikerId, setup.openingNonStrikerId),
    partnerships: [],
    ignoredDeliveries: 0,
  };
  ensureBatter(s, setup.openingStrikerId);
  ensureBatter(s, setup.openingNonStrikerId);
  if (setup.openingBowlerId) ensureBowler(s, setup.openingBowlerId);
  return s;
}

// ───────────────────────── core reducer (mutating, internal) ─────────────────────────

function endInningsMut(s: InningsState, reason: EndReason): void {
  s.status = 'completed';
  s.endReason = reason;
}

function applyMut(s: InningsState, cfg: MatchConfig, d: Delivery): void {
  if (s.status === 'completed') {
    s.ignoredDeliveries += 1;
    return;
  }
  const bpo = cfg.ballsPerOver;
  const dead = d.kind === 'DEAD';
  const legal = isLegalBall(d);
  const extra = d.extra ?? null;
  const total = totalRunsOf(d);

  const striker = ensureBatter(s, d.strikerId);
  ensureBatter(s, d.nonStrikerId);
  const bowler = dead ? null : ensureBowler(s, d.bowlerId);
  s.strikerId = d.strikerId;
  s.nonStrikerId = d.nonStrikerId;

  const overNo = Math.floor(s.legalBalls / bpo);
  const legalBeforeInOver = s.legalBalls % bpo;

  // ── runs, balls, extras ──
  if (!dead && bowler) {
    s.runs += total;
    striker.runs += d.runsOffBat;
    if (extra?.type !== 'WIDE') striker.balls += 1; // wides are not "faced"
    if (d.runsOffBat === 4 && d.isBoundary) striker.fours += 1;
    if (d.runsOffBat === 6) striker.sixes += 1;

    let charged = d.runsOffBat; // runs charged to the bowler
    if (extra) {
      switch (extra.type) {
        case 'WIDE':
          s.extras.wides += extra.runs;
          bowler.wides += 1;
          charged += extra.runs;
          break;
        case 'NO_BALL':
          s.extras.noBalls += 1;
          bowler.noBalls += 1;
          charged += 1;
          if (extra.subType === 'BYE') s.extras.byes += extra.runs - 1;
          if (extra.subType === 'LEG_BYE') s.extras.legByes += extra.runs - 1;
          break;
        case 'BYE':
          s.extras.byes += extra.runs;
          break;
        case 'LEG_BYE':
          s.extras.legByes += extra.runs;
          break;
      }
    }
    s.extras.total = s.extras.wides + s.extras.noBalls + s.extras.byes + s.extras.legByes;
    bowler.runs += charged;

    const ledger = (s.overLedger[d.bowlerId] ??= { balls: 0, runs: 0 });
    ledger.runs += charged;
    if (legal) {
      ledger.balls += 1;
      s.legalBalls += 1;
      bowler.legalBalls += 1;
      s.partnership.balls += 1;
    }
    s.partnership.runs += total;
    s.partnership.extras += total - d.runsOffBat;
    s.partnership.contrib[d.strikerId] = (s.partnership.contrib[d.strikerId] ?? 0) + d.runsOffBat;

    // free hit: set by a no-ball, cleared by the next legal delivery
    if (legal) s.freeHit = false;
    else if (extra?.type === 'NO_BALL' && cfg.freeHitEnabled) s.freeHit = true;
  }

  // Ball-in-over notation: a legal ball is shown as overNo.ballNumber (0.6 for the last ball of the first over).
  const overBall = `${overNo}.${legalBeforeInOver + (legal && !dead ? 1 : 0)}`;

  // ── wicket / retirement ──
  const w = d.wicket ?? null;
  let teamWicketFell = false;
  let partnershipEnded: 'WICKET' | 'RETIRED' | null = null;
  if (w) {
    const out = ensureBatter(s, w.playerOutId);
    if (w.type === 'RETIRED_HURT') {
      out.retiredHurt = true;
      out.dismissal = { type: w.type, bowlerId: null, fielderId: null };
      partnershipEnded = 'RETIRED';
    } else {
      out.out = true;
      out.retiredHurt = false;
      const credited = BOWLER_CREDITED.includes(w.type);
      out.dismissal = {
        type: w.type,
        bowlerId: credited && !dead ? d.bowlerId : null,
        fielderId: w.fielderId ?? null,
      };
      s.wickets += 1;
      teamWicketFell = true;
      partnershipEnded = 'WICKET';
      if (credited && bowler) bowler.wickets += 1;
      s.fow.push({ wicketNo: s.wickets, runs: s.runs, playerId: w.playerOutId, over: overBall });
    }
  }

  // ── ball view (strip / commentary) ──
  if (!dead) {
    const { label, kind } = ballLabel(d);
    const view: BallView = {
      deliveryId: d.id,
      seq: d.seq,
      overNo,
      overBall,
      label,
      kind,
      runs: total,
      legal,
      bowlerId: d.bowlerId,
      strikerId: d.strikerId,
    };
    s.balls.push(view);
  }

  // ── positions at the crease ──
  let a = d.strikerId;
  let b = d.nonStrikerId;
  if (completedRuns(d) % 2 === 1) [a, b] = [b, a];
  const incomingId = w?.incomingBatterId ?? null;
  if (w && incomingId) {
    const incoming = ensureBatter(s, incomingId);
    incoming.retiredHurt = false; // a retired-hurt batter may return
    if (w.incomingAt) {
      const remaining = a === w.playerOutId ? b : a;
      if (w.incomingAt === 'STRIKER') {
        a = incomingId;
        b = remaining;
      } else {
        a = remaining;
        b = incomingId;
      }
    } else if (a === w.playerOutId) a = incomingId;
    else b = incomingId;
  }

  // ── partnership bookkeeping ──
  if (partnershipEnded) {
    s.partnership.endedBy = partnershipEnded;
    s.partnership.wicketNo = teamWicketFell ? s.wickets : null;
    s.partnerships.push(s.partnership);
    s.partnership = freshPartnership(a, b);
  }

  // ── end of over ──
  if (!dead && legal && s.legalBalls % bpo === 0) {
    for (const [pid, l] of Object.entries(s.overLedger)) {
      if (l.balls === bpo && l.runs === 0) ensureBowler(s, pid).maidens += 1;
    }
    s.overLedger = {};
    s.lastOverBowlerId = d.bowlerId;
    s.bowlerId = null;
    [a, b] = [b, a];
  } else if (!dead) {
    s.bowlerId = d.bowlerId;
  }
  s.strikerId = a;
  s.nonStrikerId = b;

  // ── innings end ──
  if (s.target !== null && s.runs >= s.target) endInningsMut(s, 'TARGET_REACHED');
  else if (s.wickets >= maxWickets(cfg)) endInningsMut(s, 'ALL_OUT');
  else if (s.legalBalls >= cfg.oversPerInnings * bpo) endInningsMut(s, 'OVERS_COMPLETE');
}

// ───────────────────────── public API ─────────────────────────

/** Pure: returns a new state. */
export function applyDelivery(state: InningsState, cfg: MatchConfig, d: Delivery): InningsState {
  const next = clone(state);
  applyMut(next, cfg, d);
  return next;
}

/** Rebuilds the innings from stored events. Voided deliveries are skipped. Ordered by seq. */
export function replay(
  cfg: MatchConfig,
  setup: InningsSetup,
  deliveries: readonly Delivery[],
): InningsState {
  const s = emptyInnings(setup);
  const ordered = deliveries
    .filter((d) => !d.voided && d.inningsNo === setup.inningsNo)
    .sort((x, y) => x.seq - y.seq);
  for (const d of ordered) applyMut(s, cfg, d);
  return s;
}

/** Manual end (declaration / forced end). */
export function endInnings(state: InningsState, reason: 'DECLARED' | 'MANUAL'): InningsState {
  const next = clone(state);
  endInningsMut(next, reason);
  return next;
}

// ───────────────────────── context & validation ─────────────────────────

export interface NextBallContext {
  overNo: number;
  ballInOver: number;
  strikerId: string;
  nonStrikerId: string;
  /** null → the scorer must choose a bowler before the next ball. */
  bowlerId: string | null;
  lastOverBowlerId: string | null;
  isFreeHit: boolean;
  needsNewBowler: boolean;
  inningsComplete: boolean;
}

export function nextBallContext(s: InningsState, cfg: MatchConfig): NextBallContext {
  return {
    overNo: Math.floor(s.legalBalls / cfg.ballsPerOver),
    ballInOver: s.legalBalls % cfg.ballsPerOver,
    strikerId: s.strikerId,
    nonStrikerId: s.nonStrikerId,
    bowlerId: s.bowlerId,
    lastOverBowlerId: s.lastOverBowlerId,
    isFreeHit: s.freeHit,
    needsNewBowler: s.status === 'in_progress' && s.bowlerId === null,
    inningsComplete: s.status === 'completed',
  };
}

/** May this bowler start a new over? (not the previous over's bowler; within the over quota) */
export function canStartOver(
  s: InningsState,
  cfg: MatchConfig,
  bowlerId: string,
): { ok: boolean; reason?: 'BOWLER_CONSECUTIVE' | 'BOWLER_QUOTA' } {
  if (bowlerId === s.lastOverBowlerId) return { ok: false, reason: 'BOWLER_CONSECUTIVE' };
  const quota = cfg.maxOversPerBowler * cfg.ballsPerOver;
  if (cfg.maxOversPerBowler > 0 && (s.bowlers[bowlerId]?.legalBalls ?? 0) >= quota)
    return { ok: false, reason: 'BOWLER_QUOTA' };
  return { ok: true };
}

/** Batters who can still come in (not out; not at the crease). Retired-hurt batters are included (they may return). */
export function availableBatters(s: InningsState, setup: InningsSetup): string[] {
  return setup.battingXI.filter((id) => {
    if (id === s.strikerId || id === s.nonStrikerId) return false;
    const b = s.batters[id];
    return !b || !b.out;
  });
}

const BALL_WICKETS_NO_BALL_OR_FREE_HIT = new Set(['RUN_OUT', 'OBSTRUCTING', 'HIT_TWICE']);
const BALL_WICKETS_WIDE = new Set(['STUMPED', 'RUN_OUT', 'HIT_WICKET', 'OBSTRUCTING']);
const NON_STRIKER_CAN_BE_OUT = new Set(['RUN_OUT', 'OBSTRUCTING']);

/** Returns every problem with a delivery about to be recorded (empty = OK). */
export function validateDelivery(
  s: InningsState,
  cfg: MatchConfig,
  setup: InningsSetup,
  d: Delivery,
  opts: ValidateOptions = {},
): ScoringError[] {
  const errs: ScoringError[] = [];
  const add = (code: ScoringError['code'], msg: string) => errs.push(new ScoringError(code, msg));

  if (s.status === 'completed') {
    add('INNINGS_COMPLETE', 'The innings is already complete.');
    return errs;
  }

  const dead = d.kind === 'DEAD';
  const extra = d.extra ?? null;
  const w = d.wicket ?? null;

  // runs / extras shape
  if (!Number.isInteger(d.runsOffBat) || d.runsOffBat < 0 || d.runsOffBat > 7)
    add('INVALID_RUNS', 'Runs off the bat must be 0–7.');
  if (d.isBoundary && d.runsOffBat !== 4 && d.runsOffBat !== 6)
    add('INVALID_BOUNDARY', 'Only 4 or 6 can be a boundary.');
  if (extra) {
    if (!Number.isInteger(extra.runs) || extra.runs < 1 || extra.runs > 12)
      add('INVALID_EXTRA', 'Extra runs must be 1–12.');
    if (
      (extra.type === 'WIDE' || extra.type === 'BYE' || extra.type === 'LEG_BYE') &&
      d.runsOffBat !== 0
    )
      add('INVALID_EXTRA', 'Runs off the bat are not allowed with a wide, bye or leg bye.');
    if (extra.subType && extra.type !== 'NO_BALL')
      add('INVALID_EXTRA', 'Only a no-ball can have a bye/leg-bye part.');
    if (extra.type === 'NO_BALL' && !extra.subType && extra.runs !== 1)
      add('INVALID_EXTRA', 'A no-ball without byes carries exactly 1 penalty run.');
  }

  // batters
  const crease = new Set([s.strikerId, s.nonStrikerId]);
  if (d.strikerId === d.nonStrikerId || !crease.has(d.strikerId) || !crease.has(d.nonStrikerId))
    add('BATTER_NOT_AT_CREASE', 'Striker and non-striker must be the two batters at the crease.');
  for (const id of [d.strikerId, d.nonStrikerId])
    if (!setup.battingXI.includes(id)) add('PLAYER_NOT_IN_XI', 'Batter is not in the batting XI.');

  // bowler
  if (!dead) {
    if (!setup.bowlingXI.includes(d.bowlerId))
      add('PLAYER_NOT_IN_XI', 'Bowler is not in the bowling XI.');
    if (s.bowlerId === null) {
      if (!opts.ignoreBowlerRules) {
        const c = canStartOver(s, cfg, d.bowlerId);
        if (!c.ok && c.reason === 'BOWLER_CONSECUTIVE')
          add('BOWLER_CONSECUTIVE', 'The same bowler cannot bowl two overs in a row.');
        if (!c.ok && c.reason === 'BOWLER_QUOTA')
          add('BOWLER_QUOTA', 'This bowler has used all of their overs.');
      }
    } else if (d.bowlerId !== s.bowlerId && !opts.allowBowlerChange) {
      add('BOWLER_MISMATCH', 'The over is in progress with a different bowler.');
    }
  }

  // dead-ball events (retirements)
  if (dead) {
    if (extra || d.runsOffBat !== 0) add('INVALID_DEAD_BALL', 'A dead-ball event carries no runs.');
    if (!w || (w.type !== 'RETIRED_HURT' && w.type !== 'RETIRED_OUT'))
      add('INVALID_DEAD_BALL', 'Only retirements can be recorded as dead-ball events.');
  } else if (w && (w.type === 'RETIRED_HURT' || w.type === 'RETIRED_OUT')) {
    add('INVALID_WICKET', 'Retirements are recorded as dead-ball events, not on a delivery.');
  }

  // wicket rules
  if (w) {
    if (!crease.has(w.playerOutId))
      add('INVALID_WICKET', 'The dismissed batter must be at the crease.');
    else if (
      !dead &&
      w.playerOutId === s.nonStrikerId &&
      w.playerOutId !== d.strikerId &&
      !NON_STRIKER_CAN_BE_OUT.has(w.type)
    )
      add('INVALID_WICKET', 'Only a run out or obstruction can dismiss the non-striker.');
    if (!dead) {
      if (extra?.type === 'NO_BALL' && !BALL_WICKETS_NO_BALL_OR_FREE_HIT.has(w.type))
        add('WICKET_NOT_ALLOWED', 'Only run out, obstruction or hit-twice on a no-ball.');
      if (extra?.type === 'WIDE' && !BALL_WICKETS_WIDE.has(w.type))
        add('WICKET_NOT_ALLOWED', 'Only stumped, run out, hit wicket or obstruction on a wide.');
      if (s.freeHit && !BALL_WICKETS_NO_BALL_OR_FREE_HIT.has(w.type))
        add('WICKET_NOT_ALLOWED', 'Only run out, obstruction or hit-twice on a free hit.');
    }
    const endsInnings = w.type !== 'RETIRED_HURT' && s.wickets + 1 >= maxWickets(cfg);
    const targetReached = s.target !== null && !dead && s.runs + totalRunsOf(d) >= s.target;
    if (!w.incomingBatterId) {
      if (!endsInnings && !targetReached) add('INCOMING_REQUIRED', 'Choose the incoming batter.');
    } else {
      const inc = w.incomingBatterId;
      const b = s.batters[inc];
      if (!setup.battingXI.includes(inc) || crease.has(inc) || (b && b.out))
        add('INCOMING_INVALID', 'That batter cannot come in.');
    }
  }
  return errs;
}

export function assertValidDelivery(
  s: InningsState,
  cfg: MatchConfig,
  setup: InningsSetup,
  d: Delivery,
  opts: ValidateOptions = {},
): void {
  const [first] = validateDelivery(s, cfg, setup, d, opts);
  if (first) throw first;
}

/**
 * Re-validates a whole innings in order (used before saving an EDIT of an earlier ball).
 * Bowler rules are relaxed (they are scorer-confirmed warnings), everything structural is checked.
 */
export function auditInnings(
  cfg: MatchConfig,
  setup: InningsSetup,
  deliveries: readonly Delivery[],
): { seq: number; errors: ScoringError[] }[] {
  const s = emptyInnings(setup);
  const problems: { seq: number; errors: ScoringError[] }[] = [];
  const ordered = deliveries
    .filter((d) => !d.voided && d.inningsNo === setup.inningsNo)
    .sort((x, y) => x.seq - y.seq);
  for (const d of ordered) {
    const errors = validateDelivery(s, cfg, setup, d, {
      allowBowlerChange: true,
      ignoreBowlerRules: true,
    });
    if (errors.length > 0) problems.push({ seq: d.seq, errors });
    applyMut(s, cfg, d);
  }
  return problems;
}
