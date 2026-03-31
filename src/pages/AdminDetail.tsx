import { useParams, useNavigate } from 'react-router-dom';
import { useTickets } from '@/context/TicketContext';
import {
  REQUEST_TYPE_LABELS, SUGGESTED_SOLUTION_LABELS,
  COMPLAINT_STATUS_LABELS, RETURN_STATUS_LABELS, OTHER_STATUS_LABELS,
  COMPLAINT_TYPE_LABELS, COMPLAINT_TYPE_ALLOWED_ACTIONS,
  COMPLAINT_TYPE_SUGGESTED_SOLUTION, MOCK_ORDERS,
  SEVERITY_LABELS, REFUND_METHOD_LABELS, REQUESTED_RESOLUTION_LABELS,
  ComplaintType, ReturnStatus, OtherStatus, SuggestedSolution, RequestedResolution,
  RETURN_STATUS_FLOW, OTHER_STATUS_FLOW,
} from '@/types/ticket';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import {
  ArrowLeft, Star, XCircle, MessageSquare, CheckCircle2,
  Send, Banknote, Package, RefreshCw, Replace,
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

const AdminDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTicket, updateTicketStatus, updateComplaintStatus, updateReturnStatus, updateOtherStatus } = useTickets();

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

  const suggestedLabel = complaintType
    ? SUGGESTED_SOLUTION_LABELS[COMPLAINT_TYPE_SUGGESTED_SOLUTION[complaintType]]
    : ticket.suggestedSolution
      ? SUGGESTED_SOLUTION_LABELS[ticket.suggestedSolution]
      : null;

  // ---- Actions ----
  const handleComplaintAction = (action: SuggestedSolution) => {
    if (action === 'refund') {
      updateComplaintStatus(ticket.id, 'complaint_refund_processing');
      updateTicketStatus(ticket.id, 'refund_processing');
      toast.success('Refundácia zahájená');
    } else {
      updateComplaintStatus(ticket.id, 'complaint_approved');
      updateTicketStatus(ticket.id, 'approved');
      toast.success(`Schválené: ${SUGGESTED_SOLUTION_LABELS[action]}`);
    }
  };

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
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-heading text-base font-semibold mb-4">Detail požiadavky</h2>

          <dl>
            <Field label="Typ požiadavky" value={REQUEST_TYPE_LABELS[ticket.requestType]} />
            <Field label="Typ reklamácie" value={complaintType ? COMPLAINT_TYPE_LABELS[complaintType] : null} />

            <div className="py-3 border-b">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Stav</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <StatusBadge status={ticket.status} />
                {workflowLabel && (
                  <span className="rounded-full border bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                    {workflowLabel}
                  </span>
                )}
              </dd>
            </div>

            <Field label="Zákazník" value={`${customerName} · ${ticket.customerEmail}`} />
            <Field label="Produkt" value={ticket.product} />
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

        {/* ──── RIGHT: Actions ──── */}
        <div className="lg:sticky lg:top-8 lg:self-start space-y-4">

          {/* Customer requested resolution */}
          {ticket.requestedResolution && (
            <div className="rounded-xl border-2 border-accent/50 bg-accent/10 p-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Požiadavka zákazníka</p>
              <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">
                {REQUESTED_RESOLUTION_LABELS[ticket.requestedResolution]}
              </span>
            </div>
          )}

          {/* Suggested solution card */}
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 space-y-5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Navrhované riešenie</p>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary fill-primary" />
                <span className="text-lg font-bold text-primary">{suggestedLabel ?? 'Nie je priradené'}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Akcie</p>

              {/* Complaint-specific actions */}
              {complaintType && (
                <div className="grid gap-2">
                  {COMPLAINT_TYPE_ALLOWED_ACTIONS[complaintType].map(action => {
                    const Icon = ACTION_ICONS[action] || CheckCircle2;
                    const isSuggested = action === COMPLAINT_TYPE_SUGGESTED_SOLUTION[complaintType];
                    return (
                      <button key={action} onClick={() => handleComplaintAction(action)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition-all text-left w-full',
                          isSuggested
                            ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                            : 'bg-card text-foreground hover:bg-accent'
                        )}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{SUGGESTED_SOLUTION_LABELS[action]}</span>
                        {isSuggested && <span className="text-[10px] rounded-full bg-primary-foreground/20 px-2 py-0.5">Odporúčané</span>}
                      </button>
                    );
                  })}
                </div>
              )}

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
            </div>

            {/* Always-visible: Reject + Request info */}
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
