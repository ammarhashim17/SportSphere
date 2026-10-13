// TEMP-UI: replace with Stitch design (LOCK-03) — bottom sheets are not in the Stitch export yet.
import { forwardRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { AppBottomSheet, Button, Text } from '@/components/ui';
import { shortName } from '@/core/identity';
import type { WicketType } from '@/core/scoring';

export type SheetRef = React.RefObject<BottomSheetModal | null>;
export const presentSheet = (ref: SheetRef) => ref.current?.present();
export const dismissSheet = (ref: SheetRef) => ref.current?.dismiss();

const chip = (on: boolean, off = false) =>
  `min-h-[44px] items-center justify-center rounded-xl border px-4 ${
    on ? 'border-primary bg-primary' : 'border-outline-variant bg-surface-container-lowest'
  } ${off ? 'opacity-40' : ''}`;

export function Chip({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      className={chip(!!selected, disabled)}
    >
      <Text variant="body-sm" weight="semibold" tone={selected ? 'inverse' : 'default'}>
        {label}
      </Text>
    </Pressable>
  );
}

export type PickItem = { id: string; name: string; hint?: string; disabled?: boolean };

/** Choose one player (new bowler, incoming batter…). */
export const PlayerPickSheet = forwardRef<
  BottomSheetModal,
  { title: string; items: PickItem[]; onPick: (id: string) => void; footer?: string }
>(function PlayerPickSheet({ title, items, onPick, footer }, ref) {
  return (
    <AppBottomSheet ref={ref}>
      <Text variant="headline-md" className="mb-3">
        {title}
      </Text>
      <ScrollView style={{ maxHeight: 420 }}>
        {items.map((it) => (
          <Pressable
            key={it.id}
            disabled={it.disabled}
            onPress={() => onPick(it.id)}
            className={`min-h-[52px] flex-row items-center justify-between border-b border-outline-variant/40 ${
              it.disabled ? 'opacity-40' : ''
            }`}
          >
            <Text variant="body-md" weight="semibold">
              {shortName(it.name) || it.name}
            </Text>
            {it.hint ? (
              <Text variant="caption" tone="muted">
                {it.hint}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
      {footer ? (
        <Text variant="caption" tone="muted" className="mt-2">
          {footer}
        </Text>
      ) : null}
    </AppBottomSheet>
  );
});

/**
 * Pick a number of runs (byes, leg byes, wide + runs, no-ball + bat runs).
 * The parent passes `key={kind}` so the selection restarts whenever the question changes.
 */
export const RunsSheet = forwardRef<
  BottomSheetModal,
  {
    title: string;
    min: number;
    max: number;
    confirmLabel?: string;
    onConfirm: (runs: number) => void;
  }
>(function RunsSheet({ title, min, max, confirmLabel = 'Record', onConfirm }, ref) {
  const [runs, setRuns] = useState(min);
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <AppBottomSheet ref={ref} onDismiss={() => setRuns(min)}>
      <Text variant="headline-md" className="mb-3">
        {title}
      </Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {values.map((v) => (
          <Chip key={v} label={String(v)} selected={v === runs} onPress={() => setRuns(v)} />
        ))}
      </View>
      <Button label={confirmLabel} full onPress={() => onConfirm(runs)} />
    </AppBottomSheet>
  );
});

const BALL_TYPES: { type: WicketType; label: string }[] = [
  { type: 'BOWLED', label: 'Bowled' },
  { type: 'CAUGHT', label: 'Caught' },
  { type: 'LBW', label: 'LBW' },
  { type: 'RUN_OUT', label: 'Run out' },
  { type: 'STUMPED', label: 'Stumped' },
  { type: 'HIT_WICKET', label: 'Hit wicket' },
  { type: 'OBSTRUCTING', label: 'Obstructing' },
  { type: 'HIT_TWICE', label: 'Hit twice' },
];

export interface WicketResult {
  type: WicketType;
  playerOutId: string;
  fielderId: string | null;
  incomingBatterId: string | null;
  incomingAt: 'STRIKER' | 'NON_STRIKER' | null;
  runsOffBat: number;
  onExtra: 'WIDE' | 'NO_BALL' | null;
  retire: boolean;
}

/** One scrolling sheet that collects everything for a dismissal (or a retirement). The engine re-validates on save. */
export const WicketSheet = forwardRef<
  BottomSheetModal,
  {
    strikerId: string;
    nonStrikerId: string;
    names: (id: string) => string;
    fielders: PickItem[];
    incoming: PickItem[];
    keeperId: string | null;
    freeHit: boolean;
    lastWicket: boolean;
    onConfirm: (r: WicketResult) => void;
  }
>(function WicketSheet(
  { strikerId, nonStrikerId, names, fielders, incoming, keeperId, freeHit, lastWicket, onConfirm },
  ref,
) {
  const [mode, setMode] = useState<'ball' | 'retire'>('ball');
  const [type, setType] = useState<WicketType>('BOWLED');
  const [outChoice, setOutChoice] = useState<'striker' | 'non'>('striker');
  const [fielder, setFielder] = useState<string | null>(null);
  const [inc, setInc] = useState<string | null>(null);
  const [runs, setRuns] = useState(0);
  const [onExtra, setOnExtra] = useState<'WIDE' | 'NO_BALL' | null>(null);
  const [at, setAt] = useState<'STRIKER' | 'NON_STRIKER' | null>(null);
  const [retireKind, setRetireKind] = useState<'RETIRED_HURT' | 'RETIRED_OUT'>('RETIRED_HURT');

  const reset = () => {
    setMode('ball');
    setType('BOWLED');
    setOutChoice('striker');
    setFielder(null);
    setInc(null);
    setRuns(0);
    setOnExtra(null);
    setAt(null);
    setRetireKind('RETIRED_HURT');
  };

  const allowedOnBall = (t: WicketType) => {
    if (freeHit || onExtra === 'NO_BALL')
      return t === 'RUN_OUT' || t === 'OBSTRUCTING' || t === 'HIT_TWICE';
    if (onExtra === 'WIDE')
      return t === 'STUMPED' || t === 'RUN_OUT' || t === 'HIT_WICKET' || t === 'OBSTRUCTING';
    return true;
  };
  const canPickOut = type === 'RUN_OUT' || type === 'OBSTRUCTING';
  const chooseWho = mode === 'retire' || canPickOut;
  const outId = chooseWho && outChoice === 'non' ? nonStrikerId : strikerId;
  const actualType: WicketType = mode === 'retire' ? retireKind : type;
  const incomingOk = lastWicket && mode === 'ball' ? true : !!inc;
  const fielderOk = mode === 'ball' && type === 'CAUGHT' ? !!fielder : true; // run out / stumped: fielder optional
  const valid = incomingOk && fielderOk;

  return (
    <AppBottomSheet ref={ref} onDismiss={reset}>
      <ScrollView style={{ maxHeight: 560 }} keyboardShouldPersistTaps="handled">
        <Text variant="headline-md" className="mb-3">
          {mode === 'ball' ? 'Wicket' : 'Retire batter'}
        </Text>
        <View className="mb-3 flex-row gap-2">
          <Chip label="Dismissal" selected={mode === 'ball'} onPress={() => setMode('ball')} />
          <Chip label="Retire" selected={mode === 'retire'} onPress={() => setMode('retire')} />
        </View>

        {mode === 'ball' ? (
          <>
            <Text variant="micro-label" tone="muted" uppercase className="mb-2">
              How out
            </Text>
            <View className="mb-3 flex-row flex-wrap gap-2">
              {BALL_TYPES.map((t) => (
                <Chip
                  key={t.type}
                  label={t.label}
                  selected={type === t.type}
                  disabled={!allowedOnBall(t.type)}
                  onPress={() => setType(t.type)}
                />
              ))}
            </View>
            {(type === 'STUMPED' || type === 'RUN_OUT' || type === 'HIT_WICKET') && (
              <View className="mb-3 flex-row gap-2">
                <Chip
                  label="On a wide"
                  selected={onExtra === 'WIDE'}
                  onPress={() => setOnExtra(onExtra === 'WIDE' ? null : 'WIDE')}
                />
                {type === 'RUN_OUT' && (
                  <Chip
                    label="On a no-ball"
                    selected={onExtra === 'NO_BALL'}
                    onPress={() => setOnExtra(onExtra === 'NO_BALL' ? null : 'NO_BALL')}
                  />
                )}
              </View>
            )}
          </>
        ) : (
          <View className="mb-3 flex-row gap-2">
            <Chip
              label="Retired hurt"
              selected={retireKind === 'RETIRED_HURT'}
              onPress={() => setRetireKind('RETIRED_HURT')}
            />
            <Chip
              label="Retired out"
              selected={retireKind === 'RETIRED_OUT'}
              onPress={() => setRetireKind('RETIRED_OUT')}
            />
          </View>
        )}

        {chooseWho && (
          <>
            <Text variant="micro-label" tone="muted" uppercase className="mb-2">
              Who is out
            </Text>
            <View className="mb-3 flex-row gap-2">
              <Chip
                label={shortName(names(strikerId))}
                selected={outChoice === 'striker'}
                onPress={() => setOutChoice('striker')}
              />
              <Chip
                label={shortName(names(nonStrikerId))}
                selected={outChoice === 'non'}
                onPress={() => setOutChoice('non')}
              />
            </View>
          </>
        )}

        {mode === 'ball' && type === 'RUN_OUT' && (
          <>
            <Text variant="micro-label" tone="muted" uppercase className="mb-2">
              Runs completed
            </Text>
            <View className="mb-3 flex-row gap-2">
              {[0, 1, 2, 3].map((r) => (
                <Chip key={r} label={String(r)} selected={runs === r} onPress={() => setRuns(r)} />
              ))}
            </View>
          </>
        )}

        {mode === 'ball' && (type === 'CAUGHT' || type === 'RUN_OUT') && (
          <>
            <Text variant="micro-label" tone="muted" uppercase className="mb-2">
              Fielder
            </Text>
            <View className="mb-3 flex-row flex-wrap gap-2">
              {fielders.map((f) => (
                <Chip
                  key={f.id}
                  label={shortName(f.name)}
                  selected={fielder === f.id}
                  onPress={() => setFielder(f.id)}
                />
              ))}
            </View>
          </>
        )}

        {!(lastWicket && mode === 'ball') && (
          <>
            <Text variant="micro-label" tone="muted" uppercase className="mb-2">
              Incoming batter
            </Text>
            <View className="mb-3 flex-row flex-wrap gap-2">
              {incoming.map((b) => (
                <Chip
                  key={b.id}
                  label={shortName(b.name)}
                  selected={inc === b.id}
                  onPress={() => setInc(b.id)}
                />
              ))}
            </View>
            {mode === 'ball' && type === 'RUN_OUT' && (
              <View className="mb-3 flex-row gap-2">
                <Chip
                  label="New batter on strike"
                  selected={at === 'STRIKER'}
                  onPress={() => setAt(at === 'STRIKER' ? null : 'STRIKER')}
                />
                <Chip
                  label="At non-striker end"
                  selected={at === 'NON_STRIKER'}
                  onPress={() => setAt(at === 'NON_STRIKER' ? null : 'NON_STRIKER')}
                />
              </View>
            )}
          </>
        )}

        <Button
          label={mode === 'ball' ? 'Record wicket' : 'Record retirement'}
          variant="danger"
          full
          disabled={!valid}
          onPress={() =>
            onConfirm({
              type: actualType,
              playerOutId: outId,
              fielderId:
                mode === 'ball'
                  ? type === 'STUMPED'
                    ? keeperId
                    : type === 'CAUGHT' || type === 'RUN_OUT'
                      ? fielder
                      : null
                  : null,
              incomingBatterId: inc,
              incomingAt: at,
              runsOffBat: mode === 'ball' && type === 'RUN_OUT' ? runs : 0,
              onExtra: mode === 'ball' ? onExtra : null,
              retire: mode === 'retire',
            })
          }
        />
      </ScrollView>
    </AppBottomSheet>
  );
});
