// TEMP-UI: replace with Stitch design (LOCK-03)
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Text, TextField, TempScreen } from '@/components/ui';
import { forgotSchema, type ForgotForm } from '@/core/schemas';
import { useAuthStore } from '@/features/auth/authStore';

export default function ForgotPassword() {
  const sendReset = useAuthStore((s) => s.sendReset);
  const [formError, setFormError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(undefined);
    const { error } = await sendReset(email);
    if (error) {
      setFormError(error);
    } else {
      setSubmitted(true);
    }
  });

  if (submitted) {
    return (
      <TempScreen title="Reset Link Sent" back>
        <Card className="gap-3 p-4">
          <Text variant="body-md">
            If that email exists in our records, a password reset link has been sent to it.
          </Text>
          <Link href="/(auth)/login" asChild>
            <Button label="Back to Log in" full />
          </Link>
        </Card>
      </TempScreen>
    );
  }

  return (
    <TempScreen title="Forgot password" back>
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
      {formError ? (
        <Text variant="body-sm" tone="error">
          {formError}
        </Text>
      ) : null}
      <Button label="Send Reset Link" onPress={onSubmit} loading={isSubmitting} full />
      <View className="flex-row justify-center pt-2">
        <Link href="/(auth)/login">
          <Text variant="body-sm" tone="primary" weight="semibold">
            Back to Log in
          </Text>
        </Link>
      </View>
    </TempScreen>
  );
}
