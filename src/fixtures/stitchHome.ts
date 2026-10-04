export const STITCH_HOME_FIXTURES = {
  user: {
    name: 'Coach Alex',
    subtitle: "Round 4 fixture active • Lord's Oval Pitch 2",
    syncText: 'All matches synced • 2m ago',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida/AEtjO1UU3EPE9DsiiMa7nTEt9w5wQ1a_yO38WFv82wvvYNFT3ehezj-XNMwCEZkixLhbiN4_V7m8KHd9eCatAcL7bcJs1sF8GiIoc2CaKSNreiVPNEPYPajrq0ztOfGbxtnkvbWubOtaWXuIC4JKEOhZkMh-U5Om-d4m6OPGMhCVKezuWwYkvdaRUFL5KQGp5bXdKORftrbg6z8EmjuiBTFelLyEqsmW4joNLpug1DJOgsDlOeJk8wh6xUqIqw',
  },
  liveMatch: {
    id: 'live-1',
    tournament: "T20 Club Premier • Round 4 • Lord's Oval",
    status: 'LIVE' as const,
    team1: {
      name: 'Northwood CC',
      shortName: 'NCC',
      colour: '#0d5c3a',
      score: '102/3',
      overs: '14.2 / 20 ov',
      isBatting: true,
      target: 'Target 149',
    },
    team2: {
      name: 'Riverside XI',
      shortName: 'RXI',
      colour: '#213145',
      score: '148/7',
      overs: '20.0 ov',
      isBatting: false,
      subtext: 'Innings Completed',
    },
    situation: {
      runsNeeded: 'Need 47 runs off 34 balls',
      rrr: '8.29',
      crr: '7.12',
    },
    batters: [
      { name: 'R. Sharma', runs: '42*', balls: '29' },
      { name: 'M. Ali', runs: '18', balls: '12' },
    ],
  },
  quickTiles: [
    {
      title: 'My Teams',
      subtitle: '4 Clubs • 48 Players',
      icon: 'shield' as const,
      color: '#004328',
      route: '/(app)/(tabs)/teams' as const,
    },
    {
      title: 'My Stats',
      subtitle: 'Records & Ladders',
      icon: 'bar_chart' as const,
      color: '#855300',
      route: '/(app)/(tabs)/stats' as const,
    },
  ],
  upcoming: [
    {
      id: 'up-1',
      date: 'Tomorrow, 2:00 PM',
      format: 'T20',
      venue: 'City Oval, Pitch 1',
      teamA: { name: 'Greenwood', shortName: 'GS', colour: '#8ed6aa' },
      teamB: { name: 'Royals CC', shortName: 'RCC', colour: '#d3e4fe' },
    },
    {
      id: 'up-2',
      date: 'Sat, 10:30 AM',
      format: 'ODI 40ov',
      venue: 'Brampton Reserve',
      teamA: { name: 'Northwood', shortName: 'NCC', colour: '#0d5c3a' },
      teamB: { name: 'Highland XI', shortName: 'HT', colour: '#cbdbf5' },
    },
  ],
  recentResults: [
    {
      id: 'res-1',
      statement: 'St. Jude won by 23 runs',
      date: 'Sun, Oct 12',
      teamA: {
        name: 'St. Jude CC',
        shortName: 'SJ',
        colour: '#004328',
        score: '165/6',
        overs: '(20.0 ov)',
      },
      teamB: {
        name: 'Valley Titans',
        shortName: 'VT',
        colour: '#213145',
        score: '142/9',
        overs: '(20.0 ov)',
      },
      potm: 'L. Wright (64 off 38)',
    },
  ],
};
