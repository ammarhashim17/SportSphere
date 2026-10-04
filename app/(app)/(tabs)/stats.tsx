// TEMP-UI: replace with Stitch design (LOCK-03)
import { EmptyState, TempScreen } from '@/components/ui';

export default function StatsTab() {
  return (
    <TempScreen title="Statistics">
      <EmptyState
        icon="bar_chart"
        title="Statistics Overview"
        body="Player and team career stats, leaderboards, and wagon wheels will be available in Phase 3."
      />
    </TempScreen>
  );
}
