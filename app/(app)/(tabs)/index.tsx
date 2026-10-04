import { ScrollView, View } from 'react-native';
import { ActionTiles } from '@/components/home/ActionTiles';
import { HomeHeader } from '@/components/home/HomeHeader';
import { HomeHero } from '@/components/home/HomeHero';
import { LiveMatchCard } from '@/components/home/LiveMatchCard';
import { RecentResults } from '@/components/home/RecentResults';
import { StartMatchButton } from '@/components/home/StartMatchButton';
import { UpcomingCarousel } from '@/components/home/UpcomingCarousel';

export default function HomeDashboard() {
  return (
    <View className="flex-1 bg-surface">
      <HomeHeader />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-28">
        <HomeHero />
        <View className="relative z-20 -mt-8 gap-5 px-margin">
          <StartMatchButton />
          <LiveMatchCard />
          <ActionTiles />
          <UpcomingCarousel />
          <RecentResults />
        </View>
      </ScrollView>
    </View>
  );
}
