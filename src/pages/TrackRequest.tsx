import { useState } from 'react';
import { z } from 'zod';
import { useTickets } from '@/context/TicketContext';
import {
  REQUEST_TYPE_LABELS, SEVERITY_LABELS, REFUND_METHOD_LABELS,
  ISSUE_TYPE_LABELS, SUGGESTED_SOLUTION_LABELS,
  COMPLAINT_STATUS_LABELS, RETURN_STATUS_LABELS, OTHER_STATUS_LABELS,
  COMPLAINT_STATUS_FLOW, RETURN_STATUS_FLOW, OTHER_STATUS_FLOW,
  COMPLAINT_TYPE_LABELS, COMPLAINT_ITEM_STATUS_LABELS, REQUESTED_RESOLUTION_LABELS,
  Ticket, ComplaintStatus, ReturnStatus, OtherStatus, ComplaintType,
} from '@/types/ticket';
import { Button } from '@/components/ui/button';
import {
  Search, Mail, Hash, Package, AlertTriangle, Banknote, Clock,
  CheckCircle2, Circle, FileText, RotateCcw, Truck, RefreshCw, CalendarDays, Bell,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { sk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/use-notifications';

const searchSchema = z.object({
  email: z.string().trim().email({ message: 'Prosím zadajte platnú e-mailovú adresu' }).max(255),
  orderNumber: z.string().trim().min(1, { message: 'Prosím zadajte číslo objednávky' }).max(50),
});

// Build the full workflow path for a ticket
const getWorkflowTimeline = (ticket: Ticket): { key: string; label: string; done: boolean; current: boolean }[] => {
  if (ticket.requestType === 'complaint' && ticket.complaintStatus) {
    const allStatuses = Object.keys(COMPLAINT_STATUS_LABELS) as ComplaintStatus[];
    const flow = COMPLAINT_STATUS_FLOW;
    return buildTimeline(allStatuses, ticket.complaintStatus, flow, COMPLAINT_STATUS_LABELS);
  }
  if (ticket.requestType === 'return' && ticket.returnStatus) {
    const allStatuses = Object.keys(RETURN_STATUS_LABELS) as ReturnStatus[];
    const flow = RETURN_STATUS_FLOW;
    return buildTimeline(allStatuses, ticket.returnStatus, flow, RETURN_STATUS_LABELS);
  }
  if (ticket.requestType === 'other' && ticket.otherStatus) {
    const allStatuses = Object.keys(OTHER_STATUS_LABELS) as OtherStatus[];
    const flow = OTHER_STATUS_FLOW;
    return buildTimeline(allStatuses, ticket.otherStatus, flow, OTHER_STATUS_LABELS);
  }
  return [];
};

function buildTimeline<T extends string>(
  allStatuses: T[],
  currentStatus: T,
  flow: Record<T, T[]>,
  labels: Record<T, string>,
): { key: string; label: string; done: boolean; current: boolean }[] {
  // BFS to find path from first status to current
  const start = allStatuses[0];
  const visited = new Set<T>();
  const parent = new Map<T, T | null>();
  const queue: T[] = [start];
  visited.add(start);
  parent.set(start, null);

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === currentStatus) break;
    for (const next of (flow[node] || [])) {
      if (!visited.has(next)) {
        visited.add(next);
        parent.set(next, node);
        queue.push(next);
      }
    }
  }

  // Reconstruct path
  const path: T[] = [];
  let cur: T | null = currentStatus;
  while (cur !== null) {
    path.unshift(cur);
    cur = parent.get(cur) ?? null;
    if (cur && path.includes(cur)) break; // safety
  }

  // Add future possible steps (first option from flow)
  let last = path[path.length - 1];
  const futureSteps: T[] = [];
  for (let i = 0; i < 3; i++) {
    const nexts = flow[last];
    if (!nexts || nexts.length === 0) break;
    const next = nexts[0]; // take the primary path
    if (path.includes(next) || futureSteps.includes(next)) break;
    futureSteps.push(next);
    last = next;
  }

  const currentIdx = path.length - 1;

  return [
    ...path.map((s, i) => ({
      key: s,
      label: labels[s],
      done: i < currentIdx,
      current: i === currentIdx,
    })),
    ...futureSteps.map(s => ({
      key: s,
      label: labels[s],
      done: false,
      current: false,
    })),
  ];
}

const getTypeIcon = (type: string) => {
  if (type === 'complaint') return FileText;
  if (type === 'return') return RotateCcw;
  return Truck;
};

const getTypeColor = (type: string) => {
  if (type === 'complaint') return 'bg-warning/15 text-warning border-warning/30';
  if (type === 'return') return 'bg-info/15 text-info border-info/30';
  return 'bg-primary/15 text-primary border-primary/30';
};

const WorkflowTimeline = ({ ticket }: { ticket: Ticket }) => {
  const steps = getWorkflowTimeline(ticket);

  if (steps.length === 0) return null;

  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-stretch gap-3">
          {/* Vertical line + dot */}
          <div className="flex flex-col items-center">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
              step.current
                ? 'border-primary bg-primary text-primary-foreground'
                : step.done
                  ? 'border-success bg-success text-success-foreground'
                  : 'border-border bg-muted text-muted-foreground'
            }`}>
              {step.done ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : step.current ? (
                <Clock className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-0.5 flex-1 min-h-[16px] ${
                step.done ? 'bg-success/40' : 'bg-border'
              }`} />
            )}
          </div>
          {/* Label */}
          <div className={`pb-3 pt-1 ${step.current ? '' : step.done ? '' : 'opacity-50'}`}>
            <span className={`text-sm font-medium ${
              step.current ? 'text-primary font-semibold' : step.done ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {step.label}
            </span>
            {step.current && (
              <span className="ml-2 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Aktuálny stav
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const TrackRequest = () => {
  const { tickets } = useTickets();
  const [email, setEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [results, setResults] = useState<Ticket[] | null>(null);
  const [errors, setErrors] = useState<{ email?: string; orderNumber?: string }>({});
  const [searched, setSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = searchSchema.safeParse({ email, orderNumber });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      parsed.error.errors.forEach(err => {
        const field = err.path[0] as keyof typeof errors;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSearched(true);
    const found = tickets.filter(
      t => t.customerEmail.toLowerCase() === parsed.data.email.toLowerCase() &&
           t.orderNumber.toLowerCase() === parsed.data.orderNumber.toLowerCase()
    );
    setResults(found);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">Sledujte vašu požiadavku</h1>
        <p className="mt-1 text-muted-foreground">Zadajte váš email a číslo objednávky na zistenie stavu vašej požiadavky.</p>
      </div>

      <form onSubmit={handleSearch} className="mb-8 rounded-xl border bg-card p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">E-mailová adresa</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="vas@email.com"
                className={`w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${errors.email ? 'border-destructive' : ''}`} />
            </div>
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Číslo objednávky</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={orderNumber} onChange={e => setOrderNumber(e.target.value)}
                placeholder="ORD-XXXXX"
                className={`w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${errors.orderNumber ? 'border-destructive' : ''}`} />
            </div>
            {errors.orderNumber && <p className="mt-1 text-xs text-destructive">{errors.orderNumber}</p>}
          </div>
        </div>
        <Button type="submit" className="mt-4 w-full gap-2">
          <Search className="h-4 w-4" /> Vyhľadať požiadavku
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Skúste: jana@example.com / ORD-10042 alebo marek@example.com / ORD-10038
        </p>
      </form>

      {searched && results !== null && (
        <>
          {results.length === 0 ? (
            <div className="rounded-xl border bg-card py-12 text-center">
              <p className="text-muted-foreground">Pre tento email a číslo objednávky neboli nájdené žiadne požiadavky.</p>
              <p className="mt-1 text-sm text-muted-foreground">Skontrolujte svoje údaje a skúste to znova.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                {results.length} {results.length === 1 ? 'požiadavka nájdená' : results.length < 5 ? 'požiadavky nájdené' : 'požiadaviek nájdených'}
              </p>
              {results.map(ticket => {
                const TypeIcon = getTypeIcon(ticket.requestType);
                const typeColor = getTypeColor(ticket.requestType);
                return (
                  <div key={ticket.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="border-b bg-secondary/30 px-5 py-3 flex flex-wrap items-center gap-2">
                      <span className="font-heading text-sm font-bold">{ticket.id}</span>
                      <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${typeColor}`}>
                        <TypeIcon className="h-3 w-3" />
                        {REQUEST_TYPE_LABELS[ticket.requestType]}
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(ticket.createdAt), 'd. MMM yyyy', { locale: sk })}
                      </span>
                    </div>

                    <div className="p-5 space-y-5">
                      {/* Current status highlight */}
                      <div className={cn(
                        'rounded-lg border p-4',
                        ticket.status === 'needs_info' || ticket.status === 'suspended'
                          ? 'bg-warning/10 border-warning/30'
                          : 'bg-primary/5 border-primary/20'
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Aktuálny stav</span>
                        </div>
                        <p className={cn(
                          'text-lg font-bold',
                          (ticket.status === 'needs_info' || ticket.status === 'suspended') ? 'text-warning' : 'text-primary'
                        )}>
                          {ticket.status === 'suspended'
                            ? 'Pozastavené – čaká sa na doplnenie'
                            : ticket.requestType === 'complaint' && ticket.complaintStatus
                              ? COMPLAINT_STATUS_LABELS[ticket.complaintStatus]
                              : ticket.requestType === 'return' && ticket.returnStatus
                                ? RETURN_STATUS_LABELS[ticket.returnStatus]
                                : ticket.requestType === 'other' && ticket.otherStatus
                                  ? OTHER_STATUS_LABELS[ticket.otherStatus]
                                  : 'Nový'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Aktualizované {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true, locale: sk })}
                        </p>
                      </div>

                      {/* Info request alert for customer */}
                      {(ticket.status === 'needs_info' || ticket.status === 'suspended') && ticket.infoRequests && ticket.infoRequests.length > 0 && (
                        <div className="rounded-lg border-2 border-warning/40 bg-warning/10 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                            <p className="text-sm font-semibold text-warning">
                              {ticket.status === 'suspended'
                                ? 'Vaša požiadavka bola pozastavená'
                                : 'Čakáme na doplnenie informácií'}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {ticket.status === 'suspended'
                              ? 'Vaša požiadavka bola pozastavená z dôvodu chýbajúcich informácií. Prosíme, kontaktujte nás čo najskôr.'
                              : 'Prosíme, doplňte požadované údaje, aby sme mohli pokračovať.'}
                          </p>
                          <div className="rounded-lg border border-warning/20 bg-card p-3">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Požadované informácie</p>
                            <p className="text-sm font-medium">{ticket.infoRequests[ticket.infoRequests.length - 1].message}</p>
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      <div>
                        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Priebeh spracovania</h3>
                        <WorkflowTimeline ticket={ticket} />
                      </div>

                      {/* Per-item details for complaints */}
                      {ticket.complaintItems && ticket.complaintItems.length > 0 && (
                        <div>
                          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Reklamované položky</h3>
                          <div className="space-y-3">
                            {ticket.complaintItems.map((item, i) => {
                              const reasonLabel = COMPLAINT_TYPE_LABELS[item.complaintReason as ComplaintType] || item.complaintReason;
                              const statusLabel = COMPLAINT_ITEM_STATUS_LABELS[item.itemStatus] || 'Neznámy stav';
                              const isFinal = item.itemStatus === 'item_completed' || item.itemStatus === 'item_rejected';
                              return (
                                <div key={i} className="rounded-lg border bg-secondary/30 p-4 space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <span className="text-sm font-semibold">{item.productName}</span>
                                      <span className="text-xs text-muted-foreground">({item.quantity}×)</span>
                                    </div>
                                    <span className={cn(
                                      'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
                                      isFinal && item.itemStatus === 'item_completed' ? 'bg-success/15 text-success border-success/30' :
                                      isFinal && item.itemStatus === 'item_rejected' ? 'bg-destructive/15 text-destructive border-destructive/30' :
                                      'bg-primary/15 text-primary border-primary/30'
                                    )}>
                                      {statusLabel}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-muted-foreground">Dôvod:</span>{' '}
                                      <span className="font-medium">{reasonLabel}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Požadované riešenie:</span>{' '}
                                      <span className="font-medium">{REQUESTED_RESOLUTION_LABELS[item.requestedResolution]}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Per-item details for returns */}
                      {ticket.returnItems && ticket.returnItems.length > 0 && (
                        <div>
                          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Vrátené položky</h3>
                          <div className="space-y-2">
                            {ticket.returnItems.map((item, i) => (
                              <div key={i} className="flex items-center gap-2 rounded-lg border bg-secondary/30 px-4 py-3">
                                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-semibold">{item.name}</span>
                                <span className="text-xs text-muted-foreground">({item.quantity}×)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fallback: global product info (for "other" requests or tickets without items) */}
                      {!ticket.complaintItems?.length && !ticket.returnItems?.length && (
                        <div>
                          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Detaily požiadavky</h3>
                          <div className="grid gap-2 text-sm sm:grid-cols-2">
                            <div className="flex items-center gap-2 rounded-lg border bg-secondary/30 px-3 py-2">
                              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div>
                                <span className="text-[11px] text-muted-foreground">Produkt</span>
                                <p className="font-medium leading-tight">{ticket.product}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Additional details (severity, refund method) */}
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        {ticket.severity && (
                          <div className="flex items-center gap-2 rounded-lg border bg-secondary/30 px-3 py-2">
                            <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${
                              ticket.severity === 'critical' ? 'bg-destructive' :
                              ticket.severity === 'high' ? 'bg-warning' :
                              ticket.severity === 'medium' ? 'bg-info' : 'bg-success'
                            }`} />
                            <div>
                              <span className="text-[11px] text-muted-foreground">Závažnosť</span>
                              <p className="font-medium leading-tight">{SEVERITY_LABELS[ticket.severity]}</p>
                            </div>
                          </div>
                        )}
                        {ticket.refundMethod && (
                          <div className="flex items-center gap-2 rounded-lg border bg-secondary/30 px-3 py-2">
                            <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <span className="text-[11px] text-muted-foreground">Spôsob vrátenia</span>
                              <p className="font-medium leading-tight">{REFUND_METHOD_LABELS[ticket.refundMethod]}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <div className="rounded-lg border bg-secondary/30 p-3">
                        <span className="text-[11px] font-medium text-muted-foreground">Popis</span>
                        <p className="mt-1 text-sm">{ticket.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TrackRequest;
