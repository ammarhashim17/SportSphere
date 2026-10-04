import { View } from 'react-native';
import { colors } from '@/theme/colors';
import { PulseDot } from './PulseDot';
import { Text } from './Text';

export type MatchStatus = 'live' | 'completed' | 'upcoming' | 'abandoned';
const WRAP: Record<MatchStatus, string> = {
  live: 'bg-[#FEF3C7]',
  completed: 'bg-primary-fixed',
  upcoming: 'bg-surface-container-low',
  abandoned: 'bg-surface-container',
};
const TEXT: Record<MatchStatus, string> = {
  live: 'LIVE',
  completed: 'Completed',
  upcoming: 'Upcoming',
  abandoned: 'Abandoned',
};

export function StatusPill({ status }: { status: MatchStatus }) {
  return (
    <View className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${WRAP[status]}`}>
      {status === 'live' && <PulseDot color={colors.amber} size={6} />}
      <Text
        variant="micro-label"
        tone={status === 'live' ? 'amber' : status === 'completed' ? 'primary' : 'muted'}
      >
        {TEXT[status]}
      </Text>
    </View>
  );
}
