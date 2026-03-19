'use client';

import { useGamification } from '@/contexts/gamification-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  Zap,
  Star,
  Flame,
  Target,
  Medal,
  Rocket,
  Crown,
  CheckCircle,
  Circle,
  Coins
} from 'lucide-react';
import { useState } from 'react';
import { ProgressVisualization } from './progress-visualization';
import { StreakCalendar } from './streak-calendar';
import { useToast } from '@/hooks/use-toast';

export function GamificationDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  const gamification = useGamification();

  const getLevelProgress = () => {
    const pointsNeededForCurrentLevel = 100 + (gamification.level - 1) * 50;
    const pointsInCurrentLevel = gamification.points % pointsNeededForCurrentLevel;
    return pointsInCurrentLevel;
  };

  const getLevelProgressPercentage = () => {
    const pointsNeededForCurrentLevel = 100 + (gamification.level - 1) * 50;
    return (getLevelProgress() / pointsNeededForCurrentLevel) * 100;
  };

  const getStreakIcon = () => {
    if (gamification.streak >= 30) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (gamification.streak >= 14) return <Medal className="h-6 w-6 text-purple-500" />;
    if (gamification.streak >= 7) return <Flame className="h-6 w-6 text-red-500" />;
    if (gamification.streak >= 3) return <Zap className="h-6 w-6 text-orange-500" />;
    return <Circle className="h-6 w-6 text-gray-400" />;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'hard': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleBuyPowerUp = (powerUpId: string, powerUpName: string) => {
    const success = gamification.buyPowerUp(powerUpId);
    if (success) {
      toast({
        title: "Power-up activated!",
        description: `${powerUpName} is now active. (-100 pts)`,
      });
    } else {
      toast({
        title: "Not enough points",
        description: "You need 100 points to buy a power-up.",
        variant: "destructive",
      });
    }
  };

  // Rarity counts for collection tab
  const rarityCounts = {
    common: gamification.badges.filter(b => b.earned && b.rarity === 'common').length,
    rare: gamification.badges.filter(b => b.earned && b.rarity === 'rare').length,
    epic: gamification.badges.filter(b => b.earned && b.rarity === 'epic').length,
    legendary: gamification.badges.filter(b => b.earned && b.rarity === 'legendary').length,
  };

  const earnedBadges = gamification.badges.filter(b => b.earned);
  const earnedAchievements = gamification.achievements.filter(a => a.earned);

  return (
    <div className="space-y-6">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="gamify-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Level</p>
                <p className="text-2xl font-bold">{gamification.level}</p>
              </div>
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <Progress value={getLevelProgressPercentage()} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{getLevelProgress()}/{100 + (gamification.level - 1) * 50} XP</p>
          </CardContent>
        </Card>

        <Card className="gamify-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points</p>
                <p className="text-2xl font-bold">{gamification.points}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="gamify-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Streak</p>
                <p className="text-2xl font-bold">{gamification.streak}</p>
              </div>
              {getStreakIcon()}
            </div>
          </CardContent>
        </Card>

        <Card className="gamify-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Daily Goal</p>
                <p className="text-2xl font-bold">{gamification.dailyProgress}/{gamification.dailyGoal}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={(gamification.dailyProgress / gamification.dailyGoal) * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* 4 Tabs */}
      <div className="flex space-x-1 bg-muted rounded-lg p-1">
        {(['overview', 'collection', 'quests', 'progress'] as const).map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            className="flex-1 capitalize"
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">

        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Recently Earned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {earnedBadges.slice(0, 3).map(badge => (
                    <div key={badge.id} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                      <span className="text-2xl">{badge.icon}</span>
                      <div>
                        <p className="font-medium">{badge.name}</p>
                        <p className="text-sm text-muted-foreground">{badge.description}</p>
                      </div>
                    </div>
                  ))}
                  {earnedAchievements.slice(0, 2).map(achievement => (
                    <div key={achievement.id} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                      <span className="text-2xl">{achievement.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium">{achievement.name}</p>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      </div>
                      <Badge variant="secondary">+{achievement.points} pts</Badge>
                    </div>
                  ))}
                  {earnedBadges.length === 0 && earnedAchievements.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">Nothing here yet — start a session to get your first one.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Active Quests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gamification.quests.filter(q => !q.completed).slice(0, 3).map(quest => (
                    <div key={quest.id} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{quest.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium">{quest.name}</p>
                          <p className="text-sm text-muted-foreground">{quest.description}</p>
                        </div>
                        <Badge variant="secondary">+{quest.reward} pts</Badge>
                      </div>
                      <Progress value={(quest.progress / quest.target) * 100} />
                      <p className="text-xs text-muted-foreground text-right">{quest.progress}/{quest.target}</p>
                    </div>
                  ))}
                  {gamification.quests.filter(q => !q.completed).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No active quests right now.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── COLLECTION TAB (Badges + Achievements) ─── */}
        {activeTab === 'collection' && (
          <div className="space-y-6">
            {/* Badges Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Medal className="h-5 w-5" />
                  Badges
                  <Badge variant="secondary" className="ml-auto">{earnedBadges.length}/{gamification.badges.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {gamification.badges.map(badge => (
                    <div
                      key={badge.id}
                      className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-300 ${
                        badge.earned
                          ? 'border-primary bg-primary/5 hover:shadow-lg'
                          : 'border-muted opacity-50'
                      }`}
                    >
                      <span className="text-3xl mb-2">{badge.icon}</span>
                      <h3 className="font-medium text-center text-sm">{badge.name}</h3>
                      <p className="text-xs text-muted-foreground text-center mt-1">{badge.description}</p>
                      <Badge
                        variant={badge.earned ? 'default' : 'secondary'}
                        className="mt-2 text-xs"
                      >
                        {badge.earned
                          ? (badge.rarity ? badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1) : 'Earned')
                          : 'Locked'
                        }
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Achievements List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Achievements
                  <Badge variant="secondary" className="ml-auto">{earnedAchievements.length}/{gamification.achievements.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gamification.achievements.map(achievement => (
                    <div
                      key={achievement.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${
                        achievement.earned
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-muted opacity-60'
                      }`}
                    >
                      <span className="text-2xl">{achievement.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-medium">{achievement.name}</h3>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      </div>
                      <Badge variant={achievement.earned ? 'default' : 'secondary'} className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {achievement.points}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rarity Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Rarity Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="w-3 h-3 bg-gray-400 rounded-full mx-auto mb-1"></div>
                    <p className="text-lg font-bold">{rarityCounts.common}</p>
                    <p className="text-xs text-muted-foreground">Common</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-500/5">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-1"></div>
                    <p className="text-lg font-bold">{rarityCounts.rare}</p>
                    <p className="text-xs text-muted-foreground">Rare</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-500/5">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mx-auto mb-1"></div>
                    <p className="text-lg font-bold">{rarityCounts.epic}</p>
                    <p className="text-xs text-muted-foreground">Epic</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-yellow-500/5">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mx-auto mb-1"></div>
                    <p className="text-lg font-bold">{rarityCounts.legendary}</p>
                    <p className="text-xs text-muted-foreground">Legendary</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── QUESTS TAB (Quests + Challenges + Power-ups) ─── */}
        {activeTab === 'quests' && (
          <div className="space-y-6">
            {/* Active Quests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Active Quests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {gamification.quests.filter(q => !q.completed).map(quest => (
                    <div key={quest.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{quest.icon}</span>
                          <div className="flex-1">
                            <h3 className="font-medium">{quest.name}</h3>
                            <p className="text-sm text-muted-foreground">{quest.description}</p>
                            <Progress value={(quest.progress / quest.target) * 100} className="mt-2" />
                            <p className="text-xs text-muted-foreground mt-1">{quest.progress}/{quest.target}</p>
                          </div>
                        </div>
                        <Badge variant="secondary">+{quest.reward} pts</Badge>
                      </div>
                    </div>
                  ))}
                  {gamification.quests.filter(q => !q.completed).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No active quests right now.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Challenges */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5" />
                  Challenges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gamification.challenges.map(challenge => (
                    <div
                      key={challenge.id}
                      className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                        challenge.completed
                          ? 'border-green-500 bg-green-500/5'
                          : 'border-muted hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{challenge.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{challenge.name}</h3>
                            {challenge.difficulty && (
                              <Badge
                                variant="secondary"
                                className={`${getDifficultyColor(challenge.difficulty)} text-xs`}
                              >
                                {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              <span className="text-xs font-medium">+{challenge.reward} pts</span>
                            </div>
                            {challenge.completed && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Power-ups */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Power-ups
                  <span className="ml-auto text-sm font-normal text-muted-foreground flex items-center gap-1">
                    <Coins className="h-3 w-3 text-yellow-500" />
                    {gamification.points} pts available
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gamification.powerUps.map(powerUp => (
                    <div
                      key={powerUp.id}
                      className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                        powerUp.active
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-muted'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{powerUp.icon}</span>
                          <div>
                            <h3 className="font-medium">{powerUp.name}</h3>
                            <p className="text-sm text-muted-foreground">{powerUp.description}</p>
                            {powerUp.active && powerUp.endTime && (
                              <p className="text-xs text-yellow-600 mt-1">
                                Active until {powerUp.endTime.toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleBuyPowerUp(powerUp.id, powerUp.name)}
                          disabled={powerUp.active || gamification.points < 100}
                          className={powerUp.active ? 'opacity-50' : ''}
                        >
                          {powerUp.active ? 'Active' : '100 pts'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Completed Quests */}
            {gamification.quests.filter(q => q.completed).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {gamification.quests.filter(q => q.completed).map(quest => (
                      <div key={quest.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <span className="text-xl">{quest.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium">{quest.name}</p>
                          <p className="text-sm text-muted-foreground">{quest.description}</p>
                        </div>
                        <Badge variant="default">+{quest.reward} pts</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ─── PROGRESS TAB (Progress + Streak) ─── */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <ProgressVisualization />
            <StreakCalendar />
          </div>
        )}
      </div>
    </div>
  );
}
