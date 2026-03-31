import { useParams, useNavigate } from 'react-router-dom';
import { useTickets } from '@/context/TicketContext';
import {
  REQUEST_TYPE_LABELS, SUGGESTED_SOLUTION_LABELS,
  COMPLAINT_STATUS_LABELS, RETURN_STATUS_LABELS, OTHER_STATUS_LABELS,
  COMPLAINT_TYPE_LABELS, COMPLAINT_TYPE_ALLOWED_ACTIONS,
  COMPLAINT_TYPE_SUGGESTED_SOLUTION, MOCK_ORDERS,
  SEVERITY_LABELS, REFUND_METHOD_LABELS, REQUESTED_RESOLUTION_LABELS,
  COMPLAINT_ITEM_STATUS_LABELS,
  ComplaintType, ReturnStatus, OtherStatus, SuggestedSolution, RequestedResolution,
  ComplaintItemStatus,
  RETURN_STATUS_FLOW, OTHER_STATUS_FLOW, ComplaintItem,
  getDerivedTicketStatus, DERIVED_TICKET_STATUS_LABELS, DERIVED_TICKET_STATUS_COLORS,
} from '@/types/ticket';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import {
  ArrowLeft, Star, XCircle, MessageSquare, CheckCircle2,
  Send, Banknote, Package, RefreshCw, Replace, AlertTriangle, Info,
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
  item_approved: 'bg-primary/15 text-primary border-primary/30',
  item_rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  item_refunded: 'bg-green-500/15 text-green-700 border-green-500/30',
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
  const { getTicket, updateTicketStatus, updateComplaintStatus, updateReturnStatus, updateOtherStatus, updateComplaintItemStatus } = useTickets();

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

  // ---- Per-item actions ----
  const handleItemAction = (itemIndex: number, item: ComplaintItem, actionKey: string) => {
    const isFinal = item.itemStatus === 'item_refunded' || item.itemStatus === 'item_rejected' || item.itemStatus === 'item_approved';
    if (isFinal) {
      toast.error('Táto položka je už uzavretá.');
      return;
    }

    let newStatus: ComplaintItemStatus;
    switch (actionKey) {
      case 'refund':
        newStatus = 'item_refunded';
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

    updateComplaintItemStatus(ticket.id, itemIndex, newStatus);

    const actionLabel = ITEM_ACTIONS.find(a => a.key === actionKey)?.label ?? actionKey;
    toast.success(`${item.productName}: ${actionLabel}`);
  };

  // ---- Non-complaint actions (return, other) ----
  const handleReject = () => {
    if (isComplaint) updateComplaintStatus(ticket.id, 'complaint_rejected');
    if (ticket.requestType === 'return' && ticket.returnStatus) updateReturnStatus(ticket.id, 'return_rejected');
    if (ticket.requestType === 'other' && ticket.otherStatus) updateOtherStatus(ticket.id, 'other_rejected');
    updateTicketStatus(ticket.id, 'rejected');
    toast.success('Požiadavka zamietnutá');
  };

  const handleRequestInfo = () => {
    if (isComplaint) updateComplaintStatus(ticket.id, 'complaint_waiting_customer');
    updateTicketStatus(ticket.id, 'needs_info');
    toast.success('Vyžiadané doplnenie od zákazníka');
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
                const isFinal = item.itemStatus === 'item_refunded' || item.itemStatus === 'item_rejected' || item.itemStatus === 'item_approved';

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
                        ITEM_STATUS_COLORS[item.itemStatus]
                      )}>
                        {COMPLAINT_ITEM_STATUS_LABELS[item.itemStatus]}
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

                      {/* Per-item action buttons */}
                      {!isFinal && (
                        <div className="border-t pt-3 space-y-2">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Akcie</p>
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
                                    <span className="text-[10px] rounded-full bg-primary-foreground/20 px-2 py-0.5">★ Odporúčané podľa zákazníka</span>
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

          {/* Timestamps */}
          <div className="rounded-xl border bg-card p-4 text-sm space-y-1 text-muted-foreground">
            <p>Vytvorené: {format(new Date(ticket.createdAt), 'd. MMM yyyy, HH:mm', { locale: sk })}</p>
            <p>Aktualizované: {format(new Date(ticket.updatedAt), 'd. MMM yyyy, HH:mm', { locale: sk })}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDetail;
