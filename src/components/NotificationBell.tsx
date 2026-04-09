import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const TYPE_LABELS: Record<string, string> = {
  new_ticket: 'Nový tiket',
  status_changed: 'Zmena stavu',
  info_requested: 'Žiadosť o info',
  info_provided: 'Info doplnené',
  reply_sent: 'Odpoveď odoslaná',
};

export const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications('admin');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleClick = (n: typeof notifications[0]) => {
    markAsRead(n.id);
    setOpen(false);
    navigate(`/admin/${n.ticketCode}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Notifikácie</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => markAllAsRead()}>
              <CheckCheck className="h-3.5 w-3.5" />
              Označiť všetky
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Žiadne notifikácie</div>
          ) : (
            notifications.slice(0, 20).map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-accent/50 transition-colors',
                  !n.isRead && 'bg-primary/5'
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  <div className={cn('flex-1', n.isRead && 'ml-4')}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {TYPE_LABELS[n.type] || n.type}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: sk })}
                      </span>
                    </div>
                    <p className="text-sm font-medium mt-0.5">{n.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{n.ticketCode}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
