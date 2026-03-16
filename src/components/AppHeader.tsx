import { Link, useLocation } from 'react-router-dom';
import { Headset, LayoutDashboard, PlusCircle, SearchCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AppHeader = () => {
  const { pathname } = useLocation();

  const links = [
    { to: '/', label: 'New Request', icon: PlusCircle },
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
          <Headset className="h-6 w-6 text-primary" />
          ServiceDesk
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === to
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};
