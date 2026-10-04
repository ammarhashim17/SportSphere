// TEMP-UI: replace with Stitch design (LOCK-03)
import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import {
  Button,
  Card,
  EmptyState,
  PlayerAvatar,
  RoleBadge,
  Text,
  TempScreen,
} from '@/components/ui';
import { getPlayer, type PlayerRow } from '@/features/players/playerRepository';

export default function PlayerProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    if (!id) return;
    setLoading(true);
    getPlayer(id)
      .then(setPlayer)
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  if (!player && !loading) {
    return (
      <TempScreen title="Player Not Found" back>
        <EmptyState
          icon="person"
          title="Player Not Found"
          body="The requested player profile does not exist or has been archived."
        />
      </TempScreen>
    );
  }

  return (
    <TempScreen title={player?.name ?? 'Player Profile'} back>
      {player ? (
        <Card className="items-center gap-4 p-6">
          <PlayerAvatar
            name={player.name}
            photoUrl={player.photoUrl}
            role={player.role}
            size={64}
          />
          <View className="items-center gap-1">
            <Text variant="headline-md">{player.name}</Text>
            <RoleBadge role={player.role} />
          </View>

          <View className="w-full gap-3 pt-4">
            <View className="flex-row justify-between border-b border-outline-variant pb-2">
              <Text variant="body-sm" tone="muted">
                Batting Style
              </Text>
              <Text variant="body-sm" weight="semibold">
                {player.battingStyle ? `${player.battingStyle} hand` : 'Not specified'}
              </Text>
            </View>

            <View className="flex-row justify-between border-b border-outline-variant pb-2">
              <Text variant="body-sm" tone="muted">
                Bowling Style
              </Text>
              <Text variant="body-sm" weight="semibold">
                {player.bowlingStyle || 'Not specified'}
              </Text>
            </View>

            <View className="flex-row justify-between border-b border-outline-variant pb-2">
              <Text variant="body-sm" tone="muted">
                Date of Birth
              </Text>
              <Text variant="body-sm" weight="semibold">
                {player.dateOfBirth || 'Not specified'}
              </Text>
            </View>
          </View>

          <Button
            label="Edit Player"
            variant="secondary"
            icon="edit"
            onPress={() => router.push(`/player/${player.id}/edit` as never)}
            full
            className="mt-2"
          />
        </Card>
      ) : null}
    </TempScreen>
  );
}
