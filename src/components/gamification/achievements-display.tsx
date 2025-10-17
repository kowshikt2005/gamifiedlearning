'use client';

import { useGamification } from '@/contexts/gamification-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Crown, 
  Medal, 
  Star,
  Zap,
  Target,
  Rocket,
  Flame
} from 'lucide-react';

export function AchievementsDisplay() {
  const gamification = useGamification();

  // Get earned badges and achievements
  const earnedBadges = gamification.stats?.badges.filter(badge => badge.earned) || [];
  const earnedAchievements = gamification.stats?.achievements.filter(achievement => achievement.earned) || [];

  // Get badge rarity counts
  const badges = gamification.stats?.badges || [];
  const rarityCounts = {
    common: badges.filter(b => b.earned && b.rarity === 'common').length,
    rare: badges.filter(b => b.earned && b.rarity === 'rare').length,
    epic: badges.filter(b => b.earned && b.rarity === 'epic').length,
    legendary: badges.filter(b => b.earned && b.rarity === 'legendary').length,
  };

  // Get streak icon
  const getStreakIcon = () => {
    const streak = gamification.stats?.streak.currentStreak || 0;
    if (streak >= 30) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (streak >= 14) return <Medal className="h-5 w-5 text-purple-500" />;
    if (streak >= 7) return <Flame className="h-5 w-5 text-red-500" />;
    if (streak >= 3) return <Zap className="h-5 w-5 text-orange-500" />;
    return <Star className="h-5 w-5 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Level and Streak Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="gamify-card animate-levelUp">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Rocket className="h-5 w-5 text-primary" />
              Level Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{gamification.stats?.level || 1}</p>
                <p className="text-sm text-muted-foreground">Current Level</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{gamification.stats?.streak.currentStreak || 0}</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">Day Streak</span>
                  {getStreakIcon()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gamify-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Collection Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-primary/5 rounded-lg">
                <p className="text-xl font-bold">{earnedBadges.length}</p>
                <p className="text-xs text-muted-foreground">Badges</p>
              </div>
              <div className="text-center p-2 bg-accent/5 rounded-lg">
                <p className="text-xl font-bold">{earnedAchievements.length}</p>
                <p className="text-xs text-muted-foreground">Achievements</p>
              </div>
              <div className="text-center p-2 bg-yellow-500/10 rounded-lg">
                <p className="text-xl font-bold">{rarityCounts.rare + rarityCounts.epic + rarityCounts.legendary}</p>
                <p className="text-xs text-muted-foreground">Rare Items</p>
              </div>
              <div className="text-center p-2 bg-purple-500/10 rounded-lg">
                <p className="text-xl font-bold">{rarityCounts.legendary}</p>
                <p className="text-xs text-muted-foreground">Legendary</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recently Earned Badges */}
      {earnedBadges.length > 0 && (
        <Card className="gamify-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5" />
              Recently Earned Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {earnedBadges.slice(-8).map(badge => (
                <div 
                  key={badge.id} 
                  className="flex flex-col items-center p-3 rounded-lg border bg-background hover:shadow-md transition-all duration-300 animate-popIn"
                >
                  <span className="text-2xl mb-1">{badge.icon}</span>
                  <h3 className="font-medium text-sm text-center">{badge.name}</h3>
                  <Badge 
                    variant="secondary" 
                    className="mt-1 text-xs"
                  >
                    {badge.rarity ? badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1) : 'Common'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recently Unlocked Achievements */}
      {earnedAchievements.length > 0 && (
        <Card className="gamify-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Recently Unlocked Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {earnedAchievements.slice(-3).map(achievement => (
                <div 
                  key={achievement.id} 
                  className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:shadow-md transition-all duration-300 animate-popIn"
                >
                  <span className="text-2xl">{achievement.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-medium">{achievement.name}</h3>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                  <Badge variant="default" className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-500" />
                    {achievement.points}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rarity Collection Progress */}
      <Card className="gamify-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Collection Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-sm">Common</span>
              </div>
              <span className="text-sm font-medium">{rarityCounts.common}/{badges.filter(b => b.rarity === 'common').length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Rare</span>
              </div>
              <span className="text-sm font-medium">{rarityCounts.rare}/{badges.filter(b => b.rarity === 'rare').length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm">Epic</span>
              </div>
              <span className="text-sm font-medium">{rarityCounts.epic}/{badges.filter(b => b.rarity === 'epic').length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Legendary</span>
              </div>
              <span className="text-sm font-medium">{rarityCounts.legendary}/{badges.filter(b => b.rarity === 'legendary').length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}