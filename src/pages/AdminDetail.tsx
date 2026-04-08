import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTickets } from '@/context/TicketContext';
import {
  REQUEST_TYPE_LABELS, SUGGESTED_SOLUTION_LABELS,
  COMPLAINT_STATUS_LABELS, RETURN_STATUS_LABELS, OTHER_STATUS_LABELS,
  COMPLAINT_TYPE_LABELS, COMPLAINT_TYPE_ALLOWED_ACTIONS,
  COMPLAINT_TYPE_SUGGESTED_SOLUTION, MOCK_ORDERS,
  SEVERITY_LABELS, REFUND_METHOD_LABELS, REQUESTED_RESOLUTION_LABELS,
  COMPLAINT_ITEM_STATUS_LABELS, OTHER_SUBTYPE_LABELS,
  ComplaintType, ReturnStatus, OtherStatus, SuggestedSolution, RequestedResolution,
  ComplaintItemStatus, ITEM_STATUS_FLOW,
  RETURN_STATUS_FLOW, OTHER_STATUS_FLOW, ComplaintItem,
  getDerivedTicketStatus, DERIVED_TICKET_STATUS_LABELS, DERIVED_TICKET_STATUS_COLORS,
  AssignedTeam, ASSIGNED_TEAM_LABELS,
} from '@/types/ticket';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { sk } from 'date-fns/locale';
import {
  ArrowLeft, Star, XCircle, MessageSquare, CheckCircle2,
  Send, Banknote, Package, RefreshCw, Replace, AlertTriangle, Info,
  Truck, Warehouse, ClipboardCheck, CalendarDays, Clock, UserCheck,
} from 'lucide-react';

const ACTION_ICONS: Partial<Record<SuggestedSolution, typeof Send>> = {
  resend_order: Send,
  exchange: Replace,
  replacement_with_pickup: RefreshCw,
  refund: Banknote,
  adjust_order: Package,
  internal_stock: Package,
  send_missing: Send,
  discount: Star,
};

const ITEM_STATUS_COLORS: Record<ComplaintItemStatus, string> = {
  item_new: 'bg-muted text-muted-foreground',
  item_in_transit: 'bg-info/15 text-info border-info/30',
  item_received_warehouse: 'bg-primary/15 text-primary border-primary/30',
  item_quality_check: 'bg-warning/15 text-warning border-warning/30',
  item_approved: 'bg-primary/15 text-primary border-primary/30',
  item_rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  item_refunded: 'bg-green-500/15 text-green-700 border-green-500/30',
  item_completed: 'bg-green-500/15 text-green-700 border-green-500/30',
};

// Map RequestedResolution → SuggestedSolution for button matching
const RESOLUTION_TO_ACTION: Record<RequestedResolution, SuggestedSolution> = {
  resend: 'resend_order',
  exchange: 'exchange',
  refund: 'refund',
};

// Per-item action definitions
const ITEM_ACTIONS: { key: string; label: string; solution: SuggestedSolution | null; icon: typeof Send; variant: 'default' | 'destructive' }[] = [
  { key: 'refund', label: 'Refundovať', solution: 'refund', icon: Banknote, variant: 'default' },
  { key: 'exchange', label: 'Výmena produktu', solution: 'exchange', icon: Replace, variant: 'default' },
  { key: 'reject', label: 'Zamietnuť', solution: null, icon: XCircle, variant: 'destructive' },
];

const AdminDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTicket, updateTicketStatus, updateComplaintStatus, updateReturnStatus, updateOtherStatus, updateComplaintItemStatus, setWarehouseReceipt, updateAssignment, requestInfo, markInfoProvided } = useTickets();
  const [receiptDate, setReceiptDate] = useState<Date | undefined>(undefined);
  const [receiptPopoverOpen, setReceiptPopoverOpen] = useState(false);

  // Info request dialog state
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [infoNote, setInfoNote] = useState('');

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [pendingReject, setPendingReject] = useState<{ type: 'item'; itemIndex: number; item: ComplaintItem } | { type: 'ticket' } | null>(null);
  const [rejectButtonLocked, setRejectButtonLocked] = useState(true);

  const openRejectDialog = (target: typeof pendingReject) => {
    setPendingReject(target);
    setRejectReason('');
    setRejectNote('');
    setRejectButtonLocked(true);
    setRejectDialogOpen(true);
    setTimeout(() => setRejectButtonLocked(false), 2000);
  };

  const confirmReject = () => {
    if (!pendingReject || !rejectReason.trim()) return;
    if (pendingReject.type === 'item') {
      const actionLabel = `Zamietnuť – ${rejectReason.trim()}`;
      updateComplaintItemStatus(ticket!.id, pendingReject.itemIndex, 'item_rejected', actionLabel);
      toast.success(`${pendingReject.item.productName}: Zamietnuté`);
    } else {
      if (isComplaint) updateComplaintStatus(ticket!.id, 'complaint_rejected');
      if (ticket!.requestType === 'return' && ticket!.returnStatus) updateReturnStatus(ticket!.id, 'return_rejected');
      if (ticket!.requestType === 'other' && ticket!.otherStatus) updateOtherStatus(ticket!.id, 'other_rejected');
      updateTicketStatus(ticket!.id, 'rejected');
      toast.success('Požiadavka zamietnutá');
    }
    setRejectDialogOpen(false);
    setPendingReject(null);
  };

  const ticket = getTicket(id || '');

  if (!ticket) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="font-heading text-2xl font-bold mb-2">Požiadavka nenájdená</h2>
        <p className="text-muted-foreground mb-6">Tiket s ID „{id}" neexistuje.</p>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Späť na zoznam
        </Button>
      </div>
    );
  }

  // Derived data
  const order = MOCK_ORDERS[ticket.orderNumber];
  const customerName = order?.customerName ?? ticket.customerEmail.split('@')[0];
  const isComplaint = ticket.requestType === 'complaint';
  const complaintType =
    isComplaint && ticket.issueType && (ticket.issueType as string) in COMPLAINT_TYPE_LABELS
      ? (ticket.issueType as ComplaintType)
      : null;

  const workflowLabel = (() => {
    if (ticket.requestType === 'complaint' && ticket.complaintStatus) return COMPLAINT_STATUS_LABELS[ticket.complaintStatus];
    if (ticket.requestType === 'return' && ticket.returnStatus) return RETURN_STATUS_LABELS[ticket.returnStatus];
    if (ticket.requestType === 'other' && ticket.otherStatus) return OTHER_STATUS_LABELS[ticket.otherStatus];
    return null;
  })();

  // ---- Per-item status transition ----
  const handleItemStatusTransition = (itemIndex: number, item: ComplaintItem, newStatus: ComplaintItemStatus) => {
    const label = COMPLAINT_ITEM_STATUS_LABELS[newStatus];
    updateComplaintItemStatus(ticket.id, itemIndex, newStatus, label);
    toast.success(`${item.productName}: ${label}`);
  };

  // ---- Per-item decision actions (only available during quality_check) ----
  const handleItemAction = (itemIndex: number, item: ComplaintItem, actionKey: string) => {
    if (actionKey === 'reject') {
      openRejectDialog({ type: 'item', itemIndex, item });
      return;
    }
    let newStatus: ComplaintItemStatus;
    switch (actionKey) {
      case 'refund':
        newStatus = 'item_approved';
        break;
      case 'exchange':
        newStatus = 'item_approved';
        break;
      case 'reject':
        newStatus = 'item_rejected';
        break;
      default:
        return;
    }

    const actionLabel = ITEM_ACTIONS.find(a => a.key === actionKey)?.label ?? actionKey;
    updateComplaintItemStatus(ticket.id, itemIndex, newStatus, actionLabel);
    toast.success(`${item.productName}: ${actionLabel}`);
  };

  // ---- Non-complaint actions (return, other) ----
  const handleReject = () => {
    openRejectDialog({ type: 'ticket' });
  };

  const handleRequestInfo = () => {
    setInfoMessage('');
    setInfoNote('');
    setInfoDialogOpen(true);
  };

  const confirmRequestInfo = () => {
    if (!infoMessage.trim()) return;
    requestInfo(ticket!.id, infoMessage.trim(), infoNote.trim() || undefined);
    setInfoDialogOpen(false);
    toast.success('Vyžiadané doplnenie od zákazníka');
  };

  const handleMarkInfoProvided = () => {
    markInfoProvided(ticket!.id);
    toast.success('Označené ako doplnené – tiket pokračuje v spracovaní');
  };

  const handleReturnNext = (ns: ReturnStatus) => {
    updateReturnStatus(ticket.id, ns);
    if (ns === 'return_refund_processing') updateTicketStatus(ticket.id, 'refund_processing');
    if (ns === 'return_completed') updateTicketStatus(ticket.id, 'completed');
    if (ns === 'return_rejected') updateTicketStatus(ticket.id, 'rejected');
    toast.success(RETURN_STATUS_LABELS[ns]);
  };

  const handleOtherNext = (ns: OtherStatus) => {
    updateOtherStatus(ticket.id, ns);
    if (ns === 'other_completed') updateTicketStatus(ticket.id, 'completed');
    if (ns === 'other_rejected') updateTicketStatus(ticket.id, 'rejected');
    toast.success(OTHER_STATUS_LABELS[ns]);
  };

  const returnNextStatuses = ticket.returnStatus ? (RETURN_STATUS_FLOW[ticket.returnStatus] ?? []) : [];
  const otherNextStatuses = ticket.otherStatus ? (OTHER_STATUS_FLOW[ticket.otherStatus] ?? []) : [];

  // ---- Render helpers ----
  const Field = ({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) => (
    <div className="py-3 border-b last:border-b-0">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</dt>
      <dd className={cn('text-sm font-medium', mono && 'font-mono tracking-wide', !value && 'text-muted-foreground')}>
        {value || '—'}
      </dd>
    </div>
  );

  const hasComplaintItems = ticket.complaintItems && ticket.complaintItems.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Back + title */}
      <div className="mb-8 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold">{ticket.id}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(ticket.createdAt), 'd. MMMM yyyy, HH:mm', { locale: sk })}
          </p>
        </div>
      </div>

      {/* === TWO COLUMNS === */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[7fr_3fr]">

        {/* ──── LEFT: Details ──── */}
        <div className="space-y-6">
          {/* Basic info card */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="font-heading text-base font-semibold mb-4">Detail požiadavky</h2>
            <dl>
              <Field label="Typ požiadavky" value={REQUEST_TYPE_LABELS[ticket.requestType]} />
              {ticket.requestType === 'return' && (
                <>
                  <Field label="Typ požiadavky" value="Odstúpenie od zmluvy" />
                  <Field label="Navrhované riešenie" value="Vrátenie finančných prostriedkov" />
                </>
              )}

              <div className="py-3 border-b">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Stav</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const derived = getDerivedTicketStatus(ticket);
                    if (derived) {
                      return (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${DERIVED_TICKET_STATUS_COLORS[derived]}`}>
                          {DERIVED_TICKET_STATUS_LABELS[derived]}
                        </span>
                      );
                    }
                    return <StatusBadge status={ticket.status} />;
                  })()}
                  {workflowLabel && (
                    <span className="rounded-full border bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                      {workflowLabel}
                    </span>
                  )}
                </dd>
              </div>

              <Field label="Zákazník" value={`${customerName} · ${ticket.customerEmail}`} />
              {ticket.returnItems && ticket.returnItems.length > 0 ? (
                <div className="py-3 border-b">
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Vrátené produkty</dt>
                  <dd className="space-y-1">
                    {ticket.returnItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">({item.quantity}×)</span>
                      </div>
                    ))}
                  </dd>
                </div>
              ) : (
                !hasComplaintItems && <Field label="Produkt" value={ticket.product} />
              )}
              <Field label="Objednávka" value={ticket.orderNumber} />
              {ticket.otherSubtype && (
                <Field label="Podtyp požiadavky" value={OTHER_SUBTYPE_LABELS[ticket.otherSubtype]} />
              )}
              <div className="py-3 border-b">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Priradené komu</dt>
                <dd>
                  <select
                    value={ticket.assignedTo || ''}
                    onChange={e => { updateAssignment(ticket.id, e.target.value as AssignedTeam); toast.success('Priradenie zmenené'); }}
                    className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Object.entries(ASSIGNED_TEAM_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </dd>
              </div>
              <Field label="Závažnosť" value={ticket.severity ? SEVERITY_LABELS[ticket.severity] : null} />
              <Field label="Popis" value={ticket.description} />

              {/* Attachments */}
              <div className="py-3 border-b">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Prílohy</dt>
                <dd>
                  {ticket.attachments?.length ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {ticket.attachments.map((src, i) => (
                        <img key={i} src={src} alt="" className="h-20 w-20 rounded-lg border object-cover" />
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Žiadne prílohy</span>
                  )}
                </dd>
              </div>

              <Field label="Spôsob vrátenia" value={ticket.refundMethod ? REFUND_METHOD_LABELS[ticket.refundMethod] : null} />

              {/* IBAN highlighted */}
              <div className={cn('py-3 rounded-lg', ticket.iban && 'bg-warning/10 border border-warning/40 px-3 mt-1')}>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">IBAN</dt>
                <dd className={cn('text-sm', ticket.iban ? 'font-mono font-bold tracking-wider' : 'text-muted-foreground')}>
                  {ticket.iban || '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Per-item complaint cards with actions */}
          {hasComplaintItems && (
            <div className="space-y-4">
              <h2 className="font-heading text-base font-semibold">Reklamované položky</h2>
              {ticket.complaintItems!.map((item, index) => {
                const itemComplaintType = item.complaintReason as ComplaintType;
                const systemSuggestion = item.outOfStock ? 'refund' as SuggestedSolution : COMPLAINT_TYPE_SUGGESTED_SOLUTION[itemComplaintType];
                const customerPreferred = RESOLUTION_TO_ACTION[item.requestedResolution];
                const isFinal = item.itemStatus === 'item_completed' || item.itemStatus === 'item_rejected';
                const nextStatuses = ITEM_STATUS_FLOW[item.itemStatus] || [];
                const isDecisionPoint = item.itemStatus === 'item_quality_check';

                return (
                  <div key={index} className="rounded-xl border bg-card overflow-hidden">
                    {/* Item header */}
                    <div className="flex items-center justify-between gap-3 p-4 border-b bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold">{item.productName}</span>
                        <span className="text-xs text-muted-foreground">({item.quantity}×)</span>
                      </div>
                      <span className={cn(
                        'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                        ITEM_STATUS_COLORS[item.itemStatus] || 'bg-muted text-muted-foreground'
                      )}>
                        {COMPLAINT_ITEM_STATUS_LABELS[item.itemStatus] || 'Neznámy stav'}
                      </span>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Item details */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">Dôvod</span>
                          <span className="font-medium">{COMPLAINT_TYPE_LABELS[item.complaintReason]}</span>
                        </div>
                        <div>
                          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">Požiadavka zákazníka</span>
                          <span className="inline-flex items-center rounded-full bg-primary/15 border border-primary/30 text-primary px-2.5 py-0.5 text-xs font-semibold">
                            {REQUESTED_RESOLUTION_LABELS[item.requestedResolution]}
                          </span>
                        </div>
                      </div>

                      {/* Mismatch warning with both badges */}
                      {customerPreferred !== systemSuggestion && (
                        <div className="rounded-lg bg-warning/10 border border-warning/30 px-4 py-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                            <span className="text-xs font-semibold text-warning">
                              Zákazník požaduje iné riešenie ako systém navrhuje
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 ml-6">
                            <span className="inline-flex items-center rounded-full bg-primary/15 border border-primary/30 text-primary px-2.5 py-0.5 text-[11px] font-semibold">
                              Zákazník: {REQUESTED_RESOLUTION_LABELS[item.requestedResolution]}
                            </span>
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center rounded-full bg-muted border border-border text-muted-foreground px-2.5 py-0.5 text-[11px] font-semibold cursor-help">
                                    Systém: {SUGGESTED_SOLUTION_LABELS[systemSuggestion]}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs max-w-[220px]">
                                  Navrhnuté automaticky podľa typu reklamácie
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      )}

                      {/* Agent instructions for resolved items */}
                      {item.itemStatus === 'item_approved' && (
                        <div className="flex items-start gap-2.5 rounded-lg bg-primary/10 border border-primary/30 px-4 py-3">
                          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-primary">Inštrukcia</p>
                            <p className="text-xs text-primary/80">Vytvor náhradnú objednávku v systéme (0 €)</p>
                          </div>
                        </div>
                      )}
                      {item.itemStatus === 'item_refunded' && (
                        <div className="flex items-start gap-2.5 rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3">
                          <Info className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-green-700">Inštrukcia</p>
                            <p className="text-xs text-green-600">Spracuj refundáciu v platobnom systéme</p>
                          </div>
                        </div>
                      )}
                      {item.itemStatus === 'item_rejected' && (
                        <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3">
                          <Info className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-destructive">Inštrukcia</p>
                            <p className="text-xs text-destructive/80">Informuj zákazníka o zamietnutí</p>
                          </div>
                        </div>
                      )}

                      {/* Per-item action buttons */}
                      {!isFinal && (
                        <div className="border-t pt-3 space-y-2">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Akcie</p>

                          {/* Warehouse flow transitions (non-decision statuses) */}
                          {!isDecisionPoint && nextStatuses.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {nextStatuses.map(ns => (
                                <button
                                  key={ns}
                                  onClick={() => handleItemStatusTransition(index, item, ns)}
                                  className="flex items-center gap-2 rounded-lg border border-primary bg-primary text-primary-foreground px-3 py-2.5 text-sm font-semibold transition-all hover:bg-primary/90 shadow-sm w-full"
                                >
                                  {ns === 'item_in_transit' && <Truck className="h-4 w-4 shrink-0" />}
                                  {ns === 'item_received_warehouse' && <Warehouse className="h-4 w-4 shrink-0" />}
                                  {ns === 'item_quality_check' && <ClipboardCheck className="h-4 w-4 shrink-0" />}
                                  {ns === 'item_refunded' && <Banknote className="h-4 w-4 shrink-0" />}
                                  {ns === 'item_completed' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                                  {ns === 'item_approved' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                                  <span className="flex-1 text-left">{COMPLAINT_ITEM_STATUS_LABELS[ns]}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Decision actions at quality_check */}
                          {isDecisionPoint && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {ITEM_ACTIONS.map(action => {
                                const Icon = action.icon;
                                const isCustomerPick = action.solution === customerPreferred;
                                const isSuggested = action.solution === systemSuggestion;
                                const isPrimary = customerPreferred ? isCustomerPick : isSuggested;

                                return (
                                  <button
                                    key={action.key}
                                    onClick={() => handleItemAction(index, item, action.key)}
                                    className={cn(
                                      'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all text-left w-full',
                                      action.variant === 'destructive'
                                        ? 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20'
                                        : isPrimary
                                            ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                                            : 'bg-card text-foreground hover:bg-accent'
                                    )}
                                  >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span className="flex-1">{action.label}</span>
                                    {isCustomerPick && action.variant === 'default' && (
                                      <span className="text-[10px] rounded-full bg-primary-foreground/20 px-2 py-0.5">★ Odporúčané</span>
                                    )}
                                    {!isCustomerPick && isSuggested && action.variant === 'default' && (
                                      <TooltipProvider delayDuration={200}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground cursor-help">Systém</span>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs max-w-[220px]">
                                            Navrhnuté automaticky podľa typu reklamácie
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action history */}
                      {item.actionHistory && item.actionHistory.length > 0 && (
                        <div className="border-t pt-3 space-y-1.5">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">História</p>
                          {item.actionHistory.map((log, li) => (
                            <div key={li} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                              <span className="font-medium text-foreground">{log.agent}</span>
                              <span>—</span>
                              <span>{log.action}</span>
                              <span className="ml-auto text-[10px]">
                                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: sk })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ──── RIGHT: Sidebar ──── */}
        <div className="lg:sticky lg:top-8 lg:self-start space-y-4">

          {/* Waiting for info banner */}
          {ticket.status === 'needs_info' && ticket.infoRequests && ticket.infoRequests.length > 0 && (
            <div className="rounded-xl border-2 border-warning/40 bg-warning/10 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-warning" />
                <p className="text-sm font-semibold text-warning">Čaká sa na doplnenie od zákazníka</p>
              </div>
              <div className="rounded-lg border border-warning/20 bg-card p-3 space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Požadované informácie</p>
                <p className="text-sm">{ticket.infoRequests[ticket.infoRequests.length - 1].message}</p>
              </div>
              <button
                onClick={handleMarkInfoProvided}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-primary/90"
              >
                <CheckCircle2 className="h-4 w-4" />
                Označiť ako doplnené
              </button>
            </div>
          )}

          {/* Non-complaint actions (return, other) */}
          {!hasComplaintItems && (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 space-y-5">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Akcie</p>
              </div>

              {/* Return-specific actions */}
              {ticket.requestType === 'return' && returnNextStatuses.length > 0 && (
                <div className="grid gap-2">
                  {returnNextStatuses.map(ns => (
                    <button key={ns} onClick={() => handleReturnNext(ns)}
                      className="flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm font-semibold hover:bg-accent transition-all">
                      {RETURN_STATUS_LABELS[ns]}
                    </button>
                  ))}
                </div>
              )}

              {/* Other-specific actions */}
              {ticket.requestType === 'other' && otherNextStatuses.length > 0 && (
                <div className="grid gap-2">
                  {otherNextStatuses.map(ns => (
                    <button key={ns} onClick={() => handleOtherNext(ns)}
                      className="flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm font-semibold hover:bg-accent transition-all">
                      {OTHER_STATUS_LABELS[ns]}
                    </button>
                  ))}
                </div>
              )}

              {/* Reject + Request info */}
              <div className="border-t border-primary/20 pt-4 space-y-2">
                <button onClick={handleReject}
                  className="flex w-full items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive hover:bg-destructive/20 transition-all">
                  <XCircle className="h-4 w-4 shrink-0" />
                  Zamietnuť požiadavku
                </button>
                <button onClick={handleRequestInfo}
                  className="flex w-full items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning hover:bg-warning/20 transition-all">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  Vyžiadať doplnenie
                </button>
              </div>
            </div>
          )}

          {/* Warehouse Receipt — staff only */}
          {(ticket.requestType === 'return' || ticket.requestType === 'complaint') && (
            <div className="rounded-xl border-2 border-warning/30 bg-warning/5 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-warning" />
                <p className="text-sm font-semibold">Príjem zásielky na sklad</p>
              </div>

              {ticket.warehouseReceipt ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Prijaté:</span>
                    <span className="font-medium">{format(new Date(ticket.warehouseReceipt.receivedAt), 'd. MMMM yyyy', { locale: sk })}</span>
                  </div>

                  {(() => {
                    const days = differenceInDays(new Date(), new Date(ticket.warehouseReceipt.receivedAt));
                    const isReturn = ticket.requestType === 'return';
                    const limit = isReturn ? 14 : 30;
                    const warnAt = isReturn ? 10 : 25;
                    const level = days > limit ? 'critical' : days >= warnAt ? 'warning' : 'ok';
                    return (
                      <div className={cn(
                        'rounded-xl border-2 px-4 py-3 flex items-start gap-3',
                        level === 'critical' && 'bg-destructive/10 border-destructive/40',
                        level === 'warning' && 'bg-warning/10 border-warning/40',
                        level === 'ok' && 'bg-success/10 border-success/40'
                      )}>
                        <div className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full mt-0.5',
                          level === 'critical' && 'bg-destructive/20',
                          level === 'warning' && 'bg-warning/20',
                          level === 'ok' && 'bg-success/20'
                        )}>
                          {level === 'critical' && <AlertTriangle className="h-5 w-5 text-destructive" />}
                          {level === 'warning' && <Clock className="h-5 w-5 text-warning" />}
                          {level === 'ok' && <CheckCircle2 className="h-5 w-5 text-success" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn('text-lg font-bold', level === 'critical' ? 'text-destructive' : level === 'warning' ? 'text-warning' : 'text-success')}>
                              {days}/{limit} dní
                            </span>
                            <span className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-bold border',
                              level === 'critical' && 'bg-destructive/15 text-destructive border-destructive/30',
                              level === 'warning' && 'bg-warning/15 text-warning border-warning/30',
                              level === 'ok' && 'bg-success/15 text-success border-success/30'
                            )}>
                              {level === 'critical' && 'Po termíne'}
                              {level === 'warning' && 'Blíži sa'}
                              {level === 'ok' && 'OK'}
                            </span>
                          </div>
                          <span className={cn('text-xs', level === 'critical' ? 'text-destructive/80' : level === 'warning' ? 'text-warning/80' : 'text-muted-foreground')}>
                            {level === 'critical' && 'Zákonná lehota prekročená!'}
                            {level === 'warning' && `Blíži sa lehota (zostáva ${limit - days} dní)`}
                            {level === 'ok' && `Do lehoty zostáva ${limit - days} dní`}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="border-t border-warning/20 pt-3 space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Audit</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <UserCheck className="h-3.5 w-3.5 shrink-0" />
                      <span>Zapísal: <span className="font-medium text-foreground">{ticket.warehouseReceipt.recordedBy}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>Dňa: {format(new Date(ticket.warehouseReceipt.recordedAt), 'd. MMM yyyy, HH:mm', { locale: sk })}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Zadajte dátum prijatia zásielky na sklad. Od tohto dátumu sa počítajú zákonné lehoty.
                  </p>
                  <Popover open={receiptPopoverOpen} onOpenChange={setReceiptPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                        receiptDate ? 'border-primary bg-primary/5 font-medium' : 'border-input bg-background text-muted-foreground hover:border-primary/40'
                      )}>
                        <CalendarDays className="h-4 w-4" />
                        {receiptDate ? format(receiptDate, 'd. MMMM yyyy', { locale: sk }) : 'Vybrať dátum prijatia'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={receiptDate}
                        onSelect={(date) => { setReceiptDate(date); }}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {receiptDate && (
                    <button
                      onClick={() => {
                        setWarehouseReceipt(ticket.id, receiptDate.toISOString(), 'Agent');
                        setReceiptPopoverOpen(false);
                        toast.success('Dátum prijatia zásielky bol zaznamenaný');
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-warning text-warning-foreground px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-warning/90"
                    >
                      <Warehouse className="h-4 w-4" />
                      Potvrdiť príjem zásielky
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Timestamps */}
          <div className="rounded-xl border bg-card p-4 text-sm space-y-1 text-muted-foreground">
            <p>Vytvorené: {format(new Date(ticket.createdAt), 'd. MMM yyyy, HH:mm', { locale: sk })}</p>
            <p>Aktualizované: {format(new Date(ticket.updatedAt), 'd. MMM yyyy, HH:mm', { locale: sk })}</p>
          </div>
        </div>
      </div>
      {/* Reject confirmation dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Zamietnuť reklamáciu</DialogTitle>
            <DialogDescription className="text-sm">
              Naozaj chceš zamietnuť túto reklamáciu? Tento krok je nezvratný a okamžite sa zobrazí zákazníkovi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reject-reason" className="text-sm font-medium">
                Dôvod zamietnutia <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                placeholder="Zadajte dôvod zamietnutia..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reject-note" className="text-sm font-medium text-muted-foreground">
                Interná poznámka <span className="text-muted-foreground text-xs">(nepovinné)</span>
              </Label>
              <Textarea
                id="reject-note"
                placeholder="Interná poznámka pre tím..."
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Zrušiť
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectButtonLocked}
              onClick={confirmReject}
              className="relative"
            >
              {rejectButtonLocked ? 'Počkajte...' : 'Áno, som si istý – Zamietnuť'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Info request dialog */}
      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-warning">Vyžiadať doplnenie</DialogTitle>
            <DialogDescription className="text-sm">
              Zadajte, aké informácie potrebujete od zákazníka. Správa bude viditeľná na stránke sledovania požiadavky.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="info-message" className="text-sm font-medium">
                Čo potrebujeme od zákazníka <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="info-message"
                placeholder="Napr. Prosíme o zaslanie fotografie poškodeného produktu..."
                value={infoMessage}
                onChange={e => setInfoMessage(e.target.value)}
                className="min-h-[80px]"
              />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" /> Táto správa bude viditeľná zákazníkovi
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="info-note" className="text-sm font-medium text-muted-foreground">
                Interná poznámka <span className="text-muted-foreground text-xs">(nepovinné)</span>
              </Label>
              <Textarea
                id="info-note"
                placeholder="Interná poznámka pre tím..."
                value={infoNote}
                onChange={e => setInfoNote(e.target.value)}
                className="min-h-[60px]"
              />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Táto poznámka je iba interná – zákazník ju neuvidí
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setInfoDialogOpen(false)}>
              Zrušiť
            </Button>
            <Button
              disabled={!infoMessage.trim()}
              onClick={confirmRequestInfo}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Odoslať požiadavku
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDetail;
