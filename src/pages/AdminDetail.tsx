import { useParams, useNavigate } from 'react-router-dom';
import { useTickets } from '@/context/TicketContext';
import {
  STATUS_LABELS, REQUEST_TYPE_LABELS, STATUS_FLOW,
  SEVERITY_LABELS, REFUND_METHOD_LABELS,
  SUGGESTED_SOLUTION_LABELS, COMPLAINT_STATUS_LABELS, COMPLAINT_STATUS_FLOW,
  RETURN_STATUS_LABELS, RETURN_STATUS_FLOW, OTHER_STATUS_LABELS, OTHER_STATUS_FLOW,
  Ticket, ComplaintStatus, ReturnStatus, OtherStatus,
  ComplaintType, COMPLAINT_TYPE_LABELS, COMPLAINT_TYPE_ALLOWED_ACTIONS,
  COMPLAINT_TYPE_SUGGESTED_SOLUTION, MOCK_ORDERS, SuggestedSolution,
} from '@/types/ticket';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ArrowLeft, Mail, Package, Hash, AlertTriangle, Banknote,
  FileText, Truck, RotateCcw, User, Calendar, ImageIcon,
  RefreshCw, XCircle, MessageSquare, CheckCircle2, Send, Replace, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { sk } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const WORKFLOW_STATUS_COLORS: Record<string, string> = {
  complaint_new: 'bg-info/15 text-info border-info/30',
  complaint_pickup_ordered: 'bg-primary/15 text-primary border-primary/30',
  complaint_received: 'bg-primary/15 text-primary border-primary/30',
  complaint_inspecting: 'bg-warning/15 text-warning border-warning/30',
  complaint_in_progress: 'bg-warning/15 text-warning border-warning/30',
  complaint_waiting_customer: 'bg-destructive/15 text-destructive border-destructive/30',
  complaint_approved: 'bg-success/15 text-success border-success/30',
  complaint_refund_processing: 'bg-primary/15 text-primary border-primary/30',
  complaint_rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  complaint_resolved: 'bg-muted text-muted-foreground border-muted',
  return_submitted: 'bg-info/15 text-info border-info/30',
  return_received: 'bg-primary/15 text-primary border-primary/30',
  return_inspecting: 'bg-warning/15 text-warning border-warning/30',
  return_refund_processing: 'bg-primary/15 text-primary border-primary/30',
  return_completed: 'bg-muted text-muted-foreground border-muted',
  return_rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  other_submitted: 'bg-info/15 text-info border-info/30',
  other_in_progress: 'bg-warning/15 text-warning border-warning/30',
  other_completed: 'bg-muted text-muted-foreground border-muted',
  other_rejected: 'bg-destructive/15 text-destructive border-destructive/30',
};

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

const getCustomerName = (ticket: Ticket): string => {
  const order = MOCK_ORDERS[ticket.orderNumber];
  return order?.customerName || ticket.customerEmail.split('@')[0];
};

const getWorkflowLabel = (ticket: Ticket): string | undefined => {
  if (ticket.requestType === 'complaint' && ticket.complaintStatus) return COMPLAINT_STATUS_LABELS[ticket.complaintStatus];
  if (ticket.requestType === 'return' && ticket.returnStatus) return RETURN_STATUS_LABELS[ticket.returnStatus];
  if (ticket.requestType === 'other' && ticket.otherStatus) return OTHER_STATUS_LABELS[ticket.otherStatus];
  return undefined;
};

const getWorkflowStatusKey = (ticket: Ticket): string | undefined => {
  if (ticket.requestType === 'complaint') return ticket.complaintStatus;
  if (ticket.requestType === 'return') return ticket.returnStatus;
  if (ticket.requestType === 'other') return ticket.otherStatus;
  return undefined;
};

const InfoRow = ({ label, icon, children, highlight }: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  highlight?: boolean;
}) => (
  <div className={cn(
    'flex items-start gap-3 rounded-lg border p-3',
    highlight ? 'border-warning/50 bg-warning/10' : 'bg-card'
  )}>
    {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
    <div className="min-w-0 flex-1">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
      <div className="text-sm font-medium">{children}</div>
    </div>
  </div>
);

const AdminDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTicket, updateTicketStatus, updateComplaintStatus, updateReturnStatus, updateOtherStatus } = useTickets();

  const ticket = getTicket(id || '');

  if (!ticket) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="font-heading text-2xl font-bold mb-2">Požiadavka nenájdená</h1>
        <p className="text-muted-foreground mb-6">Tiket s ID „{id}“ neexistuje.</p>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Späť na zoznam
        </Button>
      </div>
    );
  }

  const isComplaint = ticket.requestType === 'complaint';
  const complaintType = isComplaint && ticket.issueType && (ticket.issueType as string) in COMPLAINT_TYPE_LABELS
    ? ticket.issueType as ComplaintType : null;
  const workflowLabel = getWorkflowLabel(ticket);
  const workflowKey = getWorkflowStatusKey(ticket);

  const handleAction = (action: SuggestedSolution) => {
    if (action === 'refund') {
      updateComplaintStatus(ticket.id, 'complaint_refund_processing');
      updateTicketStatus(ticket.id, 'refund_processing');
      toast.success('Refundácia zahájená — stav: APPROVED → REFUND_PROCESSING');
    } else {
      updateComplaintStatus(ticket.id, 'complaint_approved');
      updateTicketStatus(ticket.id, 'approved');
      toast.success(`Riešenie schválené: ${SUGGESTED_SOLUTION_LABELS[action]} — stav: APPROVED`);
    }
  };

  const handleReject = () => {
    updateComplaintStatus(ticket.id, 'complaint_rejected');
    updateTicketStatus(ticket.id, 'rejected');
    toast.success('Požiadavka zamietnutá — stav: REJECTED');
  };

  const handleRequestInfo = () => {
    updateComplaintStatus(ticket.id, 'complaint_waiting_customer');
    updateTicketStatus(ticket.id, 'needs_info');
    toast.success('Vyžiadané doplnenie od zákazníka — stav: NEEDS_INFO');
  };


  const handleReturnAction = (status: ReturnStatus) => {
    updateReturnStatus(ticket.id, status);
    if (status === 'return_refund_processing') updateTicketStatus(ticket.id, 'refund_processing');
    if (status === 'return_completed') updateTicketStatus(ticket.id, 'completed');
    if (status === 'return_rejected') updateTicketStatus(ticket.id, 'rejected');
    toast.success(`Stav vrátenia: "${RETURN_STATUS_LABELS[status]}"`);
  };

  const handleOtherAction = (status: OtherStatus) => {
    updateOtherStatus(ticket.id, status);
    if (status === 'other_completed') updateTicketStatus(ticket.id, 'completed');
    if (status === 'other_rejected') updateTicketStatus(ticket.id, 'rejected');
    toast.success(`Stav požiadavky: "${OTHER_STATUS_LABELS[status]}"`);
  };

  const getReturnNextStatuses = (): ReturnStatus[] => {
    if (ticket.returnStatus) return RETURN_STATUS_FLOW[ticket.returnStatus] || [];
    return [];
  };

  const getOtherNextStatuses = (): OtherStatus[] => {
    if (ticket.otherStatus) return OTHER_STATUS_FLOW[ticket.otherStatus] || [];
    return [];
  };

  const RequestTypeIcon = isComplaint ? FileText : ticket.requestType === 'return' ? RotateCcw : Truck;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-bold sm:text-2xl">{ticket.id}</h1>
            <StatusBadge status={ticket.status} />
            {workflowKey && workflowLabel && (
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${WORKFLOW_STATUS_COLORS[workflowKey] || 'bg-secondary text-secondary-foreground'}`}>
                {workflowLabel}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vytvorené {format(new Date(ticket.createdAt), 'd. MMMM yyyy, HH:mm', { locale: sk })}
            {' · '}
            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: sk })}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[7fr_3fr]">
        {/* LEFT — Request details */}
        <div className="space-y-3">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">Detail požiadavky</h2>

          <InfoRow label="Typ požiadavky" icon={<RequestTypeIcon className="h-4 w-4" />}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {REQUEST_TYPE_LABELS[ticket.requestType]}
            </span>
          </InfoRow>

          {complaintType && (
            <InfoRow label="Typ reklamácie" icon={<AlertTriangle className="h-4 w-4 text-warning" />}>
              {COMPLAINT_TYPE_LABELS[complaintType]}
            </InfoRow>
          )}

          <InfoRow label="Stav">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={ticket.status} />
              {workflowKey && workflowLabel && (
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${WORKFLOW_STATUS_COLORS[workflowKey] || 'bg-secondary text-secondary-foreground'}`}>
                  {workflowLabel}
                </span>
              )}
            </div>
          </InfoRow>

          <InfoRow label="Zákazník" icon={<User className="h-4 w-4" />}>
            <div>
              <div className="font-semibold">{getCustomerName(ticket)}</div>
              <div className="text-xs text-muted-foreground">{ticket.customerEmail}</div>
            </div>
          </InfoRow>

          <InfoRow label="Produkt" icon={<Package className="h-4 w-4" />}>
            {ticket.product}
          </InfoRow>

          <InfoRow label="Objednávka" icon={<Hash className="h-4 w-4" />}>
            {ticket.orderNumber}
          </InfoRow>

          {ticket.severity && (
            <InfoRow label="Závažnosť">
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                  ticket.severity === 'critical' ? 'bg-destructive' :
                  ticket.severity === 'high' ? 'bg-warning' :
                  ticket.severity === 'medium' ? 'bg-info' : 'bg-success'
                }`} />
                {SEVERITY_LABELS[ticket.severity]}
              </div>
            </InfoRow>
          )}

          <InfoRow label="Popis">
            <p className="whitespace-pre-wrap">{ticket.description}</p>
          </InfoRow>

          {ticket.attachments.length > 0 && (
            <InfoRow label="Prílohy" icon={<ImageIcon className="h-4 w-4" />}>
              <div className="flex flex-wrap gap-2 pt-1">
                {ticket.attachments.map((src, i) => (
                  <img key={i} src={src} alt={`Príloha ${i + 1}`} className="h-24 w-24 rounded-lg border object-cover" />
                ))}
              </div>
            </InfoRow>
          )}

          {ticket.refundMethod && (
            <InfoRow label="Spôsob vrátenia" icon={<Banknote className="h-4 w-4" />}>
              {REFUND_METHOD_LABELS[ticket.refundMethod]}
            </InfoRow>
          )}

          {ticket.iban && (
            <InfoRow label="IBAN" icon={<Banknote className="h-4 w-4 text-warning" />} highlight>
              <span className="font-mono text-base font-bold tracking-wider">{ticket.iban}</span>
            </InfoRow>
          )}
        </div>

        {/* RIGHT — Actions */}
        <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">Akcie</h2>

          {/* Suggested solution for complaints */}
          {complaintType && (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-4">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Navrhované riešenie</div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary fill-primary" />
                  <span className="text-base font-bold text-primary">
                    {SUGGESTED_SOLUTION_LABELS[COMPLAINT_TYPE_SUGGESTED_SOLUTION[complaintType]]}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Dostupné akcie</div>
                <div className="grid gap-2">
                  {COMPLAINT_TYPE_ALLOWED_ACTIONS[complaintType].map(action => {
                    const Icon = ACTION_ICONS[action] || CheckCircle2;
                    const isSuggested = action === COMPLAINT_TYPE_SUGGESTED_SOLUTION[complaintType];
                    return (
                      <button key={action} onClick={() => handleAction(action)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition-all text-left',
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
              </div>

              <div className="border-t border-primary/20 pt-3 space-y-2">
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

          {/* Return actions */}
          {ticket.requestType === 'return' && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Akcie vrátenia</div>
              <div className="grid gap-2">
                {getReturnNextStatuses().map(ns => (
                  <button key={ns} onClick={() => handleReturnAction(ns)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition-all',
                      ns.includes('rejected') ? 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20'
                        : ns.includes('completed') ? 'border-success/30 bg-success/10 text-success hover:bg-success/20'
                        : 'bg-card text-foreground hover:bg-accent'
                    )}>
                    {RETURN_STATUS_LABELS[ns]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Other actions */}
          {ticket.requestType === 'other' && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Akcie</div>
              <div className="grid gap-2">
                {getOtherNextStatuses().map(ns => (
                  <button key={ns} onClick={() => handleOtherAction(ns)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition-all',
                      ns.includes('rejected') ? 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20'
                        : ns.includes('completed') ? 'border-success/30 bg-success/10 text-success hover:bg-success/20'
                        : 'bg-card text-foreground hover:bg-accent'
                    )}>
                    {OTHER_STATUS_LABELS[ns]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp info */}
          <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Časová os</div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Vytvorené: {format(new Date(ticket.createdAt), 'd. MMM yyyy, HH:mm', { locale: sk })}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Aktualizované: {format(new Date(ticket.updatedAt), 'd. MMM yyyy, HH:mm', { locale: sk })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDetail;
