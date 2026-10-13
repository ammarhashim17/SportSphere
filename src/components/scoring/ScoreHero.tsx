import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, Text } from '@/components/ui';
import { formatOvers, type ChaseInfo, type InningsState, type MatchConfig } from '@/core/scoring';
import { colors } from '@/theme/colors';
import { shadow } from '@/theme/shadows';

type Props = {
  title: string; // "Northwood CC vs Riverside XI"
  syncLabel: string; // "Local • Offline Ready"
  state: InningsState;
  cfg: MatchConfig;
  chase: ChaseInfo | null;
};

/** Stitch hero: `bg-gradient-to-br from-primary via-primary-container to-surface-tint`, rounded-b-2xl, shadow-md. */
export function ScoreHero({ title, syncLabel, state, cfg, chase }: Props) {
  const overs = formatOvers(state.legalBalls, cfg.ballsPerOver);
  return (
    <LinearGradient
      colors={[colors.primary, colors['primary-container'], colors['surface-tint']]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },
        shadow.md,
      ]}
    >
      {/* pitch-seam texture: three 1 px lines at 10 % */}
      <View pointerEvents="none" className="absolute inset-0 flex-row justify-around opacity-10">
        {[0, 1, 2].map((i) => (
          <View key={i} className="h-full w-px bg-surface-container-lowest" />
        ))}
      </View>

      <View className="px-margin pb-5 pt-4">
        <View className="mb-3 flex-row items-center justify-between gap-space-xs">
          <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
            <Icon name="sports_cricket" size={18} color={colors['primary-fixed']} />
            <Text
              variant="title-sm"
              tone="none"
              numberOfLines={1}
              className="shrink text-surface-container-lowest"
            >
              {title}
            </Text>
          </View>
          <View className="flex-row items-center gap-1 rounded-full bg-surface-container-lowest/15 px-2 py-0.5">
            <View className="h-1.5 w-1.5 rounded-full bg-primary-fixed" />
            <Text
              variant="micro-label"
              weight="medium"
              tone="none"
              className="text-surface-container-lowest"
            >
              {syncLabel}
            </Text>
          </View>
        </View>

        <View className="mt-1 flex-row items-baseline justify-between">
          <View className="flex-row items-baseline gap-space-sm">
            <Text
              variant="display-score"
              tone="none"
              className="text-surface-container-lowest"
              style={{
                textShadowColor: 'rgba(0,0,0,0.05)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}
            >
              {state.runs}/{state.wickets}
            </Text>
            <View>
              <Text variant="title-sm" tone="none" className="leading-none text-primary-fixed">
                Overs {overs}
              </Text>
              <Text
                variant="caption"
                tone="none"
                className="mt-0.5 text-surface-container-lowest/80"
              >
                Max {cfg.oversPerInnings}.0
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text
              variant="micro-label"
              tone="none"
              uppercase
              className="tracking-widest text-primary-fixed-dim"
            >
              Innings {state.inningsNo}
            </Text>
            {chase ? (
              <Text
                variant="headline-md"
                weight="bold"
                tone="none"
                className="leading-none text-surface-container-lowest"
              >
                Target {chase.target}
              </Text>
            ) : null}
          </View>
        </View>

        {chase ? (
          <View className="relative z-10 -mx-margin mt-3.5 flex-row flex-wrap items-center justify-between gap-2 bg-black/20 px-margin pt-2.5 text-surface-container-lowest">
            <View className="flex-row items-center gap-1.5">
              <Icon name="timer" size={16} color={colors['secondary-fixed']} />
              <Text
                variant="caption"
                weight="semibold"
                tone="none"
                className="tracking-wide text-secondary-fixed"
              >
                Need {chase.runsNeeded} runs from {chase.ballsRemaining} balls
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text
                variant="caption"
                weight="medium"
                tone="none"
                className="text-surface-container-lowest/90"
              >
                CRR{' '}
                <Text
                  variant="caption"
                  weight="bold"
                  tone="none"
                  className="text-surface-container-lowest"
                >
                  {chase.currentRate.toFixed(2)}
                </Text>
              </Text>
              <View className="h-1 w-1 rounded-full bg-surface-container-lowest/40" />
              <Text
                variant="caption"
                weight="medium"
                tone="none"
                className="text-surface-container-lowest/90"
              >
                RRR{' '}
                <Text
                  variant="caption"
                  weight="bold"
                  tone="none"
                  className="text-secondary-fixed-dim"
                >
                  {chase.requiredRate.toFixed(2)}
                </Text>
              </Text>
            </View>
          </View>
        ) : (
          <View className="relative z-10 -mx-margin mt-3.5 flex-row items-center justify-between gap-2 bg-black/20 px-margin pt-2.5">
            <Text
              variant="caption"
              weight="medium"
              tone="none"
              className="text-surface-container-lowest/90"
            >
              CRR{' '}
              <Text
                variant="caption"
                weight="bold"
                tone="none"
                className="text-surface-container-lowest"
              >
                {(state.legalBalls === 0
                  ? 0
                  : (state.runs * cfg.ballsPerOver) / state.legalBalls
                ).toFixed(2)}
              </Text>
            </Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}
