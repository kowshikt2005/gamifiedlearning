'use client';

import { useGamification } from '@/contexts/gamification-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Trophy, 
  Target, 
  Star,
  CheckCircle,
  Flame,
  Crown,
  Medal
} from 'lucide-react';
import { useState } from 'react';

export function ChallengeCenter() {
  const gamification = useGamification();
  const [startedChallenges, setStartedChallenges] = useState<Record<string, boolean>>({});

  // Get challenge difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'hard': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Get challenge difficulty icon
  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return <Zap className="h-4 w-4" />;
      case 'medium': return <Target className="h-4 w-4" />;
      case 'hard': return <Flame className="h-4 w-4" />;
      default: return null;
    }
  };

  // Start a challenge (doesn't complete it immediately)
  const startChallenge = (challengeId: string) => {
    setStartedChallenges(prev => ({ ...prev, [challengeId]: true }));
  };

  // Complete a challenge (called when actual requirements are met)
  const handleCompleteChallenge = (challengeId: string) => {
    // Challenges are now handled automatically by the gamification service
    // This is just for UI feedback
    setStartedChallenges(prev => {
      const newStarted = { ...prev };
      delete newStarted[challengeId];
      return newStarted;
    });
  };

  return (
    <div className="space-y-6">
      {/* Challenge Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="gamify-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Challenges</p>
                <p className="text-2xl font-bold">{gamification.stats?.challenges.length || 0}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="gamify-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{gamification.stats?.challenges.filter(c => c.completed).length || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="gamify-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points Earned</p>
                <p className="text-2xl font-bold">
                  {gamification.stats?.challenges.filter(c => c.completed).reduce((sum, c) => sum + c.reward, 0) || 0}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Challenges */}
      <Card className="gamify-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Available Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(gamification.stats?.challenges || []).map(challenge => (
              <div 
                key={challenge.id} 
                className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                  challenge.completed 
                    ? 'border-green-500 bg-green-500/5' 
                    : 'border-muted hover:border-primary/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{challenge.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{challenge.name}</h3>
                        {challenge.difficulty && (
                          <Badge 
                            variant="secondary" 
                            className={`${getDifficultyColor(challenge.difficulty || '')} flex items-center gap-1`}
                          >
                            {getDifficultyIcon(challenge.difficulty || '')}
                            {challenge.difficulty?.charAt(0).toUpperCase() + challenge.difficulty?.slice(1)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium">+{challenge.reward} points</span>
                      </div>
                    </div>
                  </div>
                  {challenge.completed ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : startedChallenges[challenge.id] ? (
                    <Button
                      size="sm"
                      onClick={() => handleCompleteChallenge(challenge.id)}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      Complete
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => startChallenge(challenge.id)}
                      className="animate-pulse"
                    >
                      Start
                    </Button>
                  )}
                </div>
                {challenge.completed && challenge.completedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Completed on {challenge.completedAt.toLocaleDateString()}
                  </p>
                )}
                {startedChallenges[challenge.id] && !challenge.completed && (
                  <p className="text-xs text-primary mt-2">
                    Challenge started! Complete the requirements to earn points.
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Challenge Tips */}
      <Card className="gamify-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Challenge Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Medal className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium">Start with Easy Challenges</h3>
                <p className="text-sm text-muted-foreground">Build momentum by completing easier challenges first.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Flame className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <h3 className="font-medium">Focus on One Challenge</h3>
                <p className="text-sm text-muted-foreground">Concentrate on completing one challenge at a time for better results.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h3 className="font-medium">Track Your Progress</h3>
                <p className="text-sm text-muted-foreground">Regularly check your challenge completion stats to stay motivated.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}