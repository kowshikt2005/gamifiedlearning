'use client';

import { useTheme } from '@/contexts/theme-context';
import { ReactNode } from 'react';

export function WallpaperBackground({ children }: { children: ReactNode }) {
  const { getWallpaperCSS, wallpaper } = useTheme();
  const css = getWallpaperCSS();

  return (
    <div
      className="flex min-h-screen w-full flex-col transition-colors duration-500"
      style={css ? undefined : { background: 'hsl(var(--muted) / 0.4)' }}
    >
      {/* Wallpaper layer — behind all content, covers full viewport */}
      {css && (
        <div
          className="fixed inset-0 -z-10 transition-all duration-500"
          style={parseCSS(css)}
        />
      )}
      {/* Fallback base color so content is always readable */}
      {css && (
        <div
          className="fixed inset-0 -z-10 bg-background/80"
          style={{ mixBlendMode: 'normal' }}
        />
      )}
      {children}
    </div>
  );
}

/**
 * Parse a CSS string like "background: ...; background-size: ...;"
 * into a React CSSProperties object.
 */
function parseCSS(css: string): React.CSSProperties {
  const style: Record<string, string> = {};
  const declarations = css.split(';').filter(Boolean);

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx === -1) continue;

    const prop = decl.slice(0, colonIdx).trim();
    const value = decl.slice(colonIdx + 1).trim();

    // Convert kebab-case to camelCase
    const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    style[camelProp] = value;
  }

  return style as React.CSSProperties;
}
