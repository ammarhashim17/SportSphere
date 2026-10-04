// TEMP-UI: replace with Stitch design (LOCK-03)
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { View } from 'react-native';
import { Button, Text, TextField, TempScreen } from '@/components/ui';
import { loginSchema, type LoginForm } from '@/core/schemas';
import { useAuthStore } from '@/features/auth/authStore';

export default function Login() {
  const signIn = useAuthStore((s) => s.signIn);
  const [formError, setFormError] = useState<string>();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(undefined);
    const { error } = await signIn(email, password);
    if (error) setFormError(error);
  });

  return (
    <TempScreen title="Log in">
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
            autoComplete="password"
            error={errors.password?.message}
          />
        )}
      />
      {formError ? (
        <Text variant="body-sm" tone="error">
          {formError}
        </Text>
      ) : null}
      <Button label="Log in" onPress={onSubmit} loading={isSubmitting} full />
      <View className="flex-row justify-between pt-2">
        <Link href="/(auth)/forgot-password">
          <Text variant="body-sm" tone="primary" weight="semibold">
            Forgot password?
          </Text>
        </Link>
        <Link href="/(auth)/signup">
          <Text variant="body-sm" tone="primary" weight="semibold">
            Create account
          </Text>
        </Link>
      </View>
    </TempScreen>
  );
}
