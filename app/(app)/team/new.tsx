// TEMP-UI: replace with Stitch design (LOCK-03)
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Alert, View } from 'react-native';
import { Button, TeamCrest, Text, TextField, TempScreen } from '@/components/ui';
import { teamSchema, type TeamForm } from '@/core/schemas';
import { useAuthStore } from '@/features/auth/authStore';
import { pickAndUploadImage } from '@/features/storage/storageUpload';
import { createTeam } from '@/features/teams/teamRepository';

export default function NewTeam() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const [formError, setFormError] = useState<string>();
  const [uploading, setUploading] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
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
    if (!userId) return;
    setFormError(undefined);
    try {
      const created = await createTeam(data, userId);
      router.replace(`/team/${created.id}` as never);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  });

  return (
    <TempScreen title="Create Team" back>
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
            placeholder="e.g. Royal Challengers"
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
            placeholder="e.g. RC"
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
            placeholder="#0D5C3A"
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
            placeholder="e.g. Melbourne"
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
            placeholder="Brief team bio"
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

      <Button label="Create Team" onPress={onSubmit} loading={isSubmitting} full className="mt-2" />
    </TempScreen>
  );
}
