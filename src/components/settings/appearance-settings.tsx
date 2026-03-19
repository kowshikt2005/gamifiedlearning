'use client';

import { useTheme, WALLPAPERS, type ThemeMode } from '@/contexts/theme-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppearanceSettings() {
  const { mode, setMode, wallpaper, setWallpaper } = useTheme();

  const modes: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
    { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> },
  ];

  const categories = [
    { key: 'solid' as const, label: 'Solid' },
    { key: 'gradient' as const, label: 'Gradients' },
    { key: 'pattern' as const, label: 'Patterns' },
    { key: 'mesh' as const, label: 'Mesh' },
  ];

  return (
    <div className="space-y-6 p-1">
      {/* Mode Toggle */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Mode</Label>
        <div className="grid grid-cols-3 gap-2">
          {modes.map(m => (
            <Button
              key={m.value}
              variant={mode === m.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode(m.value)}
              className="flex items-center gap-2"
            >
              {m.icon}
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Wallpaper Picker */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Background</Label>

        {categories.map(cat => {
          const options = WALLPAPERS.filter(w => w.category === cat.key);
          if (options.length === 0) return null;

          return (
            <div key={cat.key} className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{cat.label}</p>
              <div className="grid grid-cols-4 gap-2">
                {options.map(wp => (
                  <button
                    key={wp.id}
                    onClick={() => setWallpaper(wp.id)}
                    title={wp.name}
                    className={cn(
                      'relative h-12 rounded-lg border-2 transition-all duration-200 hover:scale-105 overflow-hidden',
                      wallpaper === wp.id
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border hover:border-primary/50'
                    )}
                    style={{ background: wp.preview }}
                  >
                    {wallpaper === wp.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-md">
                        <Check className="h-4 w-4 text-white drop-shadow-md" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
