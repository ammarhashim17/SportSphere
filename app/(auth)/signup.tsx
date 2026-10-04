// TEMP-UI: replace with Stitch design (LOCK-03)
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Text, TextField, TempScreen } from '@/components/ui';
import { signupSchema, type SignupForm } from '@/core/schemas';
import { useAuthStore } from '@/features/auth/authStore';

export default function Signup() {
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const [formError, setFormError] = useState<string>();
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ fullName, email, password }) => {
    setFormError(undefined);
    const res = await signUp(fullName, email, password);
    if (res.error) {
      setFormError(res.error);
    } else if (res.needsConfirmation) {
      setNeedsConfirmation(true);
    }
  });

  if (needsConfirmation) {
    return (
      <TempScreen title="Check your email">
        <Card className="gap-3 p-4">
          <Text variant="body-md">Check your email to confirm your account, then log in.</Text>
          <Button label="Go to Log in" onPress={() => router.replace('/(auth)/login')} full />
        </Card>
      </TempScreen>
    );
  }

  return (
    <TempScreen title="Create account" back>
      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <TextField
            label="Full Name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="words"
            error={errors.fullName?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label="Password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            autoComplete="new-password"
            error={errors.password?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="confirm"
        render={({ field }) => (
          <TextField
            label="Confirm Password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            autoComplete="new-password"
            error={errors.confirm?.message}
          />
        )}
      />
      {formError ? (
        <Text variant="body-sm" tone="error">
          {formError}
        </Text>
      ) : null}
      <Button label="Create Account" onPress={onSubmit} loading={isSubmitting} full />
      <View className="flex-row justify-center pt-2">
        <Text variant="body-sm" tone="muted">
          Already have an account?{' '}
        </Text>
        <Link href="/(auth)/login">
          <Text variant="body-sm" tone="primary" weight="semibold">
            Log in
          </Text>
        </Link>
      </View>
    </TempScreen>
  );
}
