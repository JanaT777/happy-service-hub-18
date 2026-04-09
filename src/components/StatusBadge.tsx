import { TicketStatus, STATUS_LABELS } from '@/types/ticket';
import { cn } from '@/lib/utils';

/**
 * Consistent status color mapping:
 *   NEW        → blue   (info)
 *   IN_PROGRESS→ yellow (warning)
 *   WAITING    → orange (caution)
 *   RESOLVED   → green  (success)
 *   REJECTED   → red    (destructive)
 */
const statusStyles: Record<TicketStatus, string> = {
  new: 'bg-info/15 text-info border-info/30',
  in_progress: 'bg-warning/15 text-warning border-warning/30',
  in_review: 'bg-warning/15 text-warning border-warning/30',
  needs_info: 'bg-caution/15 text-caution border-caution/30',
  approved: 'bg-success/15 text-success border-success/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  refund_processing: 'bg-warning/15 text-warning border-warning/30',
  completed: 'bg-success/15 text-success border-success/30',
  suspended: 'bg-caution/15 text-caution border-caution/30',
};

export const StatusBadge = ({ status }: { status: TicketStatus }) => (
  <span className={cn(
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
    statusStyles[status] || 'bg-muted text-muted-foreground border-border'
  )}>
    {STATUS_LABELS[status] || 'Neznámy stav'}
  </span>
);
