'use client';

import { useGamification } from '@/contexts/gamification-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Flame, 
  Zap, 
  Crown, 
  Medal,
  Target
} from 'lucide-react';
import { useState } from 'react';

export function StreakCalendar() {
  const { streak, dailyGoal, dailyProgress } = useGamification();
  const [currentDate] = useState(new Date());

  // Generate calendar days (last 30 days)
  const generateCalendarDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      days.push(date);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  // Get day status (this is a simplified version - in a real app, you'd track actual study days)
  const getDayStatus = (date: Date) => {
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    // Simplified logic: assume user studied on days within their current streak
    if (diffDays < streak) {
      return 'studied';
    }
    
    // For demo purposes, randomly mark some past days as studied
    if (diffDays > 30 && Math.random() > 0.7) {
      return 'studied';
    }
    
    return 'missed';
  };

  // Get streak icon
  const getStreakIcon = () => {
    if (streak >= 30) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (streak >= 14) return <Medal className="h-6 w-6 text-purple-500" />;
    if (streak >= 7) return <Flame className="h-6 w-6 text-red-500" />;
    return <Zap className="h-6 w-6 text-orange-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Streak Summary */}
      <Card className="gamify-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStreakIcon()}
            Streak Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <p className="text-5xl font-bold text-primary">{streak}</p>
              <p className="text-muted-foreground">Day Streak</p>
            </div>
            <div className="w-full max-w-md">
              <div className="flex justify-between text-sm mb-1">
                <span>Today&apos;s Goal</span>
                <span>{dailyProgress}/{dailyGoal} min</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${Math.min((dailyProgress / dailyGoal) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <Badge variant="secondary" className="animate-streak">
              {dailyProgress >= dailyGoal ? '🎉 Goal Achieved!' : 'Keep going!'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card className="gamify-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Study Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={index} className="text-center text-xs text-muted-foreground py-2">
                {day}
              </div>
            ))}
            {calendarDays.map((date, index) => {
              const status = getDayStatus(date);
              const isToday = date.toDateString() === currentDate.toDateString();
              
              return (
                <div 
                  key={index}
                  className={`
                    aspect-square flex items-center justify-center text-xs rounded-md transition-all duration-300
                    ${isToday ? 'ring-2 ring-primary' : ''}
                    ${status === 'studied' 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                      : status === 'missed' 
                        ? 'bg-muted text-muted-foreground hover:bg-muted/80' 
                        : 'bg-background text-muted-foreground'}
                  `}
                >
                  {date.getDate()}
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-center gap-4 mt-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-primary rounded-sm"></div>
              <span className="text-xs text-muted-foreground">Studied</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-muted rounded-sm"></div>
              <span className="text-xs text-muted-foreground">Missed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak Milestones */}
      <Card className="gamify-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Streak Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-orange-500" />
                <div>
                  <h3 className="font-medium">Warm-Up</h3>
                  <p className="text-xs text-muted-foreground">Three days running</p>
                </div>
              </div>
              <Badge variant={streak >= 3 ? 'default' : 'secondary'}>
                {streak >= 3 ? 'Achieved' : 'Pending'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Flame className="h-5 w-5 text-red-500" />
                <div>
                  <h3 className="font-medium">Full Week</h3>
                  <p className="text-xs text-muted-foreground">A solid week of studying</p>
                </div>
              </div>
              <Badge variant={streak >= 7 ? 'default' : 'secondary'}>
                {streak >= 7 ? 'Achieved' : 'Pending'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Medal className="h-5 w-5 text-purple-500" />
                <div>
                  <h3 className="font-medium">Fortnight</h3>
                  <p className="text-xs text-muted-foreground">Two weeks without a miss</p>
                </div>
              </div>
              <Badge variant={streak >= 14 ? 'default' : 'secondary'}>
                {streak >= 14 ? 'Achieved' : 'Pending'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-yellow-500" />
                <div>
                  <h3 className="font-medium">Unstoppable</h3>
                  <p className="text-xs text-muted-foreground">A full month — you earned this one</p>
                </div>
              </div>
              <Badge variant={streak >= 30 ? 'default' : 'secondary'}>
                {streak >= 30 ? 'Achieved' : 'Pending'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}