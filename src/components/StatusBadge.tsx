import { TicketStatus, STATUS_LABELS } from '@/types/ticket';
import { cn } from '@/lib/utils';

/**
 * Consistent status color mapping:
 *   PODNET_PRIJATY        → blue   (info)
 *   CAKA_NA_PODKLADY      → orange (caution)
 *   REKLAMACIA_V_RIESENI  → yellow (warning)
 *   OBJEDNANY_ZVOZ        → yellow (warning)
 *   VRATENE_NA_SKLAD      → yellow (warning)
 *   DOBROPIS_VYSTAVENIE   → yellow (warning)
 *   VRATENIE_FIN_PROSTR.  → yellow (warning)
 *   UKONCENA_UZNANA       → green  (success)
 *   UKONCENA_ZAMIETNUTA   → red    (destructive)
 */
const statusStyles: Record<TicketStatus, string> = {
  podnet_prijaty: 'bg-info/15 text-info border-info/30',
  caka_na_podklady: 'bg-caution/15 text-caution border-caution/30',
  reklamacia_v_rieseni: 'bg-warning/15 text-warning border-warning/30',
  objednany_zvoz: 'bg-warning/15 text-warning border-warning/30',
  vratene_na_sklad: 'bg-warning/15 text-warning border-warning/30',
  dobropis_vystavenie: 'bg-warning/15 text-warning border-warning/30',
  vratenie_fin_prostriedkov: 'bg-warning/15 text-warning border-warning/30',
  ukoncena_uznana: 'bg-success/15 text-success border-success/30',
  ukoncena_zamietnuta: 'bg-destructive/15 text-destructive border-destructive/30',
};

export const StatusBadge = ({ status }: { status: TicketStatus }) => (
  <span className={cn(
    'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold',
    statusStyles[status] || 'bg-muted text-muted-foreground border-border'
  )}>
    {STATUS_LABELS[status] || 'Neznámy stav'}
  </span>
);
