// TEMP-UI: replace with Stitch design (LOCK-03)
import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Switch, View } from 'react-native';
import {
  Button,
  Card,
  EmptyState,
  PlayerAvatar,
  RoleBadge,
  Text,
  TextField,
  TempScreen,
} from '@/components/ui';
import {
  assignPlayerToTeam,
  getTeamSquad,
  listPlayers,
  type PlayerRow,
} from '@/features/players/playerRepository';

export default function AddPlayerToTeam() {
  const router = useRouter();
  const { id: teamId } = useLocalSearchParams<{ id: string }>();
  const [allPlayers, setAllPlayers] = useState<PlayerRow[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [jerseyNo, setJerseyNo] = useState('');
  const [isCaptain, setIsCaptain] = useState(false);
  const [isViceCaptain, setIsViceCaptain] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(() => {
    if (!teamId) return;
    setLoading(true);
    Promise.all([listPlayers(), getTeamSquad(teamId)])
      .then(([players, squad]) => {
        const squadIds = new Set(squad.map((s) => s.id));
        setAllPlayers(players.filter((p) => !squadIds.has(p.id)));
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onAdd = async () => {
    if (!teamId || !selectedPlayerId) return;
    try {
      setSubmitting(true);
      await assignPlayerToTeam(teamId, selectedPlayerId, {
        jerseyNo: jerseyNo ? parseInt(jerseyNo, 10) : null,
        isCaptain,
        isViceCaptain,
      });
      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TempScreen title="Add Player to Squad" back>
      <View className="flex-row items-center justify-between">
        <Text variant="body-sm" tone="muted">
          Select an existing player or create new
        </Text>
        <Button
          label="Create Player"
          icon="add"
          onPress={() => router.push('/player/new' as never)}
        />
      </View>

      {selectedPlayerId ? (
        <Card className="gap-3 p-4">
          <Text variant="title-sm">Squad Role & Number</Text>
          <TextField
            label="Jersey Number (optional)"
            placeholder="e.g. 18"
            value={jerseyNo}
            onChangeText={setJerseyNo}
            keyboardType="number-pad"
            maxLength={3}
          />
          <View className="flex-row items-center justify-between py-1">
            <Text variant="body-md">Team Captain</Text>
            <Switch
              value={isCaptain}
              onValueChange={(val) => {
                setIsCaptain(val);
                if (val) setIsViceCaptain(false);
              }}
            />
          </View>
          <View className="flex-row items-center justify-between py-1">
            <Text variant="body-md">Vice Captain</Text>
            <Switch
              value={isViceCaptain}
              onValueChange={(val) => {
                setIsViceCaptain(val);
                if (val) setIsCaptain(false);
              }}
            />
          </View>
          <Button label="Confirm Add to Squad" onPress={onAdd} loading={submitting} full />
        </Card>
      ) : null}

      <Text variant="title-sm">Available Players ({allPlayers.length})</Text>

      {allPlayers.length === 0 && !loading ? (
        <EmptyState
          icon="person"
          title="No Available Players"
          body="All registered players are already in this squad, or no players have been created yet."
          actionLabel="Create New Player"
          onAction={() => router.push('/player/new' as never)}
        />
      ) : (
        <View className="gap-2">
          {allPlayers.map((player) => {
            const isSelected = selectedPlayerId === player.id;
            return (
              <Pressable
                key={player.id}
                onPress={() => setSelectedPlayerId(isSelected ? null : player.id)}
                className="active:opacity-80"
              >
                <Card
                  className={`flex-row items-center justify-between p-3 ${
                    isSelected ? 'border-2 border-primary' : ''
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <PlayerAvatar
                      name={player.name}
                      photoUrl={player.photoUrl}
                      role={player.role}
                      size={40}
                    />
                    <View className="gap-0.5">
                      <Text variant="title-sm">{player.name}</Text>
                      <Text variant="caption" tone="muted">
                        {player.battingStyle ? `${player.battingStyle} bat` : ''}
                        {player.bowlingStyle ? ` • ${player.bowlingStyle}` : ''}
                      </Text>
                    </View>
                  </View>
                  <RoleBadge role={player.role} />
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </TempScreen>
  );
}
