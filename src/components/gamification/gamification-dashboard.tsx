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
  Circle
} from 'lucide-react';
import { useState } from 'react';
import { ProgressVisualization } from './progress-visualization';
import { AchievementsDisplay } from './achievements-display';
import { ChallengeCenter } from './challenge-center';
import { StreakCalendar } from './streak-calendar';

export function GamificationDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const gamification = useGamification();

  // Handle loading and error states
  if (gamification.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (gamification.error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load gamification data</p>
          <button 
            onClick={gamification.refreshStats}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!gamification.stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">No gamification data available</p>
      </div>
    );
  }

  const { stats } = gamification;
  const levelProgress = gamification.calculateLevelProgress();

  const getStreakIcon = () => {
    const streak = stats.streak.currentStreak;
    if (streak >= 30) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (streak >= 14) return <Medal className="h-6 w-6 text-purple-500" />;
    if (streak >= 7) return <Flame className="h-6 w-6 text-red-500" />;
    if (streak >= 3) return <Zap className="h-6 w-6 text-orange-500" />;
    return <Circle className="h-6 w-6 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="gamify-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Level</p>
                <p className="text-2xl font-bold">{stats.level}</p>
              </div>
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <Progress value={levelProgress.percentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{levelProgress.current}/{levelProgress.current + levelProgress.needed} XP</p>
          </CardContent>
        </Card>
        
        <Card className="gamify-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points</p>
                <p className="text-2xl font-bold">{stats.points}</p>
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
                <p className="text-2xl font-bold">{stats.streak.currentStreak}</p>
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
                <p className="text-2xl font-bold">{stats.dailyProgress}/{stats.dailyGoal}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={(stats.dailyProgress / stats.dailyGoal) * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted rounded-lg p-1">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          className="flex-1"
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </Button>
        <Button
          variant={activeTab === 'badges' ? 'default' : 'ghost'}
          className="flex-1"
          onClick={() => setActiveTab('badges')}
        >
          Badges
        </Button>
        <Button
          variant={activeTab === 'quests' ? 'default' : 'ghost'}
          className="flex-1"
          onClick={() => setActiveTab('quests')}
        >
          Quests
        </Button>
        <Button
          variant={activeTab === 'powerups' ? 'default' : 'ghost'}
          className="flex-1"
          onClick={() => setActiveTab('powerups')}
        >
          Power-ups
        </Button>
        <Button
          variant={activeTab === 'progress' ? 'default' : 'ghost'}
          className="flex-1"
          onClick={() => setActiveTab('progress')}
        >
          Progress
        </Button>
        <Button
          variant={activeTab === 'achievements' ? 'default' : 'ghost'}
          className="flex-1"
          onClick={() => setActiveTab('achievements')}
        >
          Achievements
        </Button>
        <Button
          variant={activeTab === 'challenges' ? 'default' : 'ghost'}
          className="flex-1"
          onClick={() => setActiveTab('challenges')}
        >
          Challenges
        </Button>
        <Button
          variant={activeTab === 'streak' ? 'default' : 'ghost'}
          className="flex-1"
          onClick={() => setActiveTab('streak')}
        >
          Streak
        </Button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gamification.recentAchievements.slice(0, 3).map(achievement => (
                    <div key={achievement.id} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                      <span className="text-2xl">{achievement.icon}</span>
                      <div>
                        <p className="font-medium">{achievement.name}</p>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      </div>
                    </div>
                  ))}
                  {gamification.recentAchievements.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No achievements yet. Start studying to earn your first achievement!</p>
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
                  {gamification.activeQuests.slice(0, 3).map(quest => (
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
                  {gamification.activeQuests.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No active quests. Complete challenges to unlock new ones!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'badges' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="h-5 w-5" />
                Achievement Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.badges.map(badge => (
                  <div 
                    key={badge.id} 
                    className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-300 ${
                      badge.earned 
                        ? 'border-primary bg-primary/5 hover:shadow-lg' 
                        : 'border-muted opacity-50'
                    }`}
                  >
                    <span className="text-3xl mb-2">{badge.icon}</span>
                    <h3 className="font-medium text-center">{badge.name}</h3>
                    <p className="text-xs text-muted-foreground text-center mt-1">{badge.description}</p>
                    {badge.earned ? (
                      <Badge variant="default" className="mt-2">Earned</Badge>
                    ) : (
                      <Badge variant="secondary" className="mt-2">Locked</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'quests' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Active Quests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {gamification.activeQuests.map(quest => (
                    <div key={quest.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{quest.icon}</span>
                          <div>
                            <h3 className="font-medium">{quest.name}</h3>
                            <p className="text-sm text-muted-foreground">{quest.description}</p>
                            <Progress value={(quest.progress / quest.target) * 100} className="mt-2" />
                            <p className="text-xs text-muted-foreground mt-1">{quest.progress}/{quest.target} completed</p>
                          </div>
                        </div>
                        <Badge variant="secondary">+{quest.reward} pts</Badge>
                      </div>
                    </div>
                  ))}
                  {gamification.activeQuests.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No active quests. Complete challenges to unlock new ones!</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Completed Quests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.quests.filter(q => q.completed).map(quest => (
                    <div key={quest.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <span className="text-xl">{quest.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium">{quest.name}</p>
                        <p className="text-sm text-muted-foreground">{quest.description}</p>
                      </div>
                      <Badge variant="default">+{quest.reward} pts</Badge>
                    </div>
                  ))}
                  {stats.quests.filter(q => q.completed).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No completed quests yet. Keep studying to unlock achievements!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'powerups' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Power-ups & Boosters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gamification.availablePowerUps.map(powerUp => {
                  const isActive = gamification.hasActivePowerUp(powerUp.effect);
                  const canAfford = stats.points >= powerUp.cost;
                  
                  return (
                    <div 
                      key={powerUp.id} 
                      className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                        isActive 
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
                            <p className="text-xs text-muted-foreground mt-1">Cost: {powerUp.cost} points</p>
                            {isActive && (
                              <p className="text-xs text-yellow-600 mt-1">Currently Active</p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => gamification.purchasePowerUp(powerUp.id)}
                          disabled={isActive || !canAfford || gamification.isLoading}
                          className={(!canAfford || isActive) ? 'opacity-50' : ''}
                        >
                          {isActive ? 'Active' : canAfford ? 'Buy' : 'Need Points'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeTab === 'progress' && (
          <ProgressVisualization />
        )}
        
        {activeTab === 'achievements' && (
          <AchievementsDisplay />
        )}
        
        {activeTab === 'challenges' && (
          <ChallengeCenter />
        )}
        
        {activeTab === 'streak' && (
          <StreakCalendar />
        )}
      </div>
    </div>
  );
}