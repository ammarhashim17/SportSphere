import { useCallback, useEffect, useRef, useState } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ScrollView, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { BattersCard, BowlerRow } from '@/components/scoring/BattersCard';
import { Keypad, type KeypadAction } from '@/components/scoring/Keypad';
import { LiveHeader } from '@/components/scoring/LiveHeader';
import { OverStrip } from '@/components/scoring/OverStrip';
import { ScoreHero } from '@/components/scoring/ScoreHero';
import {
  dismissSheet,
  PlayerPickSheet,
  presentSheet,
  RunsSheet,
  WicketSheet,
  type WicketResult,
} from '@/components/scoring/sheets';
import { Toast } from '@/components/scoring/Toast';
import { Text } from '@/components/ui';
import {
  availableBatters,
  byeBall,
  canStartOver,
  currentOverView,
  legByeBall,
  noBallBall,
  retireEvent,
  runsBall,
  validateDelivery,
  wicketBall,
  wideBall,
  type BallInput,
  type Delivery,
} from '@/core/scoring';
import { useAuthStore } from '@/features/auth/authStore';
import {
  recordDelivery,
  ScoringRejected,
  undoLastDelivery,
} from '@/features/scoring/deliveryRepository';
import { useLiveScoring, type LiveScoring } from '@/features/scoring/useLiveScoring';
import { useSyncStore } from '@/sync/syncStore';

export default function LiveScoringScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const live = useLiveScoring(id);
  if (!live.ready) return <View className="flex-1 bg-surface" />;
  // no innings yet, or the innings has ended → the match hub shows setup / innings break / result
  if (!live.current || !live.state || live.state.status === 'completed')
    return <Redirect href={`/match/${id}` as never} />;
  return <ScoringBody live={live} matchId={id} />;
}

type RunsAsk = {
  kind: 'wide' | 'noball' | 'bye' | 'legbye';
  title: string;
  min: number;
  max: number;
};

function ScoringBody({ live, matchId }: { live: LiveScoring; matchId: string }) {
  void matchId;
  const state = live.state!;
  const innings = live.current!;
  const setup = live.setup!;
  const { cfg, ctx } = live;
  const userId = useAuthStore((s) => s.session?.user.id ?? '');
  const syncStatus = useSyncStore((s) => s.status);

  const [swapped, setSwapped] = useState(false);
  const [pendingBowler, setPendingBowler] = useState<string | null>(null);
  const [injuryChange, setInjuryChange] = useState(false);
  const [ask, setAsk] = useState<RunsAsk>({ kind: 'bye', title: 'Byes', min: 1, max: 4 });
  const [toast, setToast] = useState({ msg: '', n: 0 });
  const runsRef = useRef<BottomSheetModal>(null);
  const wicketRef = useRef<BottomSheetModal>(null);
  const bowlerRef = useRef<BottomSheetModal>(null);
  const say = useCallback((msg: string) => setToast((t) => ({ msg, n: t.n + 1 })), []);

  const needsBowler = !!ctx?.needsNewBowler && !pendingBowler;
  const bowlerMode: 'over' | 'injury' = needsBowler || !injuryChange ? 'over' : 'injury';
  useEffect(() => {
    if (needsBowler) presentSheet(bowlerRef);
  }, [needsBowler]);

  const striker = swapped ? state.nonStrikerId : state.strikerId;
  const non = swapped ? state.strikerId : state.nonStrikerId;
  const bowlerId = pendingBowler ?? state.bowlerId; // the bowler just chosen (new over / injury change), else the current one
  const names = (pid: string) => live.playerName(pid);
  const who = (b?: string) => ({
    strikerId: striker,
    nonStrikerId: non,
    bowlerId: (b ?? bowlerId)!,
  });

  const submit = async (input: BallInput) => {
    // a bowler chosen mid-over (injury) differs from the one in progress → the engine needs the explicit flag
    const override = !!state.bowlerId && !!pendingBowler && pendingBowler !== state.bowlerId;
    try {
      await recordDelivery(innings.id, input, userId, override ? { allowBowlerChange: true } : {});
      setSwapped(false);
      setPendingBowler(null);
    } catch (e) {
      say(e instanceof ScoringRejected ? e.message : 'Could not record the ball');
    }
  };

  const onAction = (a: KeypadAction) => {
    if (a.type === 'undo') {
      setSwapped(false);
      setPendingBowler(null);
      void undoLastDelivery(innings.id, userId).catch((e) =>
        say(e instanceof ScoringRejected ? e.message : 'Nothing to undo'),
      );
      return;
    }
    if (a.type === 'swap') {
      setSwapped((s) => !s);
      say('Strike Rotated');
      return;
    }
    if (a.type === 'endover') {
      setInjuryChange(!ctx?.needsNewBowler);
      presentSheet(bowlerRef);
      say('Bowler change prompt opened');
      return;
    }
    if (!bowlerId) {
      presentSheet(bowlerRef);
      return;
    }
    switch (a.type) {
      case 'runs':
        return void submit(runsBall(who(), a.runs));
      case 'wide':
        if (a.long) {
          setAsk({ kind: 'wide', title: 'Wide — total runs', min: 1, max: 5 });
          return presentSheet(runsRef);
        }
        return void submit(wideBall(who(), 1));
      case 'noball':
        if (a.long) {
          setAsk({ kind: 'noball', title: 'No-ball — runs off the bat', min: 0, max: 6 });
          return presentSheet(runsRef);
        }
        return void submit(noBallBall(who()));
      case 'bye':
        setAsk({ kind: 'bye', title: 'Byes', min: 1, max: 4 });
        return presentSheet(runsRef);
      case 'legbye':
        setAsk({ kind: 'legbye', title: 'Leg byes', min: 1, max: 4 });
        return presentSheet(runsRef);
      case 'wicket':
        return presentSheet(wicketRef);
    }
  };

  const confirmRuns = (n: number) => {
    dismissSheet(runsRef);
    if (ask.kind === 'wide') void submit(wideBall(who(), n));
    else if (ask.kind === 'noball')
      void submit(noBallBall(who(), { batRuns: n, boundary: n === 4 || n === 6 }));
    else if (ask.kind === 'bye') void submit(byeBall(who(), n));
    else void submit(legByeBall(who(), n));
  };

  const confirmWicket = (r: WicketResult) => {
    dismissSheet(wicketRef);
    if (r.retire) {
      void submit(
        retireEvent(who(), {
          type: r.type as 'RETIRED_HURT' | 'RETIRED_OUT',
          playerOutId: r.playerOutId,
          incomingBatterId: r.incomingBatterId,
        }),
      );
    } else {
      void submit(wicketBall(who(), r));
    }
  };

  const confirmBowler = (pid: string) => {
    dismissSheet(bowlerRef);
    if (bowlerMode === 'injury') {
      // the new bowler takes over for the rest of the over; recorded together with the next ball
      setPendingBowler(pid);
      say('Bowler changed — applies from the next ball');
      return;
    }
    const probe: Delivery = {
      id: 'probe',
      inningsNo: innings.inningsNo as 1 | 2,
      seq: 0,
      ...runsBall(who(pid), 0),
    };
    const problem = validateDelivery(state, cfg, setup, probe)[0];
    if (problem) {
      say(problem.message);
      presentSheet(bowlerRef);
      return;
    }
    setPendingBowler(pid);
  };

  const over = currentOverView(state, cfg);
  const bowlerState = bowlerId ? (state.bowlers[bowlerId] ?? null) : null;
  const bowlerItems = setup.bowlingXI.map((pid) => {
    const c = canStartOver(state, cfg, pid);
    const balls = state.bowlers[pid]?.legalBalls ?? 0;
    return {
      id: pid,
      name: names(pid),
      hint: !c.ok
        ? c.reason === 'BOWLER_CONSECUTIVE'
          ? 'Just bowled'
          : 'Quota used'
        : balls
          ? `${Math.floor(balls / cfg.ballsPerOver)}.${balls % cfg.ballsPerOver} ov`
          : '',
      disabled: bowlerMode === 'over' ? !c.ok : pid === state.bowlerId,
    };
  });

  return (
    <View className="flex-1 bg-surface">
      <LiveHeader />
      <ScrollView contentContainerClassName="pb-6" showsVerticalScrollIndicator={false}>
        <ScoreHero
          title={`${live.teamName(innings.battingTeamId)} vs ${live.teamName(innings.bowlingTeamId)}`}
          syncLabel={
            syncStatus === 'offline' ? 'Offline • saved on device' : 'Local • Offline Ready'
          }
          state={state}
          cfg={cfg}
          chase={live.chase}
        />
        <View className="gap-space-md px-margin pt-3">
          <BattersCard state={state} strikerId={striker} nonStrikerId={non} names={names}>
            <BowlerRow
              bowler={bowlerState}
              name={bowlerId ? names(bowlerId) : ''}
              ballsPerOver={cfg.ballsPerOver}
              style={bowlerId ? (live.player(bowlerId)?.bowlingStyle ?? null) : null}
            />
          </BattersCard>
          <OverStrip overNumber={over.overNumber} runs={over.runs} balls={over.balls} />
          {ctx?.isFreeHit ? (
            <Text
              variant="caption"
              weight="bold"
              tone="primary"
              uppercase
              className="text-center tracking-widest"
            >
              Free hit
            </Text>
          ) : null}
          <Keypad onAction={onAction} />
        </View>
      </ScrollView>
      <Toast message={toast.msg} trigger={toast.n} />

      <RunsSheet
        key={ask.kind}
        ref={runsRef}
        title={ask.title}
        min={ask.min}
        max={ask.max}
        onConfirm={confirmRuns}
      />
      <WicketSheet
        ref={wicketRef}
        strikerId={striker}
        nonStrikerId={non}
        names={names}
        fielders={setup.bowlingXI.map((pid) => ({ id: pid, name: names(pid) }))}
        incoming={availableBatters(state, setup).map((pid) => ({ id: pid, name: names(pid) }))}
        keeperId={
          live.xi.find((x) => x.active && x.isKeeper && x.teamId === innings.bowlingTeamId)
            ?.playerId ?? null
        }
        freeHit={!!ctx?.isFreeHit}
        lastWicket={state.wickets + 1 >= cfg.playersPerSide - 1}
        onConfirm={confirmWicket}
      />
      <PlayerPickSheet
        ref={bowlerRef}
        title={
          bowlerMode === 'over'
            ? `Over ${(ctx?.overNo ?? 0) + 1} — choose the bowler`
            : 'Change bowler (injury)'
        }
        items={bowlerItems}
        onPick={confirmBowler}
        footer={
          cfg.maxOversPerBowler > 0
            ? `Maximum ${cfg.maxOversPerBowler} overs per bowler.`
            : undefined
        }
      />
    </View>
  );
}
