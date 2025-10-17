'use client';

import { useGamification } from '@/contexts/gamification-context';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Zap, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PowerUpActivator() {
  const gamification = useGamification();
  const { toast } = useToast();

  const handleBuyPowerUp = async (powerUpId: string, powerUpName: string) => {
    const success = await gamification.purchasePowerUp(powerUpId);
    if (success) {
      toast({
        title: "Power-up Purchased! ✨",
        description: `${powerUpName} activated!`,
      });
    } else {
      toast({
        title: "Purchase Failed 💸",
        description: "Unable to purchase power-up. Check your points balance.",
        variant: "destructive",
      });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <Zap className="h-4 w-4 text-yellow-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-medium leading-none">Power-ups & Boosters</h4>
          <p className="text-sm text-muted-foreground">
            Activate power-ups to enhance your study session
          </p>
          <div className="space-y-3">
            {gamification.availablePowerUps.map(powerUp => {
              const isActive = gamification.hasActivePowerUp(powerUp.effect);
              const canAfford = (gamification.stats?.points || 0) >= powerUp.cost;
              
              return (
              <div 
                key={powerUp.id} 
                className={`p-3 rounded-lg border ${
                  isActive 
                    ? 'border-yellow-500 bg-yellow-500/10' 
                    : 'border-muted'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{powerUp.icon}</span>
                    <div>
                      <h3 className="font-medium">{powerUp.name}</h3>
                      <p className="text-sm text-muted-foreground">{powerUp.description}</p>
                      {isActive && (
                        <p className="text-xs text-yellow-600 mt-1">
                          Currently Active
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleBuyPowerUp(powerUp.id, powerUp.name)}
                      disabled={isActive || !canAfford || gamification.isLoading}
                      className={(!canAfford || isActive) ? 'opacity-50' : ''}
                    >
                      {isActive ? 'Active' : canAfford ? (
                        <div className="flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          <span>Buy ({powerUp.cost})</span>
                        </div>
                      ) : 'Need Points'}
                    </Button>
                    {!canAfford && !isActive && (
                      <span className="text-xs text-red-500">Need {powerUp.cost - (gamification.stats?.points || 0)} more points</span>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3" />
              <span>Power-ups cost 100 points each</span>
            </div>
            <div className="flex items-center gap-1">
              <Coins className="h-3 w-3 text-yellow-500" />
              <span className="font-medium">{gamification.stats?.points || 0} points</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}