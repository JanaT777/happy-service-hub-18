import { TicketStatus, STATUS_LABELS } from '@/types/ticket';
import { cn } from '@/lib/utils';

const statusStyles: Record<TicketStatus, string> = {
  new: 'bg-info/15 text-info border-info/30',
  in_review: 'bg-warning/15 text-warning border-warning/30',
  approved: 'bg-success/15 text-success border-success/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  refund_processing: 'bg-primary/15 text-primary border-primary/30',
  completed: 'bg-muted text-muted-foreground border-border',
};

export const StatusBadge = ({ status }: { status: TicketStatus }) => (
  <span className={cn(
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
    statusStyles[status]
  )}>
    {STATUS_LABELS[status]}
  </span>
);
