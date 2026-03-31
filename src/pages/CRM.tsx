import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '@/context/TicketContext';
import {
  TicketStatus, STATUS_LABELS, REQUEST_TYPE_LABELS,
  SUGGESTED_SOLUTION_LABELS,
  COMPLAINT_STATUS_LABELS, RETURN_STATUS_LABELS, OTHER_STATUS_LABELS,
  RequestType, Ticket,
  ComplaintType, COMPLAINT_TYPE_LABELS, COMPLAINT_TYPE_SUGGESTED_SOLUTION,
  REQUESTED_RESOLUTION_LABELS, MOCK_ORDERS, OTHER_SUBTYPE_LABELS, ASSIGNED_TEAM_LABELS,
  getDerivedTicketStatus, DERIVED_TICKET_STATUS_LABELS, DERIVED_TICKET_STATUS_COLORS,
} from '@/types/ticket';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, RotateCcw, AlertTriangle, Clock, CheckCircle2, Building2, PlusCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { sk } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DecisionTree, DecisionTreeResult } from '@/components/DecisionTree';
import { ReturnForm } from '@/components/ReturnForm';
import { ComplaintForm } from '@/components/ComplaintForm';
import { OtherRequestForm } from '@/components/OtherRequestForm';

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

const TYPE_CONFIG: Record<RequestType, { icon: typeof AlertTriangle; bg: string; text: string; border: string }> = {
  complaint: { icon: AlertTriangle, bg: 'bg-warning/8', text: 'text-warning/80', border: 'border-warning/25' },
  return: { icon: RotateCcw, bg: 'bg-info/8', text: 'text-info/80', border: 'border-info/25' },
  other: { icon: Building2, bg: 'bg-muted/60', text: 'text-muted-foreground', border: 'border-border' },
};

const getCustomerName = (ticket: Ticket): string => {
  const order = MOCK_ORDERS[ticket.orderNumber];
  return order?.customerName || ticket.customerEmail.split('@')[0];
};

type DeadlineLevel = 'ok' | 'warning' | 'critical';

const getDeadlineInfo = (ticket: Ticket): { days: number; limit: number; warnAt: number; level: DeadlineLevel } | null => {
  if (!ticket.warehouseReceipt) return null;
  const days = differenceInDays(new Date(), new Date(ticket.warehouseReceipt.receivedAt));
  const isReturn = ticket.requestType === 'return';
  const limit = isReturn ? 14 : 30;
  const warnAt = isReturn ? 10 : 25;
  const level: DeadlineLevel = days > limit ? 'critical' : days >= warnAt ? 'warning' : 'ok';
  return { days, limit, warnAt, level };
};

// Simulated current CRM user
const CRM_USER_EMAIL = 'oz@firma.sk';
const CRM_USER_TEAM = 'customer_care' as const;

type CreateMode = null | 'select' | 'return' | 'complaint' | 'other';

const CRM = () => {
  const navigate = useNavigate();
  const { tickets } = useTickets();
  const [typeFilter, setTypeFilter] = useState<RequestType | 'all' | 'my_assigned'>('my_assigned');
  const [search, setSearch] = useState('');
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [treeResult, setTreeResult] = useState<DecisionTreeResult | null>(null);

  // Show only tickets created by this CRM user
  const myTickets = useMemo(() => tickets.filter(t => t.createdBy === CRM_USER_EMAIL), [tickets]);

  const filtered = useMemo(() => {
    const list = myTickets.filter(t => {
      if (typeFilter !== 'all' && t.requestType !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.id.toLowerCase().includes(q) || t.customerEmail.toLowerCase().includes(q) || t.orderNumber.toLowerCase().includes(q) || t.product.toLowerCase().includes(q) || getCustomerName(t).toLowerCase().includes(q);
      }
      return true;
    });

    const levelOrder = { critical: 0, warning: 1, ok: 2 };
    return list.sort((a, b) => {
      const aInternal = a.requestType === 'other';
      const bInternal = b.requestType === 'other';
      if (aInternal && !bInternal) return 1;
      if (!aInternal && bInternal) return -1;
      if (aInternal && bInternal) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      const da = getDeadlineInfo(a);
      const db = getDeadlineInfo(b);
      if (da && !db) return -1;
      if (!da && db) return 1;
      if (!da && !db) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      const levelDiff = levelOrder[da!.level] - levelOrder[db!.level];
      if (levelDiff !== 0) return levelDiff;
      return db!.days - da!.days;
    });
  }, [myTickets, typeFilter, search]);

  const resetCreate = () => {
    setCreateMode(null);
    setTreeResult(null);
  };

  // Creation flows – pass createdBy so tickets are attributed to CRM user
  if (createMode === 'return') {
    return <ReturnForm treeResult={treeResult} onBack={resetCreate} onSubmit={resetCreate} createdBy={CRM_USER_EMAIL} />;
  }
  if (createMode === 'complaint') {
    return <ComplaintForm treeResult={treeResult} onBack={resetCreate} onSubmit={resetCreate} createdBy={CRM_USER_EMAIL} />;
  }
  if (createMode === 'other') {
    return <OtherRequestForm onBack={resetCreate} onSubmit={resetCreate} createdBy={CRM_USER_EMAIL} />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">CRM – Obchodný zástupca</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">Moje požiadavky</Badge>
            <span className="text-sm text-muted-foreground">{CRM_USER_EMAIL}</span>
          </div>
        </div>
      </div>

      {/* New request button + selection */}
      {createMode === 'select' ? (
        <div className="mb-6 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold font-heading">Vybrať typ požiadavky</span>
            <button onClick={resetCreate} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              { key: 'return' as const, label: 'Vrátenie tovaru', icon: RotateCcw, desc: 'Odstúpenie od zmluvy' },
              { key: 'complaint' as const, label: 'Reklamácia', icon: AlertTriangle, desc: 'Reklamácia vady tovaru' },
              { key: 'other' as const, label: 'Interná požiadavka (OZ)', icon: Building2, desc: 'Interná firemná požiadavka' },
            ]).map(({ key, label, icon: Icon, desc }) => {
              const config = TYPE_CONFIG[key];
              return (
                <button
                  key={key}
                  onClick={() => setCreateMode(key)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border-2 p-5 text-center transition-all hover:shadow-md',
                    'border-border hover:border-primary/50 hover:bg-accent/50'
                  )}
                >
                  <div className={cn('rounded-full p-3', config.bg)}>
                    <Icon className={cn('h-5 w-5', config.text)} />
                  </div>
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <Button onClick={() => setCreateMode('select')} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Nová požiadavka
          </Button>
        </div>
      )}

      {/* Quick type filters */}
      <div className="mb-4 flex items-center gap-1.5 flex-wrap">
        {([['all', 'Všetky'], ['return', 'Vrátenie'], ['complaint', 'Reklamácie'], ['other', 'Interné']] as [('all' | RequestType), string][]).map(([key, label]) => {
          const active = typeFilter === key;
          const config = key !== 'all' ? TYPE_CONFIG[key] : null;
          const Icon = config?.icon;
          const count = key === 'all' ? myTickets.length : myTickets.filter(t => t.requestType === key).length;
          return (
            <button
              key={key}
              onClick={() => setTypeFilter(active && key !== 'all' ? 'all' : key === 'all' ? 'all' : key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {label}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
              )}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Hľadať podľa ID, mena, emailu, objednávky..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {/* Section label + results count */}
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-heading text-lg font-semibold">Moje požiadavky</h2>
        <span className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'požiadavka' : filtered.length < 5 ? 'požiadavky' : 'požiadaviek'}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[120px]">ID</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Typ / Dôvod</TableHead>
              <TableHead>Podtyp</TableHead>
              <TableHead>Priradené</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead>Navrhované riešenie</TableHead>
              <TableHead>Požiadavka zákazníka</TableHead>
              <TableHead>Zákazník</TableHead>
              <TableHead className="text-right">Dátum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  Žiadne požiadavky neboli nájdené.
                </TableCell>
              </TableRow>
            )}
            {filtered.map(ticket => {
              const workflowLabel = getWorkflowLabel(ticket);
              const workflowKey = getWorkflowStatusKey(ticket);
              const typeConfig = TYPE_CONFIG[ticket.requestType];
              const TypeIcon = typeConfig.icon;
              const isComplaint = ticket.requestType === 'complaint';
              const complaintType = isComplaint && ticket.issueType && (ticket.issueType as string) in COMPLAINT_TYPE_LABELS
                ? ticket.issueType as ComplaintType : null;
              const deadline = getDeadlineInfo(ticket);

              return (
                <TableRow
                  key={ticket.id}
                  className={cn(
                    'cursor-pointer transition-colors',
                    deadline?.level === 'critical' && 'bg-destructive/8 hover:bg-destructive/15 border-l-[5px] border-l-destructive',
                    deadline?.level === 'warning' && 'bg-warning/8 hover:bg-warning/15 border-l-[5px] border-l-warning',
                    deadline?.level === 'ok' && 'border-l-[5px] border-l-success/60 hover:bg-accent/50',
                    !deadline && 'hover:bg-accent/50'
                  )}
                  onClick={() => navigate(`/admin/${ticket.id}`)}
                >
                  <TableCell className="font-heading font-bold text-sm">{ticket.id}</TableCell>
                  <TableCell>
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold',
                      typeConfig.bg, typeConfig.text, typeConfig.border
                    )}>
                      <TypeIcon className="h-3 w-3" />
                      {REQUEST_TYPE_LABELS[ticket.requestType]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {complaintType ? (
                      <span className="text-xs font-medium">{COMPLAINT_TYPE_LABELS[complaintType]}</span>
                    ) : ticket.requestType === 'return' ? (
                      <span className="text-xs font-medium">Odstúpenie od zmluvy</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {ticket.otherSubtype ? (
                      <span className="text-xs font-medium">{OTHER_SUBTYPE_LABELS[ticket.otherSubtype]}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {ticket.assignedTo ? (
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                        ticket.assignedTo === 'sklad' ? 'bg-warning/15 text-warning border-warning/30' : 'bg-info/15 text-info border-info/30'
                      )}>
                        {ASSIGNED_TEAM_LABELS[ticket.assignedTo]}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {(() => {
                        const derived = getDerivedTicketStatus(ticket);
                        if (derived) {
                          return (
                            <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${DERIVED_TICKET_STATUS_COLORS[derived]}`}>
                              {DERIVED_TICKET_STATUS_LABELS[derived]}
                            </span>
                          );
                        }
                        return <StatusBadge status={ticket.status} />;
                      })()}
                      {workflowKey && workflowLabel && (
                        <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${WORKFLOW_STATUS_COLORS[workflowKey] || 'bg-secondary text-secondary-foreground'}`}>
                          {workflowLabel}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {complaintType ? (
                      <span className="text-xs font-medium">
                        {SUGGESTED_SOLUTION_LABELS[COMPLAINT_TYPE_SUGGESTED_SOLUTION[complaintType]]}
                      </span>
                    ) : ticket.requestType === 'return' ? (
                      <span className="text-xs font-medium">Vrátenie finančných prostriedkov</span>
                    ) : ticket.suggestedSolution ? (
                      <span className="text-xs font-medium">{SUGGESTED_SOLUTION_LABELS[ticket.suggestedSolution]}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {ticket.requestedResolution ? (
                      <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                        {REQUESTED_RESOLUTION_LABELS[ticket.requestedResolution]}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{getCustomerName(ticket)}</span>
                      <span className="text-[11px] text-muted-foreground">{ticket.customerEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-xs">{format(new Date(ticket.createdAt), 'd. MMM yyyy', { locale: sk })}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: sk })}
                      </span>
                      {deadline && (
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border',
                          deadline.level === 'critical' && 'bg-destructive/15 text-destructive border-destructive/30',
                          deadline.level === 'warning' && 'bg-warning/15 text-warning border-warning/30',
                          deadline.level === 'ok' && 'bg-success/15 text-success border-success/30'
                        )}>
                          {deadline.level === 'critical' && <AlertTriangle className="h-3 w-3" />}
                          {deadline.level === 'warning' && <Clock className="h-3 w-3" />}
                          {deadline.level === 'ok' && <CheckCircle2 className="h-3 w-3" />}
                          {deadline.days}/{deadline.limit}d
                          {deadline.level === 'critical' && ' · Po termíne'}
                          {deadline.level === 'warning' && ' · Blíži sa'}
                          {deadline.level === 'ok' && ' · OK'}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CRM;
