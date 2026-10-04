// TEMP-UI: replace with Stitch design (LOCK-03)
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, View } from 'react-native';
import { Button, PlayerAvatar, SegmentedTabs, Text, TextField, TempScreen } from '@/components/ui';
import { playerSchema, type PlayerForm } from '@/core/schemas';
import { archivePlayer, getPlayer, updatePlayer } from '@/features/players/playerRepository';
import { pickAndUploadImage } from '@/features/storage/storageUpload';

export default function EditPlayer() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [formError, setFormError] = useState<string>();
  const [uploading, setUploading] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlayerForm>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      name: '',
      role: 'BAT',
      battingStyle: 'right',
      bowlingStyle: '',
      dateOfBirth: '',
      photoUrl: null,
      isCaptain: false,
      isViceCaptain: false,
    },
  });

  useEffect(() => {
    if (!id) return;
    getPlayer(id).then((p) => {
      if (p) {
        reset({
          name: p.name,
          role: p.role,
          battingStyle: p.battingStyle ?? 'right',
          bowlingStyle: p.bowlingStyle ?? '',
          dateOfBirth: p.dateOfBirth ?? '',
          photoUrl: p.photoUrl,
          isCaptain: false,
          isViceCaptain: false,
        });
      }
    });
  }, [id, reset]);

  const name = useWatch({ control, name: 'name' }) || 'Player';
  const role = useWatch({ control, name: 'role' }) || 'BAT';
  const photoUrl = useWatch({ control, name: 'photoUrl' });
  const battingStyle = useWatch({ control, name: 'battingStyle' }) || 'right';

  const onPickPhoto = async () => {
    try {
      setUploading(true);
      const url = await pickAndUploadImage('player-photos', 'player');
      if (url) {
        setValue('photoUrl', url);
      }
    } catch (e) {
      Alert.alert('Upload Error', e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = handleSubmit(async (data: PlayerForm) => {
    if (!id) return;
    setFormError(undefined);
    try {
      await updatePlayer(id, data);
      router.back();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  });

  const onArchive = () => {
    Alert.alert(
      'Archive Player',
      'Are you sure you want to archive this player? They will be removed from your active roster.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            await archivePlayer(id);
            router.replace('/(app)/(tabs)/teams' as never);
          },
        },
      ],
    );
  };

  return (
    <TempScreen title="Edit Player" back>
      <View className="items-center py-2">
        <PlayerAvatar name={name} role={role} photoUrl={photoUrl} size={64} />
        <View className="pt-3">
          <Button
            label={uploading ? 'Uploading...' : photoUrl ? 'Change Photo' : 'Upload Photo'}
            variant="ghost"
            icon="photo_camera"
            onPress={onPickPhoto}
            disabled={uploading}
          />
        </View>
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextField
            label="Full Name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.name?.message}
          />
        )}
      />

      <View className="gap-1.5">
        <Text variant="micro-label" tone="muted" uppercase>
          Player Role
        </Text>
        <SegmentedTabs
          options={[
            { value: 'BAT', label: 'Batter' },
            { value: 'BOWL', label: 'Bowler' },
            { value: 'AR', label: 'All-Rounder' },
            { value: 'WK', label: 'Wicketkeeper' },
          ]}
          value={role}
          onChange={(val) => setValue('role', val as 'BAT' | 'BOWL' | 'AR' | 'WK')}
        />
      </View>

      <View className="gap-1.5">
        <Text variant="micro-label" tone="muted" uppercase>
          Batting Style
        </Text>
        <SegmentedTabs
          options={[
            { value: 'right', label: 'Right Hand' },
            { value: 'left', label: 'Left Hand' },
          ]}
          value={battingStyle}
          onChange={(val) => setValue('battingStyle', val as 'right' | 'left')}
        />
      </View>

      <Controller
        control={control}
        name="bowlingStyle"
        render={({ field }) => (
          <TextField
            label="Bowling Style (optional)"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.bowlingStyle?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="dateOfBirth"
        render={({ field }) => (
          <TextField
            label="Date of Birth (YYYY-MM-DD)"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.dateOfBirth?.message}
          />
        )}
      />

      {formError ? (
        <Text variant="body-sm" tone="error">
          {formError}
        </Text>
      ) : null}

      <Button
        label="Save Changes"
        onPress={onSubmit}
        loading={isSubmitting}
        full
        className="mt-2"
      />

      <Button label="Archive Player" variant="danger" icon="delete" onPress={onArchive} full />
    </TempScreen>
  );
}
