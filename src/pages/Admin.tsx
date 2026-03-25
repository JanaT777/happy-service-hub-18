import { useState, useMemo } from 'react';
import { useTickets } from '@/context/TicketContext';
import {
  TicketStatus, STATUS_LABELS, REQUEST_TYPE_LABELS, STATUS_FLOW,
  ISSUE_TYPE_LABELS, SEVERITY_LABELS, REFUND_METHOD_LABELS,
  SUGGESTED_SOLUTION_LABELS, COMPLAINT_STATUS_LABELS, COMPLAINT_STATUS_FLOW,
  RETURN_STATUS_LABELS, RETURN_STATUS_FLOW, OTHER_STATUS_LABELS, OTHER_STATUS_FLOW,
  RequestType, Ticket, ComplaintStatus, ReturnStatus, OtherStatus,
  ComplaintType, COMPLAINT_TYPE_LABELS, COMPLAINT_TYPE_ALLOWED_ACTIONS,
  COMPLAINT_TYPE_SUGGESTED_SOLUTION,
} from '@/types/ticket';
import { StatusBadge } from '@/components/StatusBadge';
import { Search, ChevronDown, Clock, Mail, Package, Hash, AlertTriangle, Banknote, Filter, X, CalendarIcon, RefreshCw, FileText, Truck, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, isBefore, isAfter, startOfDay, endOfDay, subDays, format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

type Section = 'all' | 'new' | 'in_review' | 'returns_approval' | 'complaints_review' | 'refunds';

const SECTION_CONFIG: { key: Section; label: string; filter: (t: Ticket) => boolean }[] = [
  { key: 'all', label: 'Všetky tikety', filter: () => true },
  { key: 'new', label: 'Nové tikety', filter: t => t.status === 'new' },
  { key: 'in_review', label: 'V preskúmaní', filter: t => t.status === 'in_review' },
  { key: 'returns_approval', label: 'Vrátenia na schválenie', filter: t => t.requestType === 'return' && (t.status === 'in_review' || t.status === 'approved') },
  { key: 'complaints_review', label: 'Reklamácie na posúdenie', filter: t => t.requestType === 'complaint' && (t.status === 'new' || t.status === 'in_review') },
  { key: 'refunds', label: 'Vrátenia peňazí', filter: t => t.status === 'refund_processing' },
];

const ALL_STATUSES: TicketStatus[] = ['new', 'in_review', 'approved', 'rejected', 'refund_processing', 'completed'];
const ALL_REQUEST_TYPES: RequestType[] = ['return', 'complaint', 'other'];

const DATE_PRESETS = [
  { label: 'Dnes', days: 0 },
  { label: 'Posledných 7 dní', days: 7 },
  { label: 'Posledných 30 dní', days: 30 },
];

const WORKFLOW_STATUS_COLORS: Record<string, string> = {
  // Complaint
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
  // Return
  return_submitted: 'bg-info/15 text-info border-info/30',
  return_received: 'bg-primary/15 text-primary border-primary/30',
  return_inspecting: 'bg-warning/15 text-warning border-warning/30',
  return_refund_processing: 'bg-primary/15 text-primary border-primary/30',
  return_completed: 'bg-muted text-muted-foreground border-muted',
  return_rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  // Other
  other_submitted: 'bg-info/15 text-info border-info/30',
  other_in_progress: 'bg-warning/15 text-warning border-warning/30',
  other_completed: 'bg-muted text-muted-foreground border-muted',
  other_rejected: 'bg-destructive/15 text-destructive border-destructive/30',
};

const getActionColor = (status: string) => {
  if (status.includes('completed') || status.includes('resolved') || status.includes('approved'))
    return 'bg-success text-success-foreground hover:bg-success/90';
  if (status.includes('rejected'))
    return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
  if (status.includes('refund'))
    return 'bg-primary text-primary-foreground hover:bg-primary/90';
  if (status.includes('waiting'))
    return 'bg-destructive/80 text-destructive-foreground hover:bg-destructive/70';
  if (status.includes('in_progress'))
    return 'bg-warning text-warning-foreground hover:bg-warning/90';
  return 'bg-secondary text-secondary-foreground hover:bg-muted';
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

const getWorkflowIcon = (type: RequestType) => {
  if (type === 'complaint') return FileText;
  if (type === 'return') return RotateCcw;
  return Truck;
};

const Admin = () => {
  const { tickets, updateTicketStatus, updateComplaintStatus, updateReturnStatus, updateOtherStatus } = useTickets();
  const [activeSection, setActiveSection] = useState<Section>('all');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<RequestType | 'all'>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    const sectionFilter = SECTION_CONFIG.find(s => s.key === activeSection)!.filter;
    return tickets.filter(t => {
      if (!sectionFilter(t)) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (typeFilter !== 'all' && t.requestType !== typeFilter) return false;
      if (dateFrom && isBefore(new Date(t.createdAt), startOfDay(dateFrom))) return false;
      if (dateTo && isAfter(new Date(t.createdAt), endOfDay(dateTo))) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.id.toLowerCase().includes(q) || t.customerEmail.toLowerCase().includes(q) || t.orderNumber.toLowerCase().includes(q) || t.product.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tickets, activeSection, statusFilter, typeFilter, dateFrom, dateTo, search]);

  const handleStatusChange = (id: string, newStatus: TicketStatus) => {
    updateTicketStatus(id, newStatus);
    toast.success(`Tiket aktualizovaný na ${STATUS_LABELS[newStatus]}`);
  };

  const handleWorkflowChange = (ticket: Ticket, newStatus: string) => {
    if (ticket.requestType === 'complaint') {
      updateComplaintStatus(ticket.id, newStatus as ComplaintStatus);
      toast.success(`Stav reklamácie: "${COMPLAINT_STATUS_LABELS[newStatus as ComplaintStatus]}"`);
    } else if (ticket.requestType === 'return') {
      updateReturnStatus(ticket.id, newStatus as ReturnStatus);
      toast.success(`Stav vrátenia: "${RETURN_STATUS_LABELS[newStatus as ReturnStatus]}"`);
    } else {
      updateOtherStatus(ticket.id, newStatus as OtherStatus);
      toast.success(`Stav požiadavky: "${OTHER_STATUS_LABELS[newStatus as OtherStatus]}"`);
    }
  };

  const getNextStatuses = (ticket: Ticket): string[] => {
    if (ticket.requestType === 'complaint' && ticket.complaintStatus) return COMPLAINT_STATUS_FLOW[ticket.complaintStatus] || [];
    if (ticket.requestType === 'return' && ticket.returnStatus) return RETURN_STATUS_FLOW[ticket.returnStatus] || [];
    if (ticket.requestType === 'other' && ticket.otherStatus) return OTHER_STATUS_FLOW[ticket.otherStatus] || [];
    return [];
  };

  const getStatusLabel = (ticket: Ticket, status: string): string => {
    if (ticket.requestType === 'complaint') return COMPLAINT_STATUS_LABELS[status as ComplaintStatus] || status;
    if (ticket.requestType === 'return') return RETURN_STATUS_LABELS[status as ReturnStatus] || status;
    return OTHER_STATUS_LABELS[status as OtherStatus] || status;
  };

  const sectionCounts = useMemo(() =>
    SECTION_CONFIG.reduce((acc, s) => {
      acc[s.key] = tickets.filter(s.filter).length;
      return acc;
    }, {} as Record<Section, number>),
    [tickets]
  );

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearch('');
  };

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || !!dateFrom || !!dateTo || !!search;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">Prehľad podpory</h1>
        <p className="text-muted-foreground">Spravujte a riešte požiadavky zákazníkov</p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SECTION_CONFIG.filter(s => s.key !== 'all').map(s => (
          <button key={s.key} onClick={() => setActiveSection(prev => prev === s.key ? 'all' : s.key)}
            className={`rounded-xl border p-3 text-center transition-all ${activeSection === s.key ? 'border-primary bg-accent shadow-sm' : 'bg-card hover:bg-secondary'}`}>
            <div className="text-xl font-bold font-heading">{sectionCounts[s.key]}</div>
            <div className="text-[11px] leading-tight text-muted-foreground">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Search + filter toggle */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Hľadať podľa ID tiketu, emailu, objednávky alebo produktu..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <Button variant={showFilters ? 'default' : 'outline'} size="sm" className="gap-1.5"
          onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filtre</span>
          {hasActiveFilters && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">!</span>}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-6 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold font-heading">Filtre</span>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" /> Vymazať všetko
              </button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Stav</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.map(s => (
                  <button key={s} onClick={() => setStatusFilter(f => f === s ? 'all' : s)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${statusFilter === s ? 'border-primary bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Typ požiadavky</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_REQUEST_TYPES.map(rt => (
                  <button key={rt} onClick={() => setTypeFilter(f => f === rt ? 'all' : rt)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${typeFilter === rt ? 'border-primary bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                    {REQUEST_TYPE_LABELS[rt]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Obdobie</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {DATE_PRESETS.map(p => (
                  <button key={p.label} onClick={() => { setDateFrom(subDays(new Date(), p.days)); setDateTo(new Date()); }}
                    className="rounded-full border bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground hover:bg-muted transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs flex-1">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {dateFrom ? format(dateFrom, 'd. MMM', { locale: sk }) : 'Od'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs flex-1">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {dateTo ? format(dateTo, 'd. MMM', { locale: sk }) : 'Do'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section tabs */}
      <Tabs value={activeSection} onValueChange={v => setActiveSection(v as Section)} className="mb-4">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-transparent p-0">
          {SECTION_CONFIG.map(s => (
            <TabsTrigger key={s.key} value={s.key} className="rounded-lg border bg-card data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-3 py-1.5">
              {s.label} ({sectionCounts[s.key]})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Ticket list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border bg-card py-16 text-center text-muted-foreground">Žiadne tikety neboli nájdené.</div>
        )}
        {filtered.map(ticket => {
          const isExpanded = expandedId === ticket.id;
          const nextStatuses = STATUS_FLOW[ticket.status];
          const workflowLabel = getWorkflowLabel(ticket);
          const workflowKey = getWorkflowStatusKey(ticket);
          const workflowNextStatuses = getNextStatuses(ticket);
          const WorkflowIcon = getWorkflowIcon(ticket.requestType);

          return (
            <div key={ticket.id} className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
              <button onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                className="flex w-full items-center gap-4 p-4 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-sm font-bold">{ticket.id}</span>
                    <StatusBadge status={ticket.status} />
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                      {REQUEST_TYPE_LABELS[ticket.requestType]}
                    </span>
                    {workflowKey && workflowLabel && (
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${WORKFLOW_STATUS_COLORS[workflowKey] || 'bg-secondary text-secondary-foreground'}`}>
                        {workflowLabel}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{ticket.product} — {ticket.description}</p>
                </div>
                <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: sk })}
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="border-t bg-secondary/30 p-4 space-y-4">
                  {/* Key info grid */}
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-lg border bg-card p-3 space-y-1">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Typ požiadavky</span>
                      <div className="flex items-center gap-2">
                        <WorkflowIcon className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{REQUEST_TYPE_LABELS[ticket.requestType]}</span>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-card p-3 space-y-1">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Aktuálny stav</span>
                      <div className="flex items-center gap-2">
                        {workflowKey && workflowLabel ? (
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${WORKFLOW_STATUS_COLORS[workflowKey] || 'bg-secondary text-secondary-foreground'}`}>
                            {workflowLabel}
                          </span>
                        ) : (
                          <StatusBadge status={ticket.status} />
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-card p-3 space-y-1">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Produkty</span>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{ticket.product}</span>
                      </div>
                    </div>
                    {ticket.requestType === 'complaint' && ticket.issueType && (ticket.issueType as string) in COMPLAINT_TYPE_LABELS ? (
                      <>
                        <div className="rounded-lg border bg-card p-3 space-y-1">
                          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Typ reklamácie</span>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            <span className="font-semibold">{COMPLAINT_TYPE_LABELS[ticket.issueType as ComplaintType]}</span>
                          </div>
                        </div>
                        <div className="rounded-lg border bg-card p-3 space-y-1">
                          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Navrhované riešenie</span>
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              {SUGGESTED_SOLUTION_LABELS[COMPLAINT_TYPE_SUGGESTED_SOLUTION[ticket.issueType as ComplaintType]]}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-lg border bg-card p-3 space-y-1">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Spôsob riešenia</span>
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {ticket.suggestedSolution ? SUGGESTED_SOLUTION_LABELS[ticket.suggestedSolution] : '—'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Extra metadata */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {ticket.customerEmail}</span>
                    <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> {ticket.orderNumber}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: sk })}</span>
                    {ticket.issueType && (
                      <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> {ISSUE_TYPE_LABELS[ticket.issueType]}</span>
                    )}
                    {ticket.severity && (
                      <span className="flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${
                          ticket.severity === 'critical' ? 'bg-destructive' :
                          ticket.severity === 'high' ? 'bg-warning' :
                          ticket.severity === 'medium' ? 'bg-info' : 'bg-success'
                        }`} />
                        {SEVERITY_LABELS[ticket.severity]}
                      </span>
                    )}
                    {ticket.refundMethod && (
                      <span className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" /> {REFUND_METHOD_LABELS[ticket.refundMethod]}</span>
                    )}
                    {ticket.iban && (
                      <span className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" /> IBAN: {ticket.iban}</span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="rounded-lg border bg-card p-3 text-sm">{ticket.description}</p>

                  {ticket.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {ticket.attachments.map((src, i) => (
                        <img key={i} src={src} alt="" className="h-16 w-16 rounded-lg border object-cover" />
                      ))}
                    </div>
                  )}

                  {/* Workflow actions */}
                  {workflowNextStatuses.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
                      <WorkflowIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="mr-1 text-xs font-medium text-muted-foreground">Zmeniť stav:</span>
                      {workflowNextStatuses.map(ns => (
                        <button key={ns} onClick={() => handleWorkflowChange(ticket, ns)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${getActionColor(ns)}`}>
                          {getStatusLabel(ticket, ns)}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quick action buttons */}
                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    <span className="mr-1 self-center text-xs text-muted-foreground">Akcie:</span>
                    {nextStatuses.includes('approved') && (
                      <button onClick={() => handleStatusChange(ticket.id, 'approved')}
                        className="rounded-lg bg-success px-4 py-2 text-xs font-semibold text-success-foreground hover:bg-success/90 transition-colors">
                        ✓ Schváliť
                      </button>
                    )}
                    {nextStatuses.includes('rejected') && (
                      <button onClick={() => handleStatusChange(ticket.id, 'rejected')}
                        className="rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors">
                        ✕ Zamietnuť
                      </button>
                    )}
                    {nextStatuses.includes('completed') && (
                      <button onClick={() => handleStatusChange(ticket.id, 'completed')}
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                        ✓ Označiť ako vybavené
                      </button>
                    )}
                    {nextStatuses.includes('in_review') && (
                      <button onClick={() => handleStatusChange(ticket.id, 'in_review')}
                        className="rounded-lg bg-warning px-4 py-2 text-xs font-semibold text-warning-foreground hover:bg-warning/90 transition-colors">
                        Preskúmať
                      </button>
                    )}
                    {nextStatuses.includes('refund_processing') && (
                      <button onClick={() => handleStatusChange(ticket.id, 'refund_processing')}
                        className="rounded-lg border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                        <Banknote className="mr-1.5 inline h-3.5 w-3.5" />Spracovať vrátenie
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Admin;
