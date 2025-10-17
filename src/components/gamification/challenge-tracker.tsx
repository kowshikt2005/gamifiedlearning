'use client';

import { useGamification } from '@/contexts/gamification-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Rocket, 
  Target
} from 'lucide-react';

export function ChallengeTracker() {
  const gamification = useGamification();
  


  return (
    <div className="space-y-6">
      <Card className="gamify-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Interactive Study Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(gamification.stats?.challenges || []).map(challenge => (
              <div 
                key={challenge.id} 
                className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                  challenge.completed 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{challenge.icon}</span>
                    <div>
                      <h3 className="font-medium">{challenge.name}</h3>
                      <p className="text-sm text-muted-foreground">{challenge.description}</p>
                    </div>
                  </div>
                  <Badge variant={challenge.completed ? "default" : "secondary"}>
                    {challenge.completed ? 'Completed' : `+${challenge.reward} pts`}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card className="gamify-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Active Quests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(gamification.stats?.quests || []).filter(q => !q.completed).map(quest => (
              <div key={quest.id} className="p-4 rounded-lg border-2 border-muted hover:border-primary/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{quest.icon}</span>
                    <div className="flex-1">
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
            {(gamification.stats?.quests || []).filter(q => !q.completed).length === 0 && (
              <p className="text-muted-foreground text-center py-4">No active quests. Complete challenges to unlock new ones!</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}