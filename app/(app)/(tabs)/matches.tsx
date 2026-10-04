// TEMP-UI: replace with Stitch design (LOCK-03)
import { EmptyState, TempScreen } from '@/components/ui';

export default function MatchesTab() {
  return (
    <TempScreen title="Matches">
      <EmptyState
        icon="scoreboard"
        title="No Live Matches"
        body="Matches and live scoring will be available in Phase 2."
      />
    </TempScreen>
  );
}
