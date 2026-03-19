'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface WallpaperOption {
  id: string;
  name: string;
  preview: string; // small CSS preview for the picker
  css: string;     // full CSS applied to the dashboard background
  category: 'solid' | 'gradient' | 'pattern' | 'mesh';
}

// Wallpaper presets — all CSS, no external images
export const WALLPAPERS: WallpaperOption[] = [
  // Solids
  { id: 'default', name: 'Default', category: 'solid', preview: 'hsl(0 0% 96.1%)', css: '' },
  { id: 'warm-white', name: 'Warm White', category: 'solid', preview: '#faf8f5', css: 'background: #faf8f5;' },
  { id: 'cool-slate', name: 'Cool Slate', category: 'solid', preview: '#f1f5f9', css: 'background: #f1f5f9;' },
  { id: 'midnight', name: 'Midnight', category: 'solid', preview: '#0f172a', css: 'background: #0f172a;' },

  // Gradients
  { id: 'aurora', name: 'Aurora', category: 'gradient', preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    css: 'background: linear-gradient(135deg, #667eea22 0%, #764ba222 100%);' },
  { id: 'ocean', name: 'Ocean Breeze', category: 'gradient', preview: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #14b8a6 100%)',
    css: 'background: linear-gradient(135deg, #0ea5e918 0%, #06b6d418 50%, #14b8a618 100%);' },
  { id: 'sunset', name: 'Sunset', category: 'gradient', preview: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
    css: 'background: linear-gradient(135deg, #f9731618 0%, #ec489918 100%);' },
  { id: 'forest', name: 'Forest', category: 'gradient', preview: 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
    css: 'background: linear-gradient(135deg, #22c55e18 0%, #16a34a18 50%, #15803d18 100%);' },
  { id: 'lavender', name: 'Lavender Haze', category: 'gradient', preview: 'linear-gradient(135deg, #c084fc 0%, #818cf8 50%, #60a5fa 100%)',
    css: 'background: linear-gradient(135deg, #c084fc18 0%, #818cf818 50%, #60a5fa18 100%);' },
  { id: 'warm-sand', name: 'Warm Sand', category: 'gradient', preview: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
    css: 'background: linear-gradient(135deg, #fbbf2415 0%, #f59e0b15 50%, #d9770615 100%);' },

  // Patterns (CSS-only)
  { id: 'dots', name: 'Subtle Dots', category: 'pattern',
    preview: 'radial-gradient(circle, #9ca3af 1px, transparent 1px)',
    css: 'background-image: radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px); background-size: 20px 20px;' },
  { id: 'grid', name: 'Grid', category: 'pattern',
    preview: 'linear-gradient(#9ca3af 1px, transparent 1px), linear-gradient(90deg, #9ca3af 1px, transparent 1px)',
    css: 'background-image: linear-gradient(hsl(var(--muted-foreground) / 0.08) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--muted-foreground) / 0.08) 1px, transparent 1px); background-size: 24px 24px;' },
  { id: 'cross', name: 'Cross Stitch', category: 'pattern',
    preview: 'radial-gradient(circle, #9ca3af 1px, transparent 1px)',
    css: 'background-image: radial-gradient(hsl(var(--muted-foreground) / 0.12) 1.5px, transparent 1.5px); background-size: 16px 16px; background-position: 0 0, 8px 8px;' },

  // Mesh gradients
  { id: 'mesh-purple', name: 'Purple Mesh', category: 'mesh',
    preview: 'radial-gradient(at 40% 20%, #7c3aed 0px, transparent 50%), radial-gradient(at 80% 0%, #c084fc 0px, transparent 50%), radial-gradient(at 0% 50%, #818cf8 0px, transparent 50%)',
    css: 'background: radial-gradient(at 40% 20%, #7c3aed12 0px, transparent 50%), radial-gradient(at 80% 0%, #c084fc12 0px, transparent 50%), radial-gradient(at 0% 50%, #818cf812 0px, transparent 50%);' },
  { id: 'mesh-ocean', name: 'Ocean Mesh', category: 'mesh',
    preview: 'radial-gradient(at 0% 0%, #0ea5e9 0px, transparent 50%), radial-gradient(at 80% 50%, #06b6d4 0px, transparent 50%), radial-gradient(at 40% 100%, #14b8a6 0px, transparent 50%)',
    css: 'background: radial-gradient(at 0% 0%, #0ea5e912 0px, transparent 50%), radial-gradient(at 80% 50%, #06b6d412 0px, transparent 50%), radial-gradient(at 40% 100%, #14b8a612 0px, transparent 50%);' },
  { id: 'mesh-warm', name: 'Warm Mesh', category: 'mesh',
    preview: 'radial-gradient(at 20% 30%, #f97316 0px, transparent 50%), radial-gradient(at 80% 60%, #ef4444 0px, transparent 50%), radial-gradient(at 50% 90%, #eab308 0px, transparent 50%)',
    css: 'background: radial-gradient(at 20% 30%, #f9731612 0px, transparent 50%), radial-gradient(at 80% 60%, #ef444412 0px, transparent 50%), radial-gradient(at 50% 90%, #eab30812 0px, transparent 50%);' },
];

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedMode: 'light' | 'dark';
  wallpaper: string; // wallpaper id
  setWallpaper: (id: string) => void;
  getWallpaperCSS: () => string;
  sidebarOpacity: number;
  setSidebarOpacity: (opacity: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY_MODE = 'sm-theme-mode';
const STORAGE_KEY_WALLPAPER = 'sm-wallpaper';
const STORAGE_KEY_SIDEBAR_OPACITY = 'sm-sidebar-opacity';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [wallpaper, setWallpaperState] = useState('default');
  const [sidebarOpacity, setSidebarOpacityState] = useState(100);
  const [systemDark, setSystemDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load saved preferences
  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem(STORAGE_KEY_MODE) as ThemeMode | null;
    const savedWallpaper = localStorage.getItem(STORAGE_KEY_WALLPAPER);
    const savedOpacity = localStorage.getItem(STORAGE_KEY_SIDEBAR_OPACITY);

    if (savedMode) setModeState(savedMode);
    if (savedWallpaper) setWallpaperState(savedWallpaper);
    if (savedOpacity) setSidebarOpacityState(Number(savedOpacity));

    // Listen to system preference
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mql.matches);
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const resolvedMode = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  // Apply dark class to <html>
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (resolvedMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedMode, mounted]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY_MODE, m);
  }, []);

  const setWallpaper = useCallback((id: string) => {
    setWallpaperState(id);
    localStorage.setItem(STORAGE_KEY_WALLPAPER, id);
  }, []);

  const setSidebarOpacity = useCallback((opacity: number) => {
    setSidebarOpacityState(opacity);
    localStorage.setItem(STORAGE_KEY_SIDEBAR_OPACITY, String(opacity));
  }, []);

  const getWallpaperCSS = useCallback(() => {
    const wp = WALLPAPERS.find(w => w.id === wallpaper);
    return wp?.css || '';
  }, [wallpaper]);

  return (
    <ThemeContext.Provider value={{
      mode,
      setMode,
      resolvedMode,
      wallpaper,
      setWallpaper,
      getWallpaperCSS,
      sidebarOpacity,
      setSidebarOpacity,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
