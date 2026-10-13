import { View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { shortName, surname } from '@/core/identity';
import {
  bowlerFigures,
  economy,
  partnershipView,
  strikeRate,
  type BowlerState,
  type InningsState,
} from '@/core/scoring';
import { colors } from '@/theme/colors';
import { shadow } from '@/theme/shadows';

/**
 * Stitch stat grid is `grid-cols-5 w-44` (176 px). With 5 equal 35 px columns the strike-rate ("144.8") overflows into the
 * 6s column. Same total width, redistributed: R 34 · B 34 · 4s 28 · 6s 28 · SR 52.  (Needs owner approval — see plan Q3.)
 */
export const STAT_COLS = [34, 34, 28, 28, 52] as const;

function Stats({
  values,
  strong,
}: {
  values: [string, string, string, string, string];
  strong?: boolean;
}) {
  return (
    <View className="w-44 flex-row">
      {values.map((v, i) => (
        <View key={i} style={{ width: STAT_COLS[i] }}>
          <Text
            variant="body-md"
            weight={i === 0 ? 'bold' : i === 4 ? 'medium' : 'regular'}
            tone={i === 0 && strong ? 'primary' : i === 0 || i === 4 ? 'default' : 'muted'}
            className="text-right"
            numberOfLines={1}
          >
            {v}
          </Text>
        </View>
      ))}
    </View>
  );
}

type Props = {
  state: InningsState;
  strikerId: string;
  nonStrikerId: string;
  names: (id: string) => string;
  /** Rendered at the bottom of the same card (the bowler row), as in Stitch. */
  children?: React.ReactNode;
};

export function BattersCard({ state, strikerId, nonStrikerId, names, children }: Props) {
  const row = (id: string): [string, string, string, string, string] => {
    const b = state.batters[id];
    return b
      ? [
          String(b.runs),
          String(b.balls),
          String(b.fours),
          String(b.sixes),
          strikeRate(b.runs, b.balls).toFixed(1),
        ]
      : ['0', '0', '0', '0', '0.0'];
  };
  return (
    <View className="gap-3 rounded-xl bg-surface-container-lowest p-3.5" style={shadow.l1}>
      <View className="gap-2">
        <View className="flex-row items-center justify-between pb-1">
          <Text variant="micro-label" tone="muted" uppercase className="tracking-wider">
            Batting
          </Text>
          <View className="w-44 flex-row">
            {['R', 'B', '4s', '6s', 'SR'].map((h, i) => (
              <View key={h} style={{ width: STAT_COLS[i] }}>
                <Text
                  variant="micro-label"
                  tone="muted"
                  uppercase
                  className="text-right tracking-wider"
                >
                  {h}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="flex-row items-center justify-between rounded-lg bg-primary/5 px-2.5 py-1.5">
          <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
            <View className="h-2 w-2 shrink-0 rounded-full bg-primary-container" />
            <Text variant="body-md" weight="bold" numberOfLines={1} className="shrink">
              {shortName(names(strikerId))}
            </Text>
            <Icon name="sports_cricket" size={14} color={colors.primary} filled />
          </View>
          <Stats values={row(strikerId)} strong />
        </View>

        <View className="flex-row items-center justify-between px-2.5 py-1">
          <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
            <View className="h-2 w-2 shrink-0 rounded-full bg-outline-variant/60" />
            <Text variant="body-md" numberOfLines={1} className="shrink">
              {shortName(names(nonStrikerId))}
            </Text>
          </View>
          <Stats values={row(nonStrikerId)} />
        </View>
      </View>

      <PartnershipBar state={state} names={names} />
      {children}
    </View>
  );
}

function PartnershipBar({ state, names }: { state: InningsState; names: (id: string) => string }) {
  const p = partnershipView(state);
  return (
    <View className="gap-1.5 rounded-lg bg-surface-container-low p-2">
      <View className="flex-row items-center justify-between">
        <Text variant="caption" weight="medium" tone="muted">
          Partnership{' '}
          <Text variant="caption" weight="bold">
            {p.runs}
          </Text>{' '}
          runs ({p.balls} balls)
        </Text>
        <Text variant="caption" tone="muted" weight="regular">
          {surname(names(p.a.id))} {p.a.runs} • {surname(names(p.b.id))} {p.b.runs}
        </Text>
      </View>
      <View className="h-2 w-full flex-row overflow-hidden rounded-full bg-surface-container-highest">
        <View className="h-full bg-primary-container" style={{ width: `${p.a.pct}%` }} />
        <View className="h-full bg-secondary-container" style={{ width: `${p.b.pct}%` }} />
      </View>
    </View>
  );
}

type BowlerProps = {
  bowler: BowlerState | null;
  name: string;
  style: string | null;
  ballsPerOver: number;
};

/** Stitch bowler row inside the same card (rendered by the screen directly below BattersCard's card padding). */
export function BowlerRow({ bowler, name, style, ballsPerOver }: BowlerProps) {
  return (
    <View className="flex-row items-center justify-between pt-1">
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <View className="h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container">
          <Icon name="sports_handball" size={16} color={colors['on-surface']} />
        </View>
        <View className="min-w-0">
          <Text variant="body-sm" weight="bold" numberOfLines={1}>
            {shortName(name) || '—'}
          </Text>
          {style ? (
            <Text variant="micro-label" tone="muted" uppercase className="tracking-wider">
              {style}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="items-end">
        <Text variant="body-md" weight="bold">
          {bowler ? bowlerFigures(bowler, ballsPerOver) : '0.0-0-0-0'}
        </Text>
        <Text variant="micro-label" tone="muted" weight="regular">
          Econ {bowler ? economy(bowler.runs, bowler.legalBalls, ballsPerOver).toFixed(2) : '0.00'}
        </Text>
      </View>
    </View>
  );
}
