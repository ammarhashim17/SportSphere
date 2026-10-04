import { View } from 'react-native';
import { colors } from '@/theme/colors';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  icon: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, body, actionLabel, onAction }: Props) {
  return (
    <View className="items-center gap-3 px-margin py-space-xl">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-surface-container-low">
        <Icon name={icon} size={32} color={colors.outline} />
      </View>
      <Text variant="title-sm" className="text-center">
        {title}
      </Text>
      {body ? (
        <Text variant="body-sm" tone="muted" className="text-center">
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
