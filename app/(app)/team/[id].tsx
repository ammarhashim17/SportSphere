// TEMP-UI: replace with Stitch design (LOCK-03)
import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import {
  Button,
  Card,
  EmptyState,
  PlayerAvatar,
  RoleBadge,
  TeamCrest,
  Text,
  TempScreen,
} from '@/components/ui';
import { getTeamSquad, type SquadMember } from '@/features/players/playerRepository';
import { getTeam, type TeamRow } from '@/features/teams/teamRepository';

export default function TeamDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [squad, setSquad] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getTeam(id), getTeamSquad(id)])
      .then(([t, s]) => {
        setTeam(t);
        setSquad(s);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  if (!team && !loading) {
    return (
      <TempScreen title="Team Not Found" back>
        <EmptyState
          icon="shield"
          title="Team Not Found"
          body="The requested team does not exist or has been archived."
        />
      </TempScreen>
    );
  }

  return (
    <TempScreen title={team?.name ?? 'Team'} back>
      {team ? (
        <Card className="items-center gap-3 p-6">
          <TeamCrest
            shortName={team.shortName}
            colour={team.colour ?? '#0D5C3A'}
            logoUrl={team.logoUrl}
            size="lg"
          />
          <View className="items-center">
            <Text variant="headline-md">{team.name}</Text>
            <Text variant="body-sm" tone="muted">
              {team.shortName} {team.location ? `• ${team.location}` : ''}
            </Text>
          </View>
          {team.description ? (
            <Text variant="body-sm" tone="muted" className="text-center">
              {team.description}
            </Text>
          ) : null}

          <View className="w-full flex-row gap-2 pt-2">
            <View className="flex-1">
              <Button
                label="Edit Team"
                variant="secondary"
                icon="edit"
                onPress={() => router.push(`/team/${team.id}/edit` as never)}
                full
              />
            </View>
            <View className="flex-1">
              <Button
                label="Add Player"
                icon="add"
                onPress={() => router.push(`/team/${team.id}/add-player` as never)}
                full
              />
            </View>
          </View>
        </Card>
      ) : null}

      <View className="flex-row items-center justify-between pt-2">
        <Text variant="title-sm">Squad Roster ({squad.length})</Text>
        <Button
          label="New Player"
          variant="ghost"
          icon="add"
          onPress={() => router.push('/player/new' as never)}
        />
      </View>

      {squad.length === 0 && !loading ? (
        <EmptyState
          icon="sports_cricket"
          title="No Players in Squad"
          body="Add players to this team to build your playing XI and squad."
          actionLabel="Add Player to Squad"
          onAction={() => router.push(`/team/${id}/add-player` as never)}
        />
      ) : (
        <View className="gap-2">
          {squad.map((player) => (
            <Pressable
              key={player.id}
              onPress={() => router.push(`/player/${player.id}` as never)}
              className="active:opacity-80"
            >
              <Card className="flex-row items-center justify-between p-3">
                <View className="flex-row items-center gap-3">
                  <PlayerAvatar
                    name={player.name}
                    photoUrl={player.photoUrl}
                    role={player.role}
                    size={40}
                  />
                  <View className="gap-0.5">
                    <View className="flex-row items-center gap-1.5">
                      <Text variant="title-sm">{player.name}</Text>
                      {player.isCaptain ? (
                        <View className="rounded bg-primary px-1.5 py-0.5">
                          <Text variant="caption" tone="inverse" weight="bold">
                            C
                          </Text>
                        </View>
                      ) : null}
                      {player.isViceCaptain ? (
                        <View className="rounded bg-secondary px-1.5 py-0.5">
                          <Text variant="caption" tone="inverse" weight="bold">
                            VC
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text variant="caption" tone="muted">
                      {player.jerseyNo ? `#${player.jerseyNo} • ` : ''}
                      {player.battingStyle ? `${player.battingStyle} bat` : ''}
                    </Text>
                  </View>
                </View>
                <RoleBadge role={player.role} />
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </TempScreen>
  );
}
