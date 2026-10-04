import { useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  Text,
  Icon,
  Card,
  Button,
  SyncPill,
  StatusPill,
  TeamCrest,
  PlayerAvatar,
  RoleBadge,
  SegmentedTabs,
  Skeleton,
  EmptyState,
  AppBottomSheet,
  TextField,
  TempScreen,
} from '@/components/ui';

export default function DevKit() {
  const [tab, setTab] = useState<'a' | 'b'>('a');
  const [text, setText] = useState('');
  const sheetRef = useRef<BottomSheetModal>(null);

  if (!__DEV__) return null;

  return (
    <TempScreen title="UI Kit Showcase" back>
      <Card className="gap-3 p-4">
        <Text variant="title-sm">Typography</Text>
        <Text variant="display-score">102/3</Text>
        <Text variant="headline-lg">Headline Large</Text>
        <Text variant="headline-md">Headline Medium</Text>
        <Text variant="title-sm" tone="primary">
          Title Small (Primary)
        </Text>
        <Text variant="body-md">Body Medium text regular</Text>
        <Text variant="body-sm" tone="muted">
          Body Small muted
        </Text>
        <Text variant="caption">Caption text</Text>
        <Text variant="micro-label" uppercase>
          Micro Label
        </Text>
      </Card>

      <Card className="gap-3 p-4">
        <Text variant="title-sm">Pills & Badges</Text>
        <View className="flex-row flex-wrap gap-2">
          <SyncPill status="synced" />
          <SyncPill status="syncing" />
          <SyncPill status="offline" />
          <StatusPill status="live" />
          <StatusPill status="completed" />
          <StatusPill status="upcoming" />
          <RoleBadge role="BAT" />
          <RoleBadge role="BOWL" />
          <RoleBadge role="AR" />
          <RoleBadge role="WK" />
        </View>
      </Card>

      <Card className="gap-3 p-4">
        <Text variant="title-sm">Crests & Avatars</Text>
        <View className="flex-row items-center gap-3">
          <TeamCrest shortName="SJC" colour="#0D5C3A" size="sm" />
          <TeamCrest shortName="RXI" colour="#1E8E5A" size="md" />
          <TeamCrest shortName="NCC" colour="#F59E0B" size="lg" />
          <PlayerAvatar name="Rohit Sharma" role="BAT" />
          <PlayerAvatar name="Jasprit Bumrah" role="BOWL" />
        </View>
      </Card>

      <Card className="gap-3 p-4">
        <Text variant="title-sm">Buttons & Tabs</Text>
        <SegmentedTabs
          options={[
            { value: 'a', label: 'Summary' },
            { value: 'b', label: 'Scorecard' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Button label="Primary Button" icon="sports_cricket" />
        <Button label="Secondary Button" variant="secondary" icon="shield" />
        <Button
          label="Open Bottom Sheet"
          variant="ghost"
          onPress={() => sheetRef.current?.present()}
        />
      </Card>

      <Card className="gap-3 p-4">
        <Text variant="title-sm">Forms & Skeletons</Text>
        <TextField
          label="Sample Input"
          value={text}
          onChangeText={setText}
          placeholder="Type here..."
        />
        <Skeleton width="100%" height={24} />
      </Card>

      <EmptyState
        icon="sports_cricket"
        title="Empty Match State"
        body="No matches scheduled for today."
      />

      <AppBottomSheet ref={sheetRef}>
        <View className="gap-3">
          <Text variant="title-sm">Bottom Sheet Content</Text>
          <Text variant="body-sm" tone="muted">
            This bottom sheet matches the design system with radius 24 and smooth drag.
          </Text>
          <Button label="Close" onPress={() => sheetRef.current?.dismiss()} />
        </View>
      </AppBottomSheet>
    </TempScreen>
  );
}
