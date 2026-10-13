import { ScrollView, View } from 'react-native';
import { ActionTiles } from '@/components/home/ActionTiles';
import { HomeHeader } from '@/components/home/HomeHeader';
import { HomeHero } from '@/components/home/HomeHero';
import { LiveMatchCard } from '@/components/home/LiveMatchCard';
import { RecentResults } from '@/components/home/RecentResults';
import { StartMatchButton } from '@/components/home/StartMatchButton';
import { UpcomingCarousel } from '@/components/home/UpcomingCarousel';
import { useHomeLiveMatch } from '@/features/matches/useHomeLiveMatch';
import { STITCH_HOME_FIXTURES } from '@/fixtures/stitchHome';
import { env } from '@/lib/env';

export default function HomeDashboard() {
  const real = useHomeLiveMatch();
  const liveMatch = real ?? (env.useFixtures ? STITCH_HOME_FIXTURES.liveMatch : null);

  return (
    <View className="flex-1 bg-surface">
      <HomeHeader />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-28">
        <HomeHero />
        <View className="relative z-20 -mt-8 gap-5 px-margin">
          <StartMatchButton />
          {liveMatch ? <LiveMatchCard match={liveMatch} /> : null}
          <ActionTiles />
          <UpcomingCarousel />
          <RecentResults />
        </View>
      </ScrollView>
    </View>
  );
}
