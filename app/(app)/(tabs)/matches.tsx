// TEMP-UI: replace with Stitch design (LOCK-03) — the Matches tab (Live / Upcoming / Completed + search) is not designed yet.
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { desc, inArray, isNull, and } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Button, EmptyState, SegmentedTabs, StatusPill, TeamCrest, Text } from '@/components/ui';
import { db } from '@/db/client';
import { matches, teams } from '@/db/schema';

const TABS = [
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
] as const;
type Tab = (typeof TABS)[number]['value'];
const STATUSES = {
  live: ['live', 'innings_break'],
  upcoming: ['upcoming'],
  completed: ['completed', 'abandoned', 'no_result'],
} as const;

export default function MatchesTab() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('live');
  const { data: rows } = useLiveQuery(
    db
      .select()
      .from(matches)
      .where(and(isNull(matches.archivedAt), inArray(matches.status, [...STATUSES[tab]])))
      .orderBy(desc(matches.scheduledAt)),
    [tab],
  );
  const { data: teamRows } = useLiveQuery(db.select().from(teams));
  const team = (id: string) => teamRows.find((t) => t.id === id);

  return (
    <View className="flex-1 bg-surface px-margin pt-16">
      <View className="mb-3 flex-row items-center justify-between">
        <Text variant="headline-md">Matches</Text>
        <Button label="New match" icon="add" onPress={() => router.push('/match/new' as never)} />
      </View>
      <SegmentedTabs options={TABS} value={tab} onChange={setTab} />
      <ScrollView contentContainerClassName="gap-3 py-4">
        {rows.length === 0 ? (
          <EmptyState
            icon="sports_cricket"
            title={`No ${tab} matches`}
            body="Create a match to start scoring."
          />
        ) : (
          rows.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => router.push(`/match/${m.id}` as never)}
              className="gap-2 rounded-xl bg-surface-container-lowest p-3.5"
            >
              <View className="flex-row items-center justify-between">
                <Text variant="caption" tone="muted">
                  {[m.format, m.stage, m.venue].filter(Boolean).join(' • ')}
                </Text>
                <StatusPill
                  status={
                    m.status === 'completed'
                      ? 'completed'
                      : m.status === 'upcoming'
                        ? 'upcoming'
                        : 'live'
                  }
                />
              </View>
              {[m.teamAId, m.teamBId].map((id) => (
                <View key={id} className="flex-row items-center gap-2">
                  <TeamCrest
                    shortName={team(id)?.shortName}
                    name={team(id)?.name}
                    colour={team(id)?.colour}
                    size="sm"
                  />
                  <Text variant="title-sm">{team(id)?.name ?? 'Team'}</Text>
                </View>
              ))}
              {m.resultSummary ? (
                <Text variant="body-sm" tone="primary" weight="semibold">
                  {m.resultSummary}
                </Text>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
