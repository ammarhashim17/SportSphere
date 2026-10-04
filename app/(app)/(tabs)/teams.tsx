// TEMP-UI: replace with Stitch design (LOCK-03)
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Button, Card, EmptyState, TeamCrest, Text, TempScreen } from '@/components/ui';
import { listTeams, type TeamRow } from '@/features/teams/teamRepository';

export default function TeamsTab() {
  const router = useRouter();
  const [teamsList, setTeamsList] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    listTeams()
      .then(setTeamsList)
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  return (
    <TempScreen title="Teams">
      <View className="flex-row items-center justify-between">
        <Text variant="body-sm" tone="muted">
          {teamsList.length} {teamsList.length === 1 ? 'team' : 'teams'} registered
        </Text>
        <Button label="New Team" icon="add" onPress={() => router.push('/team/new' as never)} />
      </View>

      {teamsList.length === 0 && !loading ? (
        <EmptyState
          icon="shield"
          title="No Teams Found"
          body="Create your first cricket team to manage players, assign squads, and score matches."
          actionLabel="Create Team"
          onAction={() => router.push('/team/new' as never)}
        />
      ) : (
        <View className="gap-3">
          {teamsList.map((team) => (
            <Pressable
              key={team.id}
              onPress={() => router.push(`/team/${team.id}` as never)}
              className="active:opacity-80"
            >
              <Card className="flex-row items-center gap-4 p-4">
                <TeamCrest
                  shortName={team.shortName}
                  colour={team.colour ?? '#0D5C3A'}
                  logoUrl={team.logoUrl}
                  size="md"
                />
                <View className="flex-1 gap-0.5">
                  <Text variant="title-sm">{team.name}</Text>
                  <Text variant="caption" tone="muted">
                    {team.shortName} {team.location ? `• ${team.location}` : ''}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </TempScreen>
  );
}
