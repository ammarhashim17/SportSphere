// TEMP-UI: replace with Stitch design (LOCK-03) — the Create Match wizard is not in the Stitch export yet.
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { and, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Chip } from '@/components/scoring/sheets';
import { Button, SegmentedTabs, TempScreen, Text, TextField } from '@/components/ui';
import { shortName } from '@/core/identity';
import {
  battingFirstTeamId,
  defaultMaxOversPerBowler,
  FORMAT_DEFAULT_OVERS,
  matchBasicsSchema,
  validateXi,
  xiOverlap,
  type MatchFormat,
  type TossDecision,
} from '@/core/matchSetup';
import { db } from '@/db/client';
import { matches, playingXi, players, teamPlayers, teams } from '@/db/schema';
import { useAuthStore } from '@/features/auth/authStore';
import {
  createMatch,
  saveXi,
  setToss,
  startFirstInnings,
  MatchSetupError,
} from '@/features/matches/matchRepository';

const FORMAT_OPTIONS = [
  { value: 'T20', label: 'T20' },
  { value: 'ODI', label: 'ODI' },
  { value: 'CUSTOM', label: 'Custom' },
] as const;

const pad = (n: number) => String(n).padStart(2, '0');
const nowLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const toIso = (local: string) => {
  const d = new Date(local.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
};

type Resume = { match: typeof matches.$inferSelect; xi: (typeof playingXi.$inferSelect)[] } | null;

export default function NewMatch() {
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();
  const { data: found } = useLiveQuery(
    db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId ?? '-')),
    [matchId],
  );
  const { data: xiRows } = useLiveQuery(
    db
      .select()
      .from(playingXi)
      .where(eq(playingXi.matchId, matchId ?? '-')),
    [matchId],
  );
  if (matchId && !found[0])
    return (
      <TempScreen title="New match" back>
        <Text>Loading…</Text>
      </TempScreen>
    );
  // an upcoming match is resumed: the form starts from what was already saved (no state is set in an effect)
  return (
    <WizardForm key={matchId ?? 'new'} resume={found[0] ? { match: found[0], xi: xiRows } : null} />
  );
}

function WizardForm({ resume }: { resume: Resume }) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id ?? '');
  const m0 = resume?.match ?? null;
  const side = (teamId: string | undefined) =>
    resume && teamId
      ? resume.xi
          .filter((x) => x.active && x.teamId === teamId)
          .sort((a, b) => a.battingOrder - b.battingOrder)
          .map((x) => x.playerId)
      : [];
  const xiFull =
    !!m0 &&
    side(m0.teamAId).length === m0.playersPerSide &&
    side(m0.teamBId).length === m0.playersPerSide;

  const [step, setStep] = useState(!m0 ? 1 : !xiFull ? 2 : m0.tossWinnerId ? 4 : 3);
  const [matchId, setMatchId] = useState<string | null>(m0?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // step 1
  const { data: teamRows } = useLiveQuery(db.select().from(teams));
  const [teamA, setTeamA] = useState(m0?.teamAId ?? '');
  const [teamB, setTeamB] = useState(m0?.teamBId ?? '');
  const [format, setFormat] = useState<MatchFormat>(m0?.format ?? 'T20');
  const [overs, setOvers] = useState(String(m0?.oversPerInnings ?? 20));
  const [when, setWhen] = useState(nowLocal());
  const [venue, setVenue] = useState(m0?.venue ?? '');
  const [stage, setStage] = useState(m0?.stage ?? '');
  // step 2
  const [xiA, setXiA] = useState<string[]>(side(m0?.teamAId));
  const [xiB, setXiB] = useState<string[]>(side(m0?.teamBId));
  // step 3
  const [tossWinner, setTossWinner] = useState(m0?.tossWinnerId ?? '');
  const [decision, setDecision] = useState<TossDecision>(m0?.tossDecision ?? 'bat');
  // step 4
  const [strikerId, setStriker] = useState('');
  const [nonStrikerId, setNonStriker] = useState('');
  const [bowlerId, setBowler] = useState('');

  const { data: playerRows } = useLiveQuery(db.select().from(players));
  const { data: squadA } = useLiveQuery(
    db
      .select()
      .from(teamPlayers)
      .where(and(eq(teamPlayers.teamId, teamA || '-'), eq(teamPlayers.active, true))),
    [teamA],
  );
  const { data: squadB } = useLiveQuery(
    db
      .select()
      .from(teamPlayers)
      .where(and(eq(teamPlayers.teamId, teamB || '-'), eq(teamPlayers.active, true))),
    [teamB],
  );
  const nameOf = (id: string) => playerRows.find((p) => p.id === id)?.name ?? 'Player';
  const teamName = (id: string) => teamRows.find((t) => t.id === id)?.name ?? 'Team';

  const oversNum = Number(overs);
  const basics = useMemo(
    () => ({
      teamAId: teamA,
      teamBId: teamB,
      format,
      oversPerInnings: oversNum,
      maxOversPerBowler: defaultMaxOversPerBowler(format, oversNum),
      freeHitEnabled: true,
      scheduledAt: toIso(when),
      venue: venue || null,
      stage: stage || null,
      tournamentName: null,
    }),
    [teamA, teamB, format, oversNum, when, venue, stage],
  );

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof MatchSetupError || e instanceof Error ? e.message : 'Something went wrong',
      );
    } finally {
      setBusy(false);
    }
  };

  const next1 = () =>
    run(async () => {
      const parsed = matchBasicsSchema.safeParse(basics);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Check the details');
      if (matchId) {
        setStep(2);
        return;
      }
      setMatchId(await createMatch(parsed.data, userId));
      setStep(2);
    });
  const next2 = () =>
    run(async () => {
      const a = xiA.map((playerId) => ({ playerId }));
      const b = xiB.map((playerId) => ({ playerId }));
      const problem = validateXi(a) ?? validateXi(b);
      if (problem) throw new Error(problem);
      if (xiOverlap(a, b).length) throw new Error('A player is in both XIs.');
      await saveXi(matchId!, teamA, a);
      await saveXi(matchId!, teamB, b);
      setStep(3);
    });
  const next3 = () =>
    run(async () => {
      if (!tossWinner) throw new Error('Choose the toss winner.');
      await setToss(matchId!, tossWinner, decision);
      setStep(4);
    });
  const start = () =>
    run(async () => {
      await startFirstInnings(matchId!, { strikerId, nonStrikerId, bowlerId }, userId);
      router.replace(`/match/${matchId}/score` as never);
    });

  const batFirst = tossWinner ? battingFirstTeamId(teamA, teamB, tossWinner, decision) : teamA;
  const batXi = batFirst === teamA ? xiA : xiB;
  const bowlXi = batFirst === teamA ? xiB : xiA;

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : list.length < 11 ? [...list, id] : list);

  return (
    <TempScreen title={`New match — step ${step} of 4`} back>
      <View className="flex-row gap-1">
        {[1, 2, 3, 4].map((n) => (
          <View
            key={n}
            className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-primary' : 'bg-surface-container-highest'}`}
          />
        ))}
      </View>

      {step === 1 && (
        <>
          <Text variant="micro-label" tone="muted" uppercase>
            Team A
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {teamRows.map((t) => (
              <Chip
                key={t.id}
                label={t.name}
                selected={teamA === t.id}
                disabled={!!matchId || teamB === t.id}
                onPress={() => setTeamA(t.id)}
              />
            ))}
          </View>
          <Text variant="micro-label" tone="muted" uppercase>
            Team B
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {teamRows.map((t) => (
              <Chip
                key={t.id}
                label={t.name}
                selected={teamB === t.id}
                disabled={!!matchId || teamA === t.id}
                onPress={() => setTeamB(t.id)}
              />
            ))}
          </View>
          <SegmentedTabs
            options={FORMAT_OPTIONS}
            value={format}
            onChange={(f) => {
              setFormat(f);
              setOvers(String(FORMAT_DEFAULT_OVERS[f]));
            }}
          />
          <TextField
            label="Overs per innings"
            keyboardType="number-pad"
            value={overs}
            onChangeText={setOvers}
            editable={format === 'CUSTOM'}
          />
          <TextField label="Date & time (YYYY-MM-DD HH:mm)" value={when} onChangeText={setWhen} />
          <TextField label="Venue (optional)" value={venue} onChangeText={setVenue} />
          <TextField label="Stage (optional)" value={stage} onChangeText={setStage} />
        </>
      )}

      {step === 2 && (
        <>
          {(
            [
              [teamA, squadA, xiA, setXiA],
              [teamB, squadB, xiB, setXiB],
            ] as const
          ).map(([tid, squad, xi, setXi]) => (
            <View key={tid} className="gap-2">
              <Text variant="title-sm">
                {teamName(tid)} — {xi.length}/11
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {squad.map((s) => (
                  <Chip
                    key={s.playerId}
                    label={shortName(nameOf(s.playerId))}
                    selected={xi.includes(s.playerId)}
                    onPress={() => toggle(xi, setXi, s.playerId)}
                  />
                ))}
              </View>
              {squad.length < 11 && (
                <Text variant="caption" tone="error">
                  This squad has only {squad.length} players — add players to the team first.
                </Text>
              )}
            </View>
          ))}
        </>
      )}

      {step === 3 && (
        <>
          <Text variant="micro-label" tone="muted" uppercase>
            Toss won by
          </Text>
          <View className="flex-row gap-2">
            {[teamA, teamB].map((t) => (
              <Chip
                key={t}
                label={teamName(t)}
                selected={tossWinner === t}
                onPress={() => setTossWinner(t)}
              />
            ))}
          </View>
          <Text variant="micro-label" tone="muted" uppercase>
            Elected to
          </Text>
          <View className="flex-row gap-2">
            <Chip label="Bat" selected={decision === 'bat'} onPress={() => setDecision('bat')} />
            <Chip label="Bowl" selected={decision === 'bowl'} onPress={() => setDecision('bowl')} />
          </View>
        </>
      )}

      {step === 4 && (
        <>
          <Text variant="title-sm">{teamName(batFirst)} bat first</Text>
          <Text variant="micro-label" tone="muted" uppercase>
            Opening batter 1 (on strike)
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {batXi.map((p) => (
              <Chip
                key={p}
                label={shortName(nameOf(p))}
                selected={strikerId === p}
                disabled={nonStrikerId === p}
                onPress={() => setStriker(p)}
              />
            ))}
          </View>
          <Text variant="micro-label" tone="muted" uppercase>
            Opening batter 2
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {batXi.map((p) => (
              <Chip
                key={p}
                label={shortName(nameOf(p))}
                selected={nonStrikerId === p}
                disabled={strikerId === p}
                onPress={() => setNonStriker(p)}
              />
            ))}
          </View>
          <Text variant="micro-label" tone="muted" uppercase>
            Opening bowler
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {bowlXi.map((p) => (
              <Chip
                key={p}
                label={shortName(nameOf(p))}
                selected={bowlerId === p}
                onPress={() => setBowler(p)}
              />
            ))}
          </View>
        </>
      )}

      {error ? (
        <Text variant="body-sm" tone="error">
          {error}
        </Text>
      ) : null}
      <View className="flex-row gap-2">
        {step > 1 && step < 4 ? (
          <Button
            label="Back"
            variant="secondary"
            onPress={() => setStep(step - 1)}
            className="flex-1"
          />
        ) : null}
        <Button
          className="flex-1"
          loading={busy}
          label={step === 4 ? 'Start match' : step === 3 ? 'Save toss' : 'Next'}
          disabled={step === 4 && (!strikerId || !nonStrikerId || !bowlerId)}
          onPress={step === 1 ? next1 : step === 2 ? next2 : step === 3 ? next3 : start}
        />
      </View>
    </TempScreen>
  );
}
