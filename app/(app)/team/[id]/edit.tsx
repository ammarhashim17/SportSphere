// TEMP-UI: replace with Stitch design (LOCK-03)
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, View } from 'react-native';
import { Button, TeamCrest, Text, TextField, TempScreen } from '@/components/ui';
import { teamSchema, type TeamForm } from '@/core/schemas';
import { pickAndUploadImage } from '@/features/storage/storageUpload';
import { archiveTeam, getTeam, updateTeam } from '@/features/teams/teamRepository';

export default function EditTeam() {
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
  } = useForm<TeamForm>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      shortName: '',
      colour: '#0D5C3A',
      location: '',
      description: '',
      logoUrl: null,
    },
  });

  useEffect(() => {
    if (!id) return;
    getTeam(id).then((t) => {
      if (t) {
        reset({
          name: t.name,
          shortName: t.shortName,
          colour: t.colour ?? '#0D5C3A',
          location: t.location ?? '',
          description: t.description ?? '',
          logoUrl: t.logoUrl,
        });
      }
    });
  }, [id, reset]);

  const shortName = useWatch({ control, name: 'shortName' }) || 'SS';
  const colour = useWatch({ control, name: 'colour' }) || '#0D5C3A';
  const logoUrl = useWatch({ control, name: 'logoUrl' });

  const onPickLogo = async () => {
    try {
      setUploading(true);
      const url = await pickAndUploadImage('team-logos', 'team');
      if (url) {
        setValue('logoUrl', url);
      }
    } catch (e) {
      Alert.alert('Upload Error', e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    if (!id) return;
    setFormError(undefined);
    try {
      await updateTeam(id, data);
      router.back();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  });

  const onArchive = () => {
    Alert.alert(
      'Archive Team',
      'Are you sure you want to archive this team? It will be removed from your active list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            await archiveTeam(id);
            router.replace('/(app)/(tabs)/teams' as never);
          },
        },
      ],
    );
  };

  return (
    <TempScreen title="Edit Team" back>
      <View className="items-center py-2">
        <TeamCrest shortName={shortName} colour={colour} logoUrl={logoUrl} size="lg" />
        <View className="pt-3">
          <Button
            label={uploading ? 'Uploading...' : logoUrl ? 'Change Logo' : 'Upload Logo'}
            variant="ghost"
            icon="photo_camera"
            onPress={onPickLogo}
            disabled={uploading}
          />
        </View>
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextField
            label="Team Name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.name?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="shortName"
        render={({ field }) => (
          <TextField
            label="Short Name (2-4 uppercase letters)"
            value={field.value}
            onChangeText={(t) => field.onChange(t.toUpperCase())}
            onBlur={field.onBlur}
            maxLength={4}
            autoCapitalize="characters"
            error={errors.shortName?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="colour"
        render={({ field }) => (
          <TextField
            label="Primary Hex Colour (#RRGGBB)"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.colour?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="location"
        render={({ field }) => (
          <TextField
            label="Home Ground / City"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.location?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextField
            label="Description / Notes"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            multiline
            numberOfLines={3}
            error={errors.description?.message}
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

      <Button label="Archive Team" variant="danger" icon="delete" onPress={onArchive} full />
    </TempScreen>
  );
}
