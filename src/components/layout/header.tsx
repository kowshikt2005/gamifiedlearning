'use client';
import { useState } from 'react';
import Link from 'next/link';
// Removed unused useRouter import
import {
  Home,
  Menu,
  Search,
  BarChart2,
  PlusCircle,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '../icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth } from '@/contexts/auth-context';
import { AppearanceSettings } from '@/components/settings/appearance-settings';

export function Header() {
  const { user, logout } = useAuth();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar') || {
    id: 'fallback',
    imageUrl: 'https://picsum.photos/seed/fallback/32/32',
    imageHint: 'person',
    description: 'Fallback avatar'
  };

  const handleLogout = async () => {
    try {
      logout();
      // Force a hard redirect to prevent white page
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: force redirect anyway
      window.location.href = '/';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/dashboard"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <Logo className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">StudyMaster AI</span>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Home className="h-5 w-5" />
              Dashboard
            </Link>
            <Link
              href="/dashboard/create-task"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <PlusCircle className="h-5 w-5" />
              New Task
            </Link>
            <Link
              href="/dashboard/analytics"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <BarChart2 className="h-5 w-5" />
              Analytics
            </Link>
          </nav>
        </SheetContent>
      </Sheet>

      <div className="relative ml-auto flex-1 md:grow-0">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search tasks..."
          className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="overflow-hidden rounded-full"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={userAvatar?.imageUrl} alt="User avatar" data-ai-hint={userAvatar?.imageHint}/>
              <AvatarFallback>SM</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            {user?.username || 'My Account'}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAppearanceOpen(true)}>
            <Palette className="mr-2 h-4 w-4" />
            Appearance
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={appearanceOpen} onOpenChange={setAppearanceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Appearance</DialogTitle>
          </DialogHeader>
          <AppearanceSettings />
        </DialogContent>
      </Dialog>
    </header>
  );
}
